// Step 5: the same restaurant listed twice, and pins in the wrong place.
// Runs over everything search can show: places with evidence and places not
// checked yet.
//
//   node dedupe-listed.mjs            dry run: prints what it would change
//   node dedupe-listed.mjs --apply    applies it
//
// Duplicates. Sources describe one restaurant in more than one way: "Kawan" in
// the food hygiene register and "Kawan" in map data a metre away, or the same
// Tortilla branch placed 400 m apart by two datasets. build-entities only joins
// records it is nearly certain about, so a few reach search twice. Two listed
// places are the same restaurant when either holds:
//
//   Close together (within 40 m), sharing a website or phone, street numbers
//   not disagreeing, and names that agree: near-identical, one inside the
//   other, or both clearly named after the shared website. Or, whatever they
//   are called, sharing the website AND the phone at the same street number.
//
//   Same postcode and near-identical name, within 2 km, sharing a phone, a
//   website or a street number. One of the two pins is simply wrong.
//
// The kept listing is the one whose pin agrees with its postcode, then the
// better documented. The other gets merged_into: hidden from search, not deleted.
//
// Misplaced pins. A listed place more than 500 m from the centre of its own
// postcode, or with a postcode outside London, has a location we cannot trust,
// and search, the map and the radius all depend on it. Rather than guess which
// of pin and address is right, it is set to needs_review, which takes it out of
// search until someone checks it.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  cellKey, hostMatchesName, metersBetween, nameSimilarity, neighbourKeys, normaliseName, phoneKey,
  postcodeCentroids, postcodeKey, websiteHost,
} from './lib.mjs';

const APPLY = process.argv.includes('--apply');
const PIN_TOLERANCE_M = 500;

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb
    .from('restaurants_with_coords')
    .select('id, name, address, postcode, website_url, phone, lat, lng, created_at, data_source, source_reference_id, halal_evidence_strength, brand_id, branch_label')
    .eq('is_searchable', true)
    .range(from, from + 999);
  if (error) throw new Error(error.message);
  rows.push(...data);
  if (data.length < 1000) break;
}

const centroids = await postcodeCentroids(rows.map((r) => r.postcode));

const POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi;
const numbersOf = (address) => new Set(String(address || '').replace(POSTCODE_RE, ' ').match(/\b\d+/g) || []);
const phonesOf = (raw) => new Set(String(raw || '').split(/[;,/]/).map(phoneKey).filter(Boolean));

const grid = new Map();
for (const r of rows) {
  r.host = websiteHost(r.website_url);
  r.phones = phonesOf(r.phone);
  r.norm = normaliseName(r.name);
  r.pc = postcodeKey(r.postcode);
  r.numbers = numbersOf(r.address);
  const c = r.pc ? centroids.get(r.pc) : undefined;
  r.pinError = c ? metersBetween(r.lat, r.lng, c.lat, c.lng) : null;
  r.outsideLondon = Boolean(c && c.region !== 'London');
  const k = cellKey(r.lat, r.lng);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(r);
}

const numbersAgree = (a, b) => !a.numbers.size || !b.numbers.size || [...a.numbers].some((n) => b.numbers.has(n));

function closeDuplicate(a, b) {
  if (metersBetween(a.lat, a.lng, b.lat, b.lng) > 40) return false;
  const sharedHost = a.host && a.host === b.host;
  const sharedPhone = [...a.phones].some((p) => b.phones.has(p));
  if (!sharedHost && !sharedPhone) return false;
  if (!numbersAgree(a, b)) return false;
  // Only when the website plausibly belongs to both: shops inside Harrods share
  // Harrods' website and switchboard without being one restaurant.
  if (sharedHost && sharedPhone && a.numbers.size && b.numbers.size && hostMatchesName(a.host, [a.name]) && hostMatchesName(b.host, [b.name])) return true;
  if (!a.norm || !b.norm) return false;
  if (nameSimilarity(a.norm, b.norm) >= 0.85) return true;
  const [short, long] = a.norm.length <= b.norm.length ? [a.norm, b.norm] : [b.norm, a.norm];
  if (short.length >= 3 && (long.startsWith(`${short} `) || long.endsWith(` ${short}`))) return true;
  return Boolean(sharedHost && hostMatchesName(a.host, [a.name]) && hostMatchesName(b.host, [b.name]) && nameSimilarity(a.norm, b.norm) >= 0.5);
}

