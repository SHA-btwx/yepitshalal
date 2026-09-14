// Step 4: bring the catalogue and its evidence into the database.
//
//   node import-catalogue.mjs            dry run: prints the plan, writes nothing
//   node import-catalogue.mjs --apply    writes it
//
// What it does, in order:
//   1. Matches every existing listing to a place from build-entities, by its
//      FSA registration number, or failing that by name within 80 m.
//   2. Existing listings that no longer appear anywhere (their FSA registration
//      is gone and nothing else matches) are marked needs_review: not deleted,
//      and not shown as open, because we could not confirm they still trade.
//   3. Two existing listings that turn out to be the same place (near-identical
//      name, same spot) are merged into the better-documented one, keeping
//      both rows.
//   4. Places with evidence and no existing listing become new listings.
//   5. Pipeline evidence is replaced wholesale for every place it covers, so
//      re-running is safe. Evidence added by admins or submissions is never
//      touched. The database derives each label from the evidence.
//   6. Opening hours come from OpenStreetMap only where they parse cleanly.
//
// Nothing here writes a halal classification directly.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  cachePath, cellKey, metersBetween, nameSimilarity, neighbourKeys, normaliseName, splitTradingNames,
  parseOsmOpeningHours, readJsonl,
} from './lib.mjs';

const APPLY = process.argv.includes('--apply');
const NOW = new Date().toISOString();

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const log = (...a) => console.log(...a);

// --- Inputs ---------------------------------------------------------------------------
const entities = readJsonl(cachePath('entities.jsonl'));
const entityByKey = new Map(entities.map((e) => [e.key, e]));
const evidenceByKey = new Map(readJsonl(cachePath('evidence.jsonl')).map((r) => [r.key, r.evidence]));

const currentFsaIds = new Set();
for (const file of readdirSync(cachePath('fsa/'))) {
  if (!file.endsWith('.json')) continue;
  for (const e of JSON.parse(readFileSync(cachePath(`fsa/${file}`), 'utf8')).FHRSEstablishment.EstablishmentCollection) {
    currentFsaIds.add(String(e.FHRSID));
  }
}

async function fetchAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const existing = await fetchAll(
  'restaurants_with_coords',
  'id, slug, name, address, source_reference_id, data_source, brand_id, branch_label, catalogue_status, merged_into, lat, lng, postcode, phone, website_url, socials, borough, created_at'
);
const cuisines = await fetchAll('cuisines', 'id, name');
log(`existing listings: ${existing.length}, entities: ${entities.length}, places with evidence: ${evidenceByKey.size}`);

// --- 1. Match existing listings to places ---------------------------------------------------
const entitiesByFsa = new Map();
const grid = new Map();
for (const e of entities) {
  for (const f of e.sources.fsa) entitiesByFsa.set(f.id, [...(entitiesByFsa.get(f.id) || []), e]);
  const k = cellKey(e.lat, e.lng);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(e);
}

const matchOf = new Map(); // existing id -> entity key
const unmatched = [];
for (const r of existing) {
  if (r.merged_into) continue;
  const nr = normaliseName(r.name);
  let best = null;
  // Ties go to the nearer place: a listing created by an earlier import sits
  // exactly on the place it came from, even when a twin record shares its name.
  const better = (cand, cur) => !cur || cand.sim > cur.sim || (cand.sim === cur.sim && cand.d < cur.d);
  for (const e of entitiesByFsa.get(String(r.source_reference_id)) || []) {
    const sim = Math.max(...[e.name, ...e.sources.fsa.map((f) => f.name)].map((n) => nameSimilarity(nr, normaliseName(n))));
    const cand = { e, sim, d: metersBetween(r.lat, r.lng, e.lat, e.lng) };
    if (better(cand, best)) best = cand;
  }
  if (!best) {
    for (const e of neighbourKeys(r.lat, r.lng).flatMap((k) => grid.get(k) || [])) {
      const d = metersBetween(r.lat, r.lng, e.lat, e.lng);
      if (d > 80) continue;
      // A name with no Latin letters normalises to nothing ("面对面"): match it
      // on the exact name at the same spot instead.
      const sim = nr ? nameSimilarity(nr, normaliseName(e.name)) : r.name.trim() === String(e.name).trim() && d <= 10 ? 1 : 0;
      if (sim >= 0.8 && better({ e, sim, d }, best)) best = { e, sim, d };
    }
  }
  if (best) matchOf.set(r.id, best.e.key);
  else unmatched.push(r);
}

