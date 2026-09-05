// Stage 0 backfill: turn a flat list of restaurants into brands + branches.
//
// Two problems this fixes in the existing catalogue:
//
//  1. A previous script wrote branch descriptors *into* the name field, so 469
//     records are called things like "Morley's Fried Chicken (Acton)". Brand and
//     branch belong in separate columns — that is what makes "Morley's" a
//     searchable brand and "Acton" a distinguishable location.
//  2. One brand can be split across naming variants. "Morley's Fried Chicken"
//     (19 branches) and "Morley's Chicken" (9) are the same business.
//
// Branch labels are always *derived from the record's own address* or from the
// suffix a human already put there. Nothing is invented. Where a label cannot be
// derived confidently, it is left null and the name keeps whatever it had — so a
// failed parse never makes a listing worse.
//
// Idempotent: re-running produces the same brands and the same labels.
// Run with: node scripts/backfill-brands.mjs [--apply]
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnvLocal() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes('--apply');

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** Brands whose branches appear under more than one trading name. */
const BRAND_ALIASES = [
  { canonical: "Morley's", match: [/^morley'?s\b/i] },
  { canonical: 'Chicken Cottage', match: [/^chicken cottage\b/i] },
  { canonical: 'German Doner Kebab', match: [/^german doner kebab\b/i] },
  { canonical: "Sam's Chicken", match: [/^sam'?s chicken\b/i] },
  { canonical: "Pepe's Piri Piri", match: [/^pepe'?s\b/i] },
];

/** Strip a human-added "(Area)" suffix. Returns [cleanName, suffixOrNull]. */
function splitSuffix(name) {
  const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return [name.trim(), null];
  return [m[1].trim(), m[2].trim()];
}

// Building descriptors and bare numbers are not places. A card reading
// "Morley's — Ground Floor" reproduces exactly the ambiguity a branch label
// exists to remove.
const NOT_A_PLACE = /(ground floor|first floor|second floor|basement|unit|units|shop|kiosk|stall|rear|front|suite|room|premises|commercial)/i;

function isPlaceLike(segment) {
  if (!segment) return false;
  if (NOT_A_PLACE.test(segment)) return false;
  if (/^[0-9]/.test(segment.trim())) return false;
  return true;
}

/** Comparison key for "is this the same brand". */
function brandKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function canonicalBrand(cleanName) {
  for (const alias of BRAND_ALIASES) {
    if (alias.match.some((re) => re.test(cleanName))) return alias.canonical;
  }
  return cleanName;
}

/**
 * Derive a branch label from the address itself: the locality if the address
 * carries one, otherwise the street. Returns null rather than guessing.
 */
function labelFromAddress(address, businessName) {
  if (!address) return null;
  const nameKey = brandKey(businessName ?? '');

  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !UK_POSTCODE.test(p))
    .filter((p) => p.toLowerCase() !== 'london');

  const usable = parts.filter((p) => {
    // Where in the building, not where in London.
    if (!isPlaceLike(p)) return false;
    // FSA's AddressLine1 frequently repeats the trading name, so a segment that
    // is essentially the business name describes no location at all.
    const key = brandKey(p);
    if (!nameKey || key.length < 3) return true;
    return !key.includes(nameKey) && !nameKey.includes(key);
  });
  if (usable.length === 0) return null;

  // Last remaining part is usually the locality ("... , Acton").
  const locality = usable[usable.length - 1];
  if (usable.length >= 2 && locality.length <= 30 && !/^\d/.test(locality)) return locality;

  // Otherwise fall back to the street, with the house number removed.
  const street = usable[0].replace(/^[\d\s-]*[A-Za-z]?\s+/, '').trim();
  return street && street.length <= 30 ? street : null;
}

// "Ground Floor", "Commercial Unit", "Unit 2" are where in the building, not
// where in London. Only a segment that reads like a road name qualifies.
const STREET_WORD =
  /\b(road|street|lane|avenue|way|hill|broadway|parade|gardens|walk|crescent|drive|grove|terrace|square|market|rise|close|row|mews|court|place|bridge|green|common|vale|park)\b/i;

/** The street portion of an address, house number stripped. Null if unusable. */
function streetFromAddress(address) {
  if (!address) return null;
  for (const raw of address.split(',').map((p) => p.trim())) {
    if (!raw || UK_POSTCODE.test(raw) || raw.toLowerCase() === 'london') continue;
    const street = raw.replace(/^[\d\s\-–/]*[A-Za-z]?\s+/, '').trim();
    if (!STREET_WORD.test(street)) continue;
    if (street.length < 4 || street.length > 30) continue;
    return street;
  }
  return null;
}

// Split on whitespace/hyphens only. A \b-based replace also matches after an
// apostrophe, which turned "morley's" into "Morley'S".
function titleCase(s) {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w) => (/^[a-z]/.test(w) ? w[0].toUpperCase() + w.slice(1) : w))
    .join('')
    .replace(/\bAnd\b/g, 'and');
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function fetchAll() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, address, postcode, brand_id, branch_label')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

const rows = await fetchAll();
console.log(`Loaded ${rows.length} restaurants\n`);

// --- Group into brands -------------------------------------------------------
const groups = new Map(); // brandKey -> { display, members: [{row, suffix, clean}] }

for (const row of rows) {
  const [clean, suffix] = splitSuffix(row.name);
  const display = canonicalBrand(clean);
  const key = brandKey(display);
  if (!groups.has(key)) groups.set(key, { display, members: [] });
  groups.get(key).members.push({ row, suffix, clean });
}

const chains = [...groups.values()].filter((g) => g.members.length > 1);
const singles = [...groups.values()].filter((g) => g.members.length === 1);

console.log(`Brands with multiple locations: ${chains.length}`);
console.log(`Single-location businesses:     ${singles.length}`);
console.log(`Records belonging to a chain:   ${chains.reduce((n, g) => n + g.members.length, 0)}\n`);

console.log('Largest chains:');
for (const g of [...chains].sort((a, b) => b.members.length - a.members.length).slice(0, 8)) {
  console.log(`  ${String(g.members.length).padStart(3)}  ${g.display}`);
}

// --- Plan the writes ---------------------------------------------------------
const brandPlan = chains.map((g) => ({ name: g.display, slug: slugify(g.display), group: g }));
let labelled = 0;
let unlabelled = 0;
const updates = [];

for (const { group } of brandPlan) {
  for (const { row, suffix, clean } of group.members) {
    const label = suffix ?? labelFromAddress(row.address, clean);
    if (label) labelled++;
    else unlabelled++;
    updates.push({
      id: row.id,
      // The name loses its "(Area)" suffix only when we have somewhere to put
      // it. If the label could not be derived, the name is left exactly as it
      // was rather than silently losing information.
      name: label ? clean : row.name,
      branch_label: label ? titleCase(label) : null,
      brandSlug: slugify(group.display),
    });
  }
}

// A brand can have several branches in one neighbourhood — Morley's has five in
// Croydon. "Morley's — Croydon" twice is the same ambiguity the branch label
// exists to remove, so colliding labels fall back to the street.
const byBrandLabel = new Map();
for (const u of updates) {
  if (!u.branch_label) continue;
  const key = `${u.brandSlug}::${u.branch_label.toLowerCase()}`;
  byBrandLabel.set(key, [...(byBrandLabel.get(key) ?? []), u]);
}

let refined = 0;
for (const colliding of byBrandLabel.values()) {
  if (colliding.length < 2) continue;
  for (const u of colliding) {
    const row = rows.find((r) => r.id === u.id);
    const street = streetFromAddress(row.address);
    if (street && street.toLowerCase() !== u.branch_label.toLowerCase()) {
      u.branch_label = titleCase(street);
      refined++;
    }
  }
}

// Final gate. Every path above — human suffix, locality, street, collision
// refinement — has to clear the same bar, so a new derivation route can never
// quietly reintroduce "Ground Floor". A null label is safe: the card falls back
// to name plus distance. A wrong one is not.
let discarded = 0;
for (const u of updates) {
  if (u.branch_label && !isPlaceLike(u.branch_label)) {
    u.branch_label = null;
    // The name keeps whatever it had, so nothing is lost.
    u.name = rows.find((r) => r.id === u.id).name;
    discarded++;
  }
}

// Records this run no longer considers part of a chain must be released, not
// left as they are. Cleaning a name changes how the next run groups it, so
// without this a record can drop out of a brand and silently keep the stale
// brand_id and branch_label it was given by an earlier run.
const claimed = new Set(updates.map((u) => u.id));
const orphans = rows.filter((r) => !claimed.has(r.id) && (r.brand_id || r.branch_label));
for (const r of orphans) {
  updates.push({ id: r.id, name: r.name, branch_label: null, brandSlug: null });
}

console.log(`\nBranch labels derivable: ${labelled}`);
console.log(`Left without a label:    ${unlabelled}`);
console.log(`Refined to street (same-area collisions): ${refined}`);
console.log(`Discarded as not-a-place: ${discarded}`);
console.log(`Released (no longer in a chain): ${orphans.length}`);

if (!APPLY) {
  console.log('\nExamples of what would change:');
  for (const u of updates.slice(0, 10)) {
    const before = rows.find((r) => r.id === u.id).name;
    console.log(`  "${before}"  ->  "${u.name}"  +  branch_label="${u.branch_label ?? ''}"`);
  }
  console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

// --- Apply -------------------------------------------------------------------
console.log('\nWriting brands...');
const brandIdBySlug = new Map();
for (const b of brandPlan) {
  // Read first, insert only if missing. An upsert of an unchanged row does not
  // reliably return it, and a missing entry here silently unlinks every branch
  // of that brand — which is exactly what happened on the second run.
  const { data: found } = await supabase
    .from('brands')
    .select('id, slug')
    .eq('slug', b.slug)
    .maybeSingle();

  if (found) {
    brandIdBySlug.set(found.slug, found.id);
    continue;
  }

  const { data: created, error } = await supabase
    .from('brands')
    .insert({ name: b.name, slug: b.slug })
    .select('id, slug')
    .maybeSingle();
  if (error || !created) {
    console.error(`  brand "${b.name}": ${error?.message ?? 'insert returned nothing'}`);
    continue;
  }
  brandIdBySlug.set(created.slug, created.id);
}

if (brandIdBySlug.size !== brandPlan.length) {
  console.error(
    `  WARNING: resolved ${brandIdBySlug.size} of ${brandPlan.length} brands — refusing to unlink the rest.`
  );
  process.exit(1);
}
console.log(`  ${brandIdBySlug.size} brands`);

console.log('Linking restaurants...');
let written = 0;
for (const u of updates) {
  const { error } = await supabase
    .from('restaurants')
    .update({
      // name is deliberately NOT written. Grouping is derived from it, so
      // rewriting it makes each run regroup against its own previous output —
      // which silently degraded chain membership run over run. The display
      // layer strips a trailing "(Area)" instead, which is reversible.
      //
      // The place check is repeated here rather than trusted from upstream:
      // this is the only line that actually writes, so it is the only place a
      // guard cannot be routed around by a future derivation path.
      branch_label: isPlaceLike(u.branch_label) ? u.branch_label : null,
      brand_id: brandIdBySlug.get(u.brandSlug) ?? null,
      last_checked_at: new Date().toISOString(),
    })
    .eq('id', u.id);
  if (error) console.error(`  ${u.id}: ${error.message}`);
  else written++;
}
console.log(`  ${written} restaurants updated`);