function samePostcodeDuplicate(a, b) {
  if (!a.pc || a.pc !== b.pc || !a.norm || !b.norm) return false;
  if (metersBetween(a.lat, a.lng, b.lat, b.lng) > 2000) return false;
  if (nameSimilarity(a.norm, b.norm) < 0.85) return false;
  if (!numbersAgree(a, b)) return false;
  const sharedHost = a.host && a.host === b.host;
  const sharedPhone = [...a.phones].some((p) => b.phones.has(p));
  const sharedNumber = a.numbers.size && b.numbers.size;
  return Boolean(sharedHost || sharedPhone || sharedNumber);
}

// Kept first: a pin that agrees with its postcode, stronger evidence, a real
// street address, an FSA registration, a brand, then the older row.
const STRENGTH = { strong: 0, moderate: 1, weak: 2 };
const rank = (r) => [
  r.pinError === null ? 1 : r.pinError <= 200 ? 0 : 2,
  STRENGTH[r.halal_evidence_strength] ?? 3,
  /street address not known/i.test(r.address) ? 1 : 0,
  r.source_reference_id ? 0 : 1,
  r.brand_id ? 0 : 1,
  r.created_at,
];
const compare = (a, b) => {
  const x = rank(a);
  const y = rank(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
};

const mergedInto = new Map();
const find = (id) => (mergedInto.has(id) ? find(mergedInto.get(id)) : id);
const byId = new Map(rows.map((r) => [r.id, r]));
const pairs = [];
function consider(a, b, why) {
  const ra = byId.get(find(a.id));
  const rb = byId.get(find(b.id));
  if (ra.id === rb.id) return;
  const [keeper, loser] = compare(ra, rb) <= 0 ? [ra, rb] : [rb, ra];
  mergedInto.set(loser.id, keeper.id);
  pairs.push([loser, keeper, why]);
}

for (const a of rows) {
  for (const b of neighbourKeys(a.lat, a.lng).flatMap((k) => grid.get(k) || [])) {
    if (a.id < b.id && closeDuplicate(a, b)) consider(a, b, 'same spot');
  }
}
const byPostcode = new Map();
for (const r of rows) if (r.pc) byPostcode.set(r.pc, [...(byPostcode.get(r.pc) || []), r]);
for (const group of byPostcode.values()) {
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (samePostcodeDuplicate(group[i], group[j])) consider(group[i], group[j], 'same postcode');
    }
  }
}

const merged = new Set(pairs.map(([l]) => l.id));
const misplaced = rows.filter((r) => !merged.has(r.id) && (r.outsideLondon || (r.pinError !== null && r.pinError > PIN_TOLERANCE_M)));

console.log(`searchable: ${rows.length}, duplicates: ${pairs.length}, misplaced pins: ${misplaced.length}`);
for (const [l, k, why] of pairs) {
  console.log(`  [${why}] ${l.name}, ${l.address} (pin ${l.pinError ?? '?'} m off)\n    -> ${k.name}, ${k.address} (pin ${k.pinError ?? '?'} m off)`);
}
for (const r of misplaced.sort((a, b) => (b.pinError ?? 0) - (a.pinError ?? 0))) {
  console.log(`  [pin] ${r.name}, ${r.address}: ${r.outsideLondon ? 'postcode outside London' : `${Math.round(r.pinError)} m from its postcode`}`);
}

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply.');
  process.exit(0);
}
for (const [loser] of pairs) {
  const { error } = await sb.from('restaurants').update({ merged_into: find(loser.id) }).eq('id', loser.id);
  if (error) throw new Error(`merge ${loser.id}: ${error.message}`);
}
for (const r of misplaced) {
  const { error } = await sb.from('restaurants').update({ catalogue_status: 'needs_review' }).eq('id', r.id);
  if (error) throw new Error(`needs_review ${r.id}: ${error.message}`);
}
console.log(`merged: ${pairs.length}, sent to review: ${misplaced.length}`);