// --- 2. Duplicates among existing listings ---------------------------------------------------------
// A place can carry more than one FSA registration: a business that re-registered,
// but also a new business in the same unit or the shop next door. So two
// listings that land on the same place are only merged when their names are
// near-identical and they sit at the same spot. The rest are not the place the
// evidence describes: only the listing whose name matches the place keeps it,
// and the others are left alone, with nothing borrowed from their neighbour.
const POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi;
const addressNumbers = (address) => new Set(String(address || '').replace(POSTCODE_RE, ' ').match(/\b\d+/g) || []);

function samePlace(a, b) {
  if (metersBetween(a.lat, a.lng, b.lat, b.lng) > 60) return false;
  // "20 Loampit Hill" and "16 Loampit Hill" are two shops, whatever they are called.
  const na = addressNumbers(a.address);
  const nb = addressNumbers(b.address);
  if (na.size && nb.size && ![...na].some((n) => nb.has(n))) return false;
  const x = normaliseName(a.name);
  const y = normaliseName(b.name);
  if (x === y) return true;
  // One name inside the other ("Kebabish", "Plumstead Kebabish") only counts at
  // the same postcode: on its own it would join "Chicken and Co" to "Perfect
  // Fried Chicken".
  if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return Boolean(a.postcode) && a.postcode === b.postcode;
  return nameSimilarity(x, y) >= 0.85;
}

const byEntity = new Map();
for (const [id, key] of matchOf) byEntity.set(key, [...(byEntity.get(key) || []), existing.find((r) => r.id === id)]);
const merges = []; // [loser id, keeper id]
const keeperOf = new Map();
for (const [key, all] of byEntity) {
  const placeName = normaliseName(entityByKey.get(key).name);
  const anchor = all
    .map((r) => ({ r, sim: nameSimilarity(normaliseName(r.name), placeName) }))
    .sort((a, b) => b.sim - a.sim)[0].r;
  const rows = all.filter((r) => r === anchor || samePlace(r, anchor));
  for (const r of all) {
    if (rows.includes(r)) continue;
    matchOf.delete(r.id);
    unmatched.push(r);
  }
  const ranked = rows.sort(
    (a, b) =>
      Number(Boolean(b.brand_id)) - Number(Boolean(a.brand_id)) ||
      Number(Boolean(b.branch_label)) - Number(Boolean(a.branch_label)) ||
      a.created_at.localeCompare(b.created_at)
  );
  keeperOf.set(key, ranked[0]);
  for (const loser of ranked.slice(1)) merges.push([loser.id, ranked[0].id]);
}

// --- 3. Existing listings we could not confirm are still trading -----------------------------
const stillRegistered = unmatched.filter((r) => currentFsaIds.has(String(r.source_reference_id)));
const unconfirmed = unmatched.filter((r) => !currentFsaIds.has(String(r.source_reference_id)) && r.data_source !== 'owner_submitted');

// --- 4. New listings ------------------------------------------------------------------------------
const CUISINE_MAP = [
  [/pakistani/, 'Pakistani'], [/bangladeshi|bengali/, 'Bangladeshi'], [/indo_chinese|indo-chinese/, 'Indo-Chinese'],
  [/indian|punjabi|gujarati|south_indian/, 'Indian'], [/turkish/, 'Turkish'], [/lebanese/, 'Lebanese'],
  [/persian|iranian/, 'Persian'], [/afghan/, 'Afghan'], [/moroccan/, 'Moroccan'],
  [/syrian|iraqi|yemeni|egyptian|palestinian|jordanian|saudi|arab|middle_eastern|kurdish/, 'Middle Eastern'],
  [/somali|ethiopian|eritrean|nigerian|ghanaian|senegalese|african/, 'African'],
  [/caribbean|jamaican/, 'Caribbean'], [/uzbek|central_asian|kazakh|uyghur/, 'Central Asian'],
  [/bosnian|albanian|balkan/, 'Balkan'], [/malaysian|indonesian/, 'Malaysian'], [/chinese/, 'Chinese'],
  [/thai/, 'Thai'], [/japanese|sushi|ramen/, 'Japanese'], [/korean/, 'Korean'],
  [/biryani/, 'Biryani'], [/kebab|doner|shawarma|gyro/, 'Kebab'], [/burger/, 'Burgers'],
  [/chicken|wings|peri/, 'Fried Chicken'], [/pizza/, 'Pizza'], [/steak|grill|barbecue|bbq/, 'Grill'],
  [/italian/, 'Italian'], [/mediterranean|greek/, 'Mediterranean'], [/fish_and_chips|seafood|fish/, 'Fish and Chips'],
  [/dessert|ice_cream|waffle|crepe|creperie|gelato|donut/, 'Desserts'], [/bakery|patisserie|cake|pastry|sweets/, 'Bakery'],
  [/cafe|coffee|tea_room|breakfast|brunch/, 'Cafe'], [/sandwich/, 'Sandwiches'],
];
function cuisineFor(e) {
  const text = [e.cuisine, ...(e.categories || [])].filter(Boolean).join(';').toLowerCase();
  for (const [re, label] of CUISINE_MAP) if (re.test(text)) return label;
  return null;
}

