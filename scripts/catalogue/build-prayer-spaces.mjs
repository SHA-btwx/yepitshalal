// Mosques and prayer rooms across London, from OpenStreetMap.
//
//   node build-prayer-spaces.mjs           print the plan
//   node build-prayer-spaces.mjs --apply   write it
//   FETCH=1 node build-prayer-spaces.mjs   refetch from Overpass first
//
// A separate thing from the restaurant catalogue on purpose. It answers a
// different question, "where can I pray", and nothing in it may ever touch a
// halal label. The two only meet on a restaurant page, where the nearest one is
// shown as a walk.
//
// Source: OpenStreetMap via the Overpass API, ODbL, credited on the site the
// same way the restaurant data is. Overpass is a volunteer service with a fair
// use policy, so the response is cached in .cache/osm_prayer_spaces.json and
// only refetched when you ask for it.
//
// We record what OSM says and no opinion of our own. A facility we have not
// been told about is null, which the site shows as "we don't know", never "no".

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { cachePath, boroughAt, metersBetween, normaliseName } from './lib.mjs';

const APPLY = process.argv.includes('--apply');
const FETCH = process.env.FETCH === '1';
const CACHE = cachePath('osm_prayer_spaces.json');
const BBOX = '51.24,-0.55,51.72,0.36';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function fetchOverpass() {
  const query = `[out:json][timeout:240];
(
  nwr["amenity"="place_of_worship"]["religion"="muslim"](${BBOX});
  nwr["building"="mosque"](${BBOX});
  nwr["amenity"="prayer_room"](${BBOX});
  nwr["name"~"mosque|masjid|musalla|islamic cent",i](${BBOX});
);
out center tags;`;
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    const res = await fetch(host, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'YepItsHalalBot/1.0 (+https://yepitshalal.com; prayer spaces)',
      },
      signal: AbortSignal.timeout(400000),
    }).catch(() => null);
    if (res?.status === 200) {
      const json = await res.json();
      writeFileSync(CACHE, JSON.stringify(json));
      return json;
    }
    console.log(`${host.split('/')[2]} answered ${res?.status ?? 'nothing'}`);
  }
  throw new Error('Overpass would not answer. Try again later.');
}

if (FETCH || !existsSync(CACHE)) await fetchOverpass();
const raw = JSON.parse(readFileSync(CACHE, 'utf8'));

// --- what counts as a prayer space ----------------------------------------

/** A name alone is not enough: "Masjid Kebab House" is a takeaway. */
const NOT_A_PRAYER_SPACE = /\b(kebab|restaurant|takeaway|cafe|café|grill|chicken|pizza|supermarket|store|butcher|barber|travel|school|academy|college|funeral|solicitor|pharmacy)\b/i;

const slugged = new Set();
function makeSlug(name, id) {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\x00-\x7f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'prayer-space';
  let slug = base;
  let n = 2;
  while (slugged.has(slug)) slug = `${base}-${n++}`;
  slugged.add(slug);
  return slug;
}

const triBool = (v) => (v === undefined ? null : /^(yes|designated|limited)$/i.test(v) ? true : /^no$/i.test(v) ? false : null);

const spaces = [];
for (const el of raw.elements ?? []) {
  const tags = el.tags ?? {};
  const name = (tags.name || '').trim();
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!name || lat === undefined || lng === undefined) continue;

  const muslim =
    tags.religion === 'muslim' ||
    tags.building === 'mosque' ||
    /mosque|masjid|musalla|islamic cent/i.test(name);
  if (!muslim) continue;
  // A prayer room with no religion tag could be anyone's; only take the ones
  // whose name or tags say muslim.
  if (tags.amenity === 'prayer_room' && tags.religion && tags.religion !== 'muslim') continue;
  if (NOT_A_PRAYER_SPACE.test(name) && tags.religion !== 'muslim' && tags.building !== 'mosque') continue;

  // "33 Brookes Court London" read as a typo. Number and street run
  // together; the town is comma'd on, and dropped when it is just London,
  // because the borough is already shown beside it.
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ').trim();
  const town = /^london$/i.test(tags['addr:city'] || '') ? null : (tags['addr:city'] || null);
  const address = [street, town].filter(Boolean).join(', ') || null;

  spaces.push({
    name,
    slug: makeSlug(name),
    address,
    postcode: tags['addr:postcode'] || null,
    borough: boroughAt(lat, lng),
    lat,
    lng,
    kind: tags.amenity === 'prayer_room' ? 'prayer room' : 'mosque',
    website_url: tags.website || tags['contact:website'] || null,
    phone: tags.phone || tags['contact:phone'] || null,
    // Raw OSM strings, never parsed into an open/closed state: a wrong
    // 'open now' at maghrib is worse than no answer.
    opening_hours: tags.opening_hours || null,
    service_times: tags.service_times || tags['service_times:muslim'] || null,
    has_womens_area: triBool(tags['female'] ?? tags['prayer_room:female'] ?? tags['women']),
    wheelchair: triBool(tags.wheelchair),
    source: 'osm',
    source_id: `${el.type}/${el.id}`,
  });
}

// OSM often holds the same mosque as a node and as a building way. Same name
// within 120 m is one place.
const kept = [];
for (const s of spaces) {
  const twin = kept.find((k) => normaliseName(k.name) === normaliseName(s.name) && metersBetween(k.lat, k.lng, s.lat, s.lng) < 120);
  if (twin) {
    // Prefer the record that carries more detail.
    const score = (x) => [x.address, x.postcode, x.website_url, x.phone, x.opening_hours, x.service_times].filter(Boolean).length;
    if (score(s) > score(twin)) Object.assign(twin, s);
    continue;
  }
  kept.push(s);
}

const inLondon = kept.filter((s) => s.borough);
console.log(
  `${raw.elements?.length ?? 0} from OpenStreetMap, ${spaces.length} are prayer spaces, ` +
    `${kept.length} after merging duplicates, ${inLondon.length} inside a London borough`
);
const byBorough = {};
for (const s of inLondon) byBorough[s.borough] = (byBorough[s.borough] || 0) + 1;
console.log(
  Object.entries(byBorough)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([b, n]) => `${b} ${n}`)
    .join(', ')
);
console.log(`${inLondon.filter((s) => s.kind === 'prayer room').length} are prayer rooms rather than mosques`);

if (!APPLY) {
  console.log('\nNothing was written. Re-run with --apply.');
  process.exit(0);
}

let written = 0;
for (let i = 0; i < inLondon.length; i += 100) {
  const batch = inLondon.slice(i, i + 100).map((s) => ({
    name: s.name,
    slug: s.slug,
    address: s.address,
    postcode: s.postcode,
    borough: s.borough,
    location: `SRID=4326;POINT(${s.lng} ${s.lat})`,
    kind: s.kind,
    website_url: s.website_url,
    phone: s.phone,
    opening_hours: s.opening_hours,
    service_times: s.service_times,
    has_womens_area: s.has_womens_area,
    wheelchair: s.wheelchair,
    source: s.source,
    source_id: s.source_id,
    last_seen_at: new Date().toISOString(),
  }));
  const { error } = await sb.from('prayer_spaces').upsert(batch, { onConflict: 'source,source_id' });
  if (error) {
    console.error('batch failed:', error.message);
    break;
  }
  written += batch.length;
}
console.log(`wrote ${written} prayer spaces`);
