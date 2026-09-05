// Stage 1: find candidate duplicate locations and queue them for a human.
//
// This never merges anything. It scores pairs and writes them to
// catalogue_dedupe_candidates for review, because the cost of wrongly merging
// two real restaurants is far higher than the cost of carrying a duplicate for
// a week.
//
// The distinction that matters: two branches of one chain are NOT duplicates.
// Morley's Peckham and Morley's Brixton share a name and a brand and are two
// different places. So a shared name alone scores nothing — proximity is
// required before a pair is even considered, and the strong signals are the
// ones that identify a *physical location*: coordinates, postcode, phone.
//
// Run with: node scripts/find-duplicates.mjs [--apply]
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

/** Pairs closer than this are worth considering at all. */
const PROXIMITY_METERS = 150;
/** Below this we do not bother a human. */
const QUEUE_THRESHOLD = 55;

function nameKey(name) {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[^a-z0-9]/g, '');
}

function normPhone(p) {
  return p ? p.replace(/[^0-9]/g, '').replace(/^44/, '0') : null;
}

function normHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function metresBetween(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchAll() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants_with_coords')
      .select('id, name, address, postcode, phone, website_url, lat, lng, brand_id')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

const rows = await fetchAll();
console.log(`Loaded ${rows.length} locations\n`);

// Bucket by a coarse geohash-ish grid so this stays O(n) rather than O(n^2).
// ~0.002 degrees is roughly 200m of latitude, comfortably wider than the
// proximity window, and neighbours are checked too.
const CELL = 0.002;
const grid = new Map();
const cellKey = (lat, lng) => `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;
for (const r of rows) {
  if (r.lat == null || r.lng == null) continue;
  const k = cellKey(r.lat, r.lng);
  grid.set(k, [...(grid.get(k) ?? []), r]);
}

const candidates = [];
const seenPairs = new Set();

for (const r of rows) {
  if (r.lat == null || r.lng == null) continue;
  const ci = Math.floor(r.lat / CELL);
  const cj = Math.floor(r.lng / CELL);

  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      for (const other of grid.get(`${ci + di}:${cj + dj}`) ?? []) {
        if (other.id <= r.id) continue; // ordered pair, each considered once
        const pairId = `${r.id}:${other.id}`;
        if (seenPairs.has(pairId)) continue;

        const metres = metresBetween(r, other);
        if (metres > PROXIMITY_METERS) continue;

        // Proximity alone is not evidence. Two different restaurants share an
        // address constantly — a parade of shopfronts geocodes to one point,
        // and food halls put a dozen businesses at identical coordinates.
        // Without this gate, "Indiano Pizza" and "Al Farooq Kebabish" at 0m
        // scored 60 purely on being neighbours.
        const ka = nameKey(r.name);
        const kb = nameKey(other.name);
        const identicalName = ka === kb;
        const containedName =
          !identicalName &&
          Math.min(ka.length, kb.length) >= 6 &&
          (ka.includes(kb) || kb.includes(ka));

        const phoneA = normPhone(r.phone);
        const phoneB = normPhone(other.phone);
        const samePhone = Boolean(phoneA && phoneB && phoneA === phoneB);
        const hostA = normHost(r.website_url);
        const hostB = normHost(other.website_url);
        const sameSite = Boolean(hostA && hostB && hostA === hostB);

        // Either the names agree, or something that identifies the business
        // itself does. Otherwise this is two neighbours, not one shop twice.
        if (!identicalName && !containedName && !samePhone && !sameSite) continue;

        const signals = {};
        let score = 0;

        // Physical-location signals first — these are what separate "the same
        // shop recorded twice" from "two branches on the same high street".
        if (metres <= 25) {
          score += 40;
          signals.distance = `${metres.toFixed(0)}m`;
        } else if (metres <= 75) {
          score += 25;
          signals.distance = `${metres.toFixed(0)}m`;
        } else {
          score += 12;
          signals.distance = `${metres.toFixed(0)}m`;
        }

        if (identicalName) {
          score += 25;
          signals.name = 'identical';
        } else if (containedName) {
          score += 15;
          signals.name = 'one contains the other';
        }

        if (r.postcode && other.postcode &&
            r.postcode.replace(/\s/g, '').toUpperCase() ===
              other.postcode.replace(/\s/g, '').toUpperCase()) {
          score += 20;
          signals.postcode = r.postcode;
        }

        if (samePhone) {
          score += 15;
          signals.phone = 'match';
        }

        if (sameSite) {
          score += 10;
          signals.website = hostA;
        }

        // A chain's own branches sharing a brand is expected and is not
        // evidence of duplication, so it adds nothing on its own.
        if (r.brand_id && r.brand_id === other.brand_id) signals.same_brand = true;

        if (score < QUEUE_THRESHOLD) continue;

        seenPairs.add(pairId);
        candidates.push({
          restaurant_a: r.id < other.id ? r.id : other.id,
          restaurant_b: r.id < other.id ? other.id : r.id,
          score: Math.min(100, score),
          signals,
          _a: r,
          _b: other,
        });
      }
    }
  }
}

candidates.sort((x, y) => y.score - x.score);
console.log(`Candidate pairs at or above ${QUEUE_THRESHOLD}: ${candidates.length}\n`);

for (const c of candidates.slice(0, 15)) {
  console.log(
    `  ${String(c.score).padStart(3)}  ${c._a.name}  ||  ${c._b.name}  (${c.signals.distance})`
  );
}

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to queue these for review.');
  process.exit(0);
}

console.log('\nQueueing...');
let queued = 0;
for (const c of candidates) {
  const { error } = await supabase.from('catalogue_dedupe_candidates').upsert(
    {
      restaurant_a: c.restaurant_a,
      restaurant_b: c.restaurant_b,
      score: c.score,
      signals: c.signals,
    },
    { onConflict: 'restaurant_a,restaurant_b', ignoreDuplicates: true }
  );
  if (error) console.error(`  ${c.restaurant_a}/${c.restaurant_b}: ${error.message}`);
  else queued++;
}
console.log(`  ${queued} pairs in the review queue (nothing merged).`);