function slugFor(name, postcode) {
  const base = String(name).toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'restaurant';
  const area = postcode ? postcode.split(' ')[0].toLowerCase() : 'london';
  return `${base}-${area}-${Math.random().toString(36).slice(2, 6)}`;
}

// Mirrors refresh_halal_status() so the dry run can say what labels will result.
function predict(evidence) {
  const cur = evidence;
  if (cur.some((e) => e.claim === 'not_halal' && e.strength !== 'weak')) return 'not_listed';
  if (cur.some((e) => e.claim === 'fully_halal' && e.strength === 'strong')) return 'fully_halal';
  if (cur.some((e) => e.claim === 'halal_options' && e.strength !== 'weak')) return 'halal_options';
  return cur.some((e) => e.claim !== 'not_halal') ? 'unverified' : 'not_listed';
}

// One kitchen can trade under several names, registered together as
// "Flavours / Sushi Ovalise / Docklands Grill". A place carrying one of those
// names at the same spot is that listing, not a new one.
const mergeLosers = new Set(merges.map(([loser]) => loser));
const listingGrid = new Map();
for (const r of existing) {
  if (r.merged_into || mergeLosers.has(r.id)) continue;
  const k = cellKey(r.lat, r.lng);
  if (!listingGrid.has(k)) listingGrid.set(k, []);
  listingGrid.get(k).push(r);
}
function listingTradingAs(e) {
  const ne = normaliseName(e.name);
  if (ne.length < 4) return null;
  for (const r of neighbourKeys(e.lat, e.lng).flatMap((k) => listingGrid.get(k) || [])) {
    if (metersBetween(r.lat, r.lng, e.lat, e.lng) > 30) continue;
    const names = splitTradingNames(r.name);
    if (names.length > 1 && names.some((n) => nameSimilarity(normaliseName(n), ne) >= 0.85)) return r;
  }
  return null;
}

const matchedKeys = new Set(matchOf.values());
const attachedTo = new Map(); // entity key -> existing listing row
const newPlaces = [];
for (const [key, evidence] of evidenceByKey) {
  if (matchedKeys.has(key)) continue;
  if (predict(evidence) === 'not_listed') continue;
  const shared = listingTradingAs(entityByKey.get(key));
  if (shared) {
    attachedTo.set(key, shared);
    matchedKeys.add(key);
    continue;
  }
  newPlaces.push(entityByKey.get(key));
}

// --- Plan ------------------------------------------------------------------------------------------
const labels = { fully_halal: 0, halal_options: 0, unverified: 0, not_listed: 0 };
const boroughs = {};
const listedKeys = [];
for (const [key, evidence] of evidenceByKey) {
  const isExisting = matchedKeys.has(key);
  const isNew = newPlaces.some((p) => p.key === key);
  if (!isExisting && !isNew) continue;
  const label = predict(evidence);
  labels[label]++;
  if (label !== 'not_listed') {
    listedKeys.push(key);
    const b = entityByKey.get(key).borough;
    boroughs[b] = (boroughs[b] || 0) + 1;
  }
}
const existingWithoutEvidence = [...matchOf.values()].filter((k) => !evidenceByKey.has(k)).length;

