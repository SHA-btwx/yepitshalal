// Step 1: turn three independent source datasets into one list of places.
//
//   FSA food hygiene register (Open Government Licence)
//     The authority on whether a food business is currently registered, and
//     where. Every London borough, all 81,508 establishments.
//   Overture Maps places (CDLA-Permissive-2.0 / Apache-2.0 / CC0 per record)
//     Websites, phone numbers, social links and categories.
//   OpenStreetMap (ODbL)
//     Community tags, including diet:halal, opening hours and cuisine.
//
// None of these says a place is halal on its own authority. This step only
// establishes that a place exists and where; halal evidence comes later.
//
// Matching rules, in order, so duplicates merge but neighbours do not:
//   1. Overture records merge with each other only when they are almost
//      certainly the same place (within 40 m and near-identical names, or
//      within 60 m sharing a phone number or website).
//   2. Each OSM record attaches to at most one entity: the best name match
//      within 60 m, or a shared phone/website within 150 m.
//   3. FSA records attach last. A registration can support several entities
//      (one kitchen, several trading names) but never joins two entities
//      together, which is how "Pizza X / Kebab Y" stayed two restaurants.
//
// Run: node build-entities.mjs

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { DuckDBInstance } from '@duckdb/node-api';
import {
  boroughAt, cachePath, cellKey, metersBetween, nameSimilarity, neighbourKeys,
  normaliseName, phoneKey, splitTradingNames, websiteHost, websiteUrl,
} from './lib.mjs';

