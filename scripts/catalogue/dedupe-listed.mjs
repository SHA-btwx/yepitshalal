// Step 5: the same restaurant listed twice.
//
//   node dedupe-listed.mjs            dry run: prints each pair it would merge
//   node dedupe-listed.mjs --apply    merges them
//
// Sources describe one restaurant in more than one way: "Kawan" in the food
// hygiene register and "Kawan" in map data a metre away, or "Pho Soho" and
// "Pho" at the same Wardour Street address. build-entities only joins records
// it is nearly certain about, so a few of these reach search as two listings.
//
// Two listed places are the same restaurant only when all of these hold:
//   - they are within 40 m of each other
//   - they share a website or a phone number
//   - their street numbers do not disagree
//   - their names agree: near-identical, one inside the other, or both clearly
//     named after the shared website; or they share the website AND the phone
//     at the same street number, whatever they are called
// The better-documented one is kept; the other gets merged_into, which hides
// it from search and keeps the row. Nothing is deleted.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  cellKey, hostMatchesName, metersBetween, nameSimilarity, neighbourKeys, normaliseName, phoneKey, websiteHost,
} from './lib.mjs';

const APPLY = process.argv.includes('--apply');

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
    .eq('is_listed', true)
    .range(from, from + 999);
  if (error) throw new Error(error.message);
  rows.push(...data);
  if (data.length < 1000) break;
}

const POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi;
const numbersOf = (address) => new Set(String(address || '').replace(POSTCODE_RE, ' ').match(/\b\d+/g) || []);
const phonesOf = (raw) => new Set(String(raw || '').split(/[;,/]/).map(phoneKey).filter(Boolean));

const grid = new Map();
for (const r of rows) {
  r.host = websiteHost(r.website_url);
  r.phones = phonesOf(r.phone);
  r.norm = normaliseName(r.name);
  const k = cellKey(r.lat, r.lng);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(r);
}

function sameRestaurant(a, b) {
  if (metersBetween(a.lat, a.lng, b.lat, b.lng) > 40) return false;
  const sharedHost = a.host && a.host === b.host;
  const sharedPhone = [...a.phones].some((p) => b.phones.has(p));
  if (!sharedHost && !sharedPhone) return false;
  const na = numbersOf(a.address);
  const nb = numbersOf(b.address);
  if (na.size && nb.size && ![...na].some((n) => nb.has(n))) return false;
  // Same street number, same website and same phone: one business under two
  // names ("AQ Bar and Restaurant" and "African Queen").
  if (sharedHost && sharedPhone && na.size && nb.size) return true;
  if (!a.norm || !b.norm) return false;
  if (nameSimilarity(a.norm, b.norm) >= 0.85) return true;
  const [short, long] = a.norm.length <= b.norm.length ? [a.norm, b.norm] : [b.norm, a.norm];
  if (short.length >= 3 && (long.startsWith(`${short} `) || long.endsWith(` ${short}`))) return true;
  return Boolean(sharedHost && hostMatchesName(a.host, [a.name]) && hostMatchesName(b.host, [b.name]) && nameSimilarity(a.norm, b.norm) >= 0.5);
}

// Better documented first: stronger evidence, a real street address, an FSA
// registration, then the older row.
const STRENGTH = { strong: 0, moderate: 1, weak: 2 };
const rank = (r) => [
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
for (const a of rows) {
  for (const b of neighbourKeys(a.lat, a.lng).flatMap((k) => grid.get(k) || [])) {
    if (a.id >= b.id || !sameRestaurant(a, b)) continue;
    const ra = byId.get(find(a.id));
    const rb = byId.get(find(b.id));
    if (ra.id === rb.id) continue;
    const [keeper, loser] = compare(ra, rb) <= 0 ? [ra, rb] : [rb, ra];
    mergedInto.set(loser.id, keeper.id);
    pairs.push([loser, keeper]);
  }
}

console.log(`listed: ${rows.length}, duplicates: ${pairs.length}`);
for (const [l, k] of pairs) {
  console.log(`  ${l.name}, ${l.address} [${l.halal_evidence_strength}]\n    -> ${k.name}, ${k.address} [${k.halal_evidence_strength}]`);
}

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to merge.');
  process.exit(0);
}
for (const [loser] of pairs) {
  const { error } = await sb.from('restaurants').update({ merged_into: find(loser.id) }).eq('id', loser.id);
  if (error) throw new Error(`merge ${loser.id}: ${error.message}`);
}
console.log(`merged: ${pairs.length}`);