const plan = {
  existing: existing.length,
  existingMatched: matchOf.size,
  existingMatchedWithEvidence: [...new Set(matchOf.values())].filter((k) => evidenceByKey.has(k)).length,
  existingMatchedWithoutEvidence: existingWithoutEvidence,
  existingUnmatchedStillRegistered: stillRegistered.length,
  existingUnconfirmedToNeedsReview: unconfirmed.length,
  duplicateMerges: merges.length,
  newListings: newPlaces.length,
  predictedLabels: labels,
  listedTotal: listedKeys.length,
  boroughs: Object.fromEntries(Object.entries(boroughs).sort((a, b) => b[1] - a[1])),
};
log(JSON.stringify(plan, null, 2));
if (newPlaces.length <= 50) log('new:', newPlaces.map((p) => `${p.name} (${p.postcode ?? p.borough})`).join('; '));
for (const [loser, keeper] of merges.slice(0, 50)) {
  const l = existing.find((r) => r.id === loser);
  const k = existing.find((r) => r.id === keeper);
  log(`merge: ${l.name}, ${l.address}  ->  ${k.name}, ${k.address}`);
}
writeFileSync(cachePath('import-plan.json'), JSON.stringify({ ...plan, unconfirmed: unconfirmed.map((r) => ({ id: r.id, name: r.name, fsa: r.source_reference_id })), merges }, null, 2));

if (!APPLY) {
  log('\nDry run only. Re-run with --apply to write.');
  process.exit(0);
}