const t0 = Date.now();
const log = (...a) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s]`, ...a);

// Places where someone goes to eat or pick up food. Pubs and bars stay in: some
// serve halal food, and whether they do is for evidence to decide, not for an
// assumption about what kind of place is allowed to.
const EATING = /restaurant|fast_food|food_court|food_truck|food_stand|street_food|cafe|coffee|tea_room|bakery|patisserie|dessert|ice_cream|donut|bagel|sandwich|juice|smoothie|takeaway|kebab|shawarma|falafel|burger|pizza|chicken|grill|steakhouse|diner|bistro|brasserie|buffet|noodle|sushi|dim_sum|canteen|caterer|catering|creperie|waffle|pub|bar\b|gastropub|halal|eat_and_drink|breakfast|brunch|soul_food|barbecue|bbq|shisha|hookah/i;
const NOT_EATING = /grocery|supermarket|convenience|liquor|butcher|wholesale|martial_arts|active_life|bar_supply|food_bank|pet_|vending|beauty|barber/i;

const FSA_EATING_TYPES = new Set([1, 7844, 7846, 7841, 7843]);

// --- Load FSA ------------------------------------------------------------------
const fsa = [];
for (const file of readdirSync(cachePath('fsa/'))) {
  if (!file.endsWith('.json')) continue;
  const doc = JSON.parse(readFileSync(cachePath(`fsa/${file}`), 'utf8'));
  for (const e of doc.FHRSEstablishment.EstablishmentCollection) {
    if (!FSA_EATING_TYPES.has(e.BusinessTypeID)) continue;
    const lat = Number(e.Geocode?.Latitude);
    const lng = Number(e.Geocode?.Longitude);
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0;
    const names = splitTradingNames(e.BusinessName);
    fsa.push({
      src: 'fsa',
      id: String(e.FHRSID),
      rawName: e.BusinessName,
      names,
      nnames: names.map(normaliseName).filter(Boolean),
      lat: hasGeo ? lat : null,
      lng: hasGeo ? lng : null,
      postcode: e.PostCode?.trim().toUpperCase() || null,
      address: [e.AddressLine1, e.AddressLine2, e.AddressLine3, e.AddressLine4].filter(Boolean).join(', ') || null,
      authority: e.LocalAuthorityName,
      businessType: e.BusinessType,
      ratingDate: e.RatingDate || null,
    });
  }
}
log('FSA eating establishments:', fsa.length, 'with coordinates:', fsa.filter((r) => r.lat).length);

// --- Load Overture -------------------------------------------------------------
const db = await DuckDBInstance.create(':memory:');
const conn = await db.connect();
const overtureRows = (
  await conn.runAndReadAll(`SELECT * FROM '${cachePath('overture_london_food.parquet').pathname.replace(/^\/([A-Za-z]:)/, '$1')}'`)
).getRowObjects();

const overture = [];
for (const r of overtureRows) {
  const cats = [r.category, ...((r.category_alternates?.items ?? r.category_alternates) || [])].filter(Boolean).map(String);
  const catText = cats.join(' ');
  if (!EATING.test(catText) || (NOT_EATING.test(String(r.category || '')) && !/restaurant|cafe|halal/i.test(catText))) continue;
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  const borough = boroughAt(lat, lng);
  if (!borough) continue;
  const list = (v) => ((v?.items ?? v) || []).map(String);
  overture.push({
    src: 'overture',
    id: String(r.id),
    name: r.name ? String(r.name) : null,
    nname: normaliseName(r.name),
    lat, lng, borough,
    postcode: r.postcode ? String(r.postcode).trim().toUpperCase() : null,
    address: r.address ? String(r.address) : null,
    phones: list(r.phones),
    websites: list(r.websites),
    socials: list(r.socials),
    categories: cats,
    halalCategory: cats.some((c) => /halal/i.test(c)),
    confidence: Number(r.confidence),
    brand: r.brand ? String(r.brand) : null,
    licences: list(r.source_licences),
  });
}
log('Overture eating places inside Greater London:', overture.length);

// --- Load OSM ------------------------------------------------------------------
const osmById = new Map();
for (const file of ['osm_all_food.json', 'osm_halal.json']) {
  for (const el of JSON.parse(readFileSync(cachePath(file), 'utf8')).elements) {
    const tags = el.tags || {};
    if (!tags.name) continue;
    const amenity = tags.amenity || tags.shop || '';
    if (!/restaurant|fast_food|cafe|food_court|pub|bar|ice_cream|bakery|pastry|confectionery|deli/.test(amenity)) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const borough = boroughAt(lat, lng);
    if (!borough) continue;
    const id = `${el.type[0]}${el.id}`;
    osmById.set(id, {
      src: 'osm',
      id,
      name: tags.name,
      nname: normaliseName(tags.name),
      lat, lng, borough,
      amenity,
      postcode: tags['addr:postcode']?.toUpperCase() || null,
      address: [tags['addr:housenumber'] && tags['addr:street'] ? `${tags['addr:housenumber']} ${tags['addr:street']}` : tags['addr:street']].filter(Boolean).join(', ') || null,
      phone: tags.phone || tags['contact:phone'] || null,
      website: tags.website || tags['contact:website'] || null,
      cuisine: tags.cuisine || null,
      dietHalal: tags['diet:halal'] || null,
      openingHours: tags.opening_hours || null,
      brand: tags.brand || null,
      instagram: tags['contact:instagram'] || null,
      facebook: tags['contact:facebook'] || null,
    });
  }
}
const osm = [...osmById.values()];
log('OSM eating places inside Greater London:', osm.length, 'tagged diet:halal:', osm.filter((o) => o.dietHalal).length);

// --- Entities --------------------------------------------------------------------
const entities = [];
const grid = new Map();
const index = (ent) => {
  const k = cellKey(ent.lat, ent.lng);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(ent);
};
const nearby = (lat, lng) => neighbourKeys(lat, lng).flatMap((k) => grid.get(k) || []);

const hostsOf = (rec) =>
  [...(rec.websites || []), rec.website].map(websiteHost).filter(Boolean);
const phonesOf = (rec) => [...(rec.phones || []), rec.phone].map(phoneKey).filter(Boolean);

// A domain shared by many places (a chain's corporate site) proves nothing about
// which branch is which, so it is never used to join records.
const hostUse = new Map();
for (const r of [...overture, ...osm]) for (const h of new Set(hostsOf(r))) hostUse.set(h, (hostUse.get(h) || 0) + 1);
const distinctiveHost = (h) => (hostUse.get(h) || 0) <= 2;

function newEntity(seed) {
  const ent = {
    key: `${seed.src}:${seed.id}`,
    lat: seed.lat,
    lng: seed.lng,
    names: new Set(),
    nnames: new Set(),
    hosts: new Set(),
    phones: new Set(),
    overture: [],
    osm: null,
    fsa: [],
  };
  entities.push(ent);
  index(ent);
  return ent;
}

function absorb(ent, rec) {
  if (rec.src === 'overture') ent.overture.push(rec);
  else if (rec.src === 'osm') ent.osm = rec;
  const nm = rec.name || rec.names?.[0];
  if (nm) ent.names.add(nm);
  for (const n of rec.nnames || [rec.nname]) if (n) ent.nnames.add(n);
  for (const h of hostsOf(rec)) ent.hosts.add(h);
  for (const p of phonesOf(rec)) ent.phones.add(p);
}

function bestMatch(rec, { radius, minSim, contactRadius, accept }) {
  const recNames = rec.nnames || [rec.nname];
  const recHosts = hostsOf(rec).filter(distinctiveHost);
  const recPhones = phonesOf(rec);
  let best = null;
  for (const ent of nearby(rec.lat, rec.lng)) {
    if (accept && !accept(ent)) continue;
    const d = metersBetween(rec.lat, rec.lng, ent.lat, ent.lng);
    if (d > Math.max(radius, contactRadius)) continue;
    let sim = 0;
    for (const a of recNames) for (const b of ent.nnames) sim = Math.max(sim, nameSimilarity(a, b));
    const sharedContact =
      recHosts.some((h) => ent.hosts.has(h)) || recPhones.some((p) => ent.phones.has(p));
    let score = -1;
    if (d <= radius && sim >= minSim) score = sim - d / 1000;
    else if (d <= contactRadius && sharedContact && sim >= 0.3) score = 0.8 - d / 1000;
    if (score > (best?.score ?? -1)) best = { ent, score, sim, d };
  }
  return best;
}

// 1. Overture seeds, merging only near-certain duplicates.
for (const rec of overture.sort((a, b) => b.confidence - a.confidence)) {
  const m = bestMatch(rec, { radius: 40, minSim: 0.85, contactRadius: 60 });
  if (m) absorb(m.ent, rec);
  else absorb(newEntity(rec), rec);
}
log('entities after Overture:', entities.length);

// 2. OSM, one record per entity at most.
let osmAttached = 0;
for (const rec of osm) {
  const m = bestMatch(rec, { radius: 60, minSim: 0.55, contactRadius: 150, accept: (e) => !e.osm });
  if (m) { absorb(m.ent, rec); osmAttached++; m.ent.lat = rec.lat; m.ent.lng = rec.lng; }
  else absorb(newEntity(rec), rec);
}
log('OSM attached to existing entities:', osmAttached, 'entities now:', entities.length);

// 3. FSA, attaching without bridging.
let fsaAttached = 0;
let fsaNoGeo = 0;
const fsaOnly = new Map();
for (const rec of fsa) {
  if (rec.lat == null) { fsaNoGeo++; continue; }
  if (!boroughAt(rec.lat, rec.lng)) continue;
  // FSA coordinates are often the postcode centroid, so they get more slack.
  const targets = new Set();
  const matchSims = new Map();
  for (const n of rec.nnames) {
    // A near-identical name can sit further out: FSA points are frequently
    // the postcode centroid ("Tayyabs Restaurant" was 90 m+ from Tayyabs).
    const m =
      bestMatch({ ...rec, nnames: [n] }, { radius: 90, minSim: 0.6, contactRadius: 0 }) ||
      bestMatch({ ...rec, nnames: [n] }, { radius: 250, minSim: 0.92, contactRadius: 0 });
    if (m) {
      targets.add(m.ent);
      matchSims.set(m.ent, Math.max(matchSims.get(m.ent) || 0, m.sim));
    }
  }
  if (targets.size) {
    for (const ent of targets) ent.fsa.push({ ...rec, matchSim: matchSims.get(ent) });
    fsaAttached++;
    continue;
  }
  // Unmatched registrations become places of their own, merged only with an
  // identical name at the same postcode (the same business registered twice).
  const dupKey = `${rec.nnames[0]}|${rec.postcode}`;
  const existing = fsaOnly.get(dupKey);
  if (existing) { existing.fsa.push(rec); continue; }
  const ent = newEntity(rec);
  for (const nm of rec.names) ent.names.add(nm);
  for (const n of rec.nnames) ent.nnames.add(n);
  ent.fsa.push({ ...rec, matchSim: 1 });
  fsaOnly.set(dupKey, ent);
}
log('FSA attached:', fsaAttached, 'FSA-only places:', fsaOnly.size, 'FSA without coordinates (skipped):', fsaNoGeo);

// --- Resolve each entity into one record --------------------------------------------
const pick = (...vals) => vals.find((v) => v != null && v !== '') ?? null;

const out = entities.map((ent) => {
  const ov = ent.overture.sort((a, b) => b.confidence - a.confidence)[0];
  const os = ent.osm;
  // An FSA registration only supplies the address when its name clearly is
  // this place. A loose match ("Paul, Paternoster Lodge" to "The Paternoster")
  // still counts as a registration nearby, but must not overwrite a postcode.
  const fs = ent.fsa.filter((r) => (r.matchSim ?? 0) >= 0.8).sort((a, b) => b.matchSim - a.matchSim)[0];
  const website = pick(
    os?.website && websiteUrl(os.website),
    ...(ov?.websites || []).map(websiteUrl),
  );
  const socials = [...new Set([...(ov?.socials || []), os?.instagram, os?.facebook].filter(Boolean))];
  return {
    key: ent.key,
    name: pick(os?.name, ov?.name, fs?.names?.[0], ent.fsa[0]?.names?.[0]),
    lat: ent.lat,
    lng: ent.lng,
    borough: boroughAt(ent.lat, ent.lng),
    postcode: pick(fs?.postcode, os?.postcode, ov?.postcode),
    address: pick(fs?.address, os?.address, ov?.address),
    phone: pick(os?.phone, ov?.phones?.[0]),
    website,
    websiteHost: website ? websiteHost(website) : null,
    socials,
    cuisine: os?.cuisine || null,
    categories: ov?.categories || [],
    openingHours: os?.openingHours || null,
    brand: pick(os?.brand, ov?.brand),
    sources: {
      fsa: ent.fsa.map((r) => ({ id: r.id, name: r.rawName, postcode: r.postcode, type: r.businessType, ratingDate: r.ratingDate, matchSim: r.matchSim })),
      overture: ent.overture.map((r) => ({ id: r.id, name: r.name, confidence: r.confidence, licences: r.licences })),
      osm: os ? { id: os.id, name: os.name, dietHalal: os.dietHalal, amenity: os.amenity } : null,
    },
    // Signals, not verdicts. Each becomes an evidence record later, at the
    // strength it actually has.
    signals: {
      osmDietHalal: os?.dietHalal || null,
      overtureHalalCategory: ent.overture.some((r) => r.halalCategory),
      nameSaysHalal: [...ent.names].some((n) => /\bhalal\b/i.test(n)),
    },
  };
});

writeFileSync(cachePath('entities.jsonl'), out.map((e) => JSON.stringify(e)).join('\n'));

const withSite = out.filter((e) => e.website);
const hosts = new Set(withSite.map((e) => e.websiteHost));
log('entities written:', out.length);
log('with a first-party website:', withSite.length, 'distinct hosts:', hosts.size);
log('with any halal signal:', out.filter((e) => Object.values(e.signals).some(Boolean)).length,
  '| OSM tag:', out.filter((e) => e.signals.osmDietHalal).length,
  '| Overture category:', out.filter((e) => e.signals.overtureHalalCategory).length,
  '| name:', out.filter((e) => e.signals.nameSaysHalal).length);
log('backed by a current FSA registration:', out.filter((e) => e.sources.fsa.length).length);