// --- Apply -----------------------------------------------------------------------------------------
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
async function must(promise, what) {
  const { error, data } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

// Cuisines we map to but do not have yet.
const cuisineIdByName = new Map(cuisines.map((c) => [c.name.toLowerCase(), c.id]));
const neededCuisines = [...new Set([...evidenceByKey.keys()].map((k) => cuisineFor(entityByKey.get(k))).filter(Boolean))]
  .filter((n) => !cuisineIdByName.has(n.toLowerCase()));
if (neededCuisines.length) {
  const added = await must(sb.from('cuisines').insert(neededCuisines.map((name) => ({ name }))).select('id, name'), 'cuisines');
  for (const c of added) cuisineIdByName.set(c.name.toLowerCase(), c.id);
}

// 2. Unconfirmed listings leave active search, reversibly.
for (const ids of chunk(unconfirmed.map((r) => r.id), 200)) {
  await must(sb.from('restaurants').update({ catalogue_status: 'needs_review', last_checked_at: NOW }).in('id', ids), 'needs_review');
}
log(`marked needs_review: ${unconfirmed.length}`);

// 3. Merges.
for (const [loser, keeper] of merges) {
  await must(sb.from('restaurants').update({ merged_into: keeper }).eq('id', loser), 'merge');
}
log(`merged duplicates: ${merges.length}`);

// 4. New listings.
const restaurantIdByKey = new Map();
for (const [key, row] of keeperOf) restaurantIdByKey.set(key, row.id);
for (const [key, row] of attachedTo) restaurantIdByKey.set(key, row.id);

for (const batch of chunk(newPlaces, 400)) {
  const rows = batch.map((e) => {
    const postcode = e.postcode || null;
    const address = e.address
      ? postcode && !e.address.toUpperCase().includes(postcode) ? `${e.address}, ${postcode}` : e.address
      : postcode ? `${postcode} (street address not known)` : `${e.borough} (street address not known)`;
    const credits = [
      e.sources.fsa.length && 'Food Standards Agency (OGL)',
      e.sources.osm && 'OpenStreetMap contributors (ODbL)',
      e.sources.overture.length && 'Overture Maps Foundation',
    ].filter(Boolean).join('; ');
    return {
      name: e.name,
      slug: slugFor(e.name, postcode),
      address,
      postcode,
      borough: e.borough,
      phone: e.phone,
      website_url: e.website,
      socials: e.socials?.length ? e.socials.slice(0, 5) : null,
      cuisine_label: cuisineFor(e),
      location: `SRID=4326;POINT(${e.lng} ${e.lat})`,
      data_source: 'open_data_import',
      source_reference_id: e.sources.fsa[0]?.id ?? null,
      source_attribution_text: credits,
      catalogue_status: 'active',
      halal_classification: 'unverified',
      last_checked_at: NOW,
    };
  });
  const inserted = await must(sb.from('restaurants').insert(rows).select('id, slug'), 'insert restaurants');
  inserted.forEach((r, i) => restaurantIdByKey.set(batch[i].key, r.id));
}
log(`inserted new listings: ${newPlaces.length}`);

// Existing listings: fill gaps only, never overwrite.
for (const [key, row] of keeperOf) {
  const e = entityByKey.get(key);
  const patch = { borough: e.borough, last_checked_at: NOW };
  if (!row.phone && e.phone) patch.phone = e.phone;
  if (!row.website_url && e.website) patch.website_url = e.website;
  if ((!row.socials || !row.socials.length) && e.socials?.length) patch.socials = e.socials.slice(0, 5);
  const c = cuisineFor(e);
  if (c) patch.cuisine_label = c;
  if (row.catalogue_status === 'needs_review') patch.catalogue_status = 'active';
  await must(sb.from('restaurants').update(patch).eq('id', row.id), 'update existing');
}
log(`updated existing listings: ${keeperOf.size}`);

// Source links.
const links = [];
for (const [key, rid] of restaurantIdByKey) {
  const e = entityByKey.get(key);
  for (const f of e.sources.fsa) links.push({ restaurant_id: rid, source: 'fsa', source_id: f.id, source_name: f.name, licence: 'OGL-UK-3.0', last_seen_at: NOW });
  for (const o of e.sources.overture) links.push({ restaurant_id: rid, source: 'overture', source_id: o.id, source_name: o.name, licence: (o.licences || []).join(', ').slice(0, 200), last_seen_at: NOW });
  if (e.sources.osm) links.push({ restaurant_id: rid, source: 'osm', source_id: e.sources.osm.id, source_name: e.sources.osm.name, licence: 'ODbL-1.0', last_seen_at: NOW });
}
for (const batch of chunk(links, 1000)) {
  await must(sb.from('restaurant_source_links').upsert(batch, { onConflict: 'source,source_id,restaurant_id' }), 'source links');
}
log(`source links: ${links.length}`);

// 5. Evidence, replaced for every place the pipeline covers.
const covered = [...restaurantIdByKey.values()];
for (const ids of chunk(covered, 200)) {
  await must(sb.from('restaurant_halal_evidence').delete().in('restaurant_id', ids).eq('checked_by', 'catalogue_pipeline'), 'clear evidence');
}
const evidenceRows = [];
for (const [key, rid] of restaurantIdByKey) {
  for (const ev of evidenceByKey.get(key) || []) {
    evidenceRows.push({
      restaurant_id: rid,
      kind: ev.kind,
      claim: ev.claim,
      strength: ev.strength,
      source_name: ev.source_name,
      source_url: ev.source_url ?? null,
      excerpt: ev.excerpt ? String(ev.excerpt).slice(0, 300) : null,
      notes: ev.notes ?? null,
      checked_at: ev.checked_at || NOW,
      checked_by: 'catalogue_pipeline',
    });
  }
}
for (const batch of chunk(evidenceRows, 250)) {
  await must(sb.from('restaurant_halal_evidence').insert(batch), 'evidence');
}
log(`evidence rows: ${evidenceRows.length}`);

// Cuisine links.
const cuisineLinks = [];
for (const [key, rid] of restaurantIdByKey) {
  const c = cuisineFor(entityByKey.get(key));
  if (c && cuisineIdByName.has(c.toLowerCase())) cuisineLinks.push({ restaurant_id: rid, cuisine_id: cuisineIdByName.get(c.toLowerCase()) });
}
for (const batch of chunk(cuisineLinks, 1000)) {
  await must(sb.from('restaurant_cuisines').upsert(batch, { onConflict: 'restaurant_id,cuisine_id', ignoreDuplicates: true }), 'cuisine links');
}
log(`cuisine links: ${cuisineLinks.length}`);

// 6. Opening hours from OpenStreetMap.
let hoursPlaces = 0;
const hourRows = [];
for (const [key, rid] of restaurantIdByKey) {
  const parsed = parseOsmOpeningHours(entityByKey.get(key).openingHours);
  if (!parsed) continue;
  hoursPlaces++;
  for (const h of parsed) hourRows.push({ restaurant_id: rid, ...h, is_closed: false, source: 'osm', checked_at: NOW });
}
for (const ids of chunk(covered, 200)) {
  await must(sb.from('opening_hours').delete().in('restaurant_id', ids).eq('source', 'osm'), 'clear hours');
}
for (const batch of chunk(hourRows, 1000)) {
  await must(sb.from('opening_hours').insert(batch), 'hours');
}
log(`opening hours: ${hoursPlaces} places, ${hourRows.length} rows`);
log('done');
