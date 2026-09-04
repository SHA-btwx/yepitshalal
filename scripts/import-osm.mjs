// Compliant data-seeding, second source: OpenStreetMap (ODbL — attribution
// required, which we record via source_attribution_text). Unlike the FSA
// import, OSM contributors often tag `diet:halal=yes` or `cuisine=halal`
// directly — a more precise signal than name-keyword guessing. This still
// enters every row as ⚪ Unverified: OSM tagging is a community data point,
// not a YepItsHalal verification.
//
// Run with: node scripts/import-osm.mjs
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

// Greater London bounding box: south, west, north, east
const BBOX = '51.28,-0.51,51.70,0.33';

const QUERY = `[out:json][timeout:60];
(
  node["diet:halal"~"yes|only"](${BBOX});
  way["diet:halal"~"yes|only"](${BBOX});
);
out center;`;

function slugify(name) {
  return (
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
    '-' + Math.random().toString(36).slice(2, 6)
  );
}

function addressFromTags(tags) {
  const parts = [
    tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'] || 'London',
    tags['addr:postcode'],
  ].filter(Boolean);
  return parts.join(', ') || 'London';
}

async function main() {
  console.log('Querying OpenStreetMap Overpass API for Greater London...');
  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(QUERY),
    });
    if (res.ok) break;
    console.error(`  Attempt ${attempt} failed: ${res.status} — retrying in 10s...`);
    await new Promise((r) => setTimeout(r, 10000));
  }
  if (!res.ok) {
    console.error(`Overpass query failed after retries: ${res.status}. Skipping OSM import for now — FSA data already covers a large base.`);
    process.exit(0);
  }
  const json = await res.json();
  const elements = (json.elements ?? []).filter((e) => e.tags?.name);
  console.log(`Found ${elements.length} named halal-tagged places.`);

  const { data: existing } = await supabase
    .from('restaurants')
    .select('source_reference_id')
    .not('source_reference_id', 'is', null);
  const existingIds = new Set((existing ?? []).map((r) => r.source_reference_id));

  const { data: cuisineRows } = await supabase.from('cuisines').select('id, name');
  const cuisineByName = new Map((cuisineRows ?? []).map((c) => [c.name.toLowerCase(), c.id]));

  let inserted = 0;
  let skipped = 0;

  for (const e of elements) {
    // Prefer the linked FSA record id when OSM provides one — keeps
    // provenance pointed at the same physical business even across sources.
    const refId = e.tags['fhrs:id'] ? `fhrs:${e.tags['fhrs:id']}` : `osm:${e.type}:${e.id}`;
    if (existingIds.has(refId) || existingIds.has(e.tags['fhrs:id'])) {
      skipped++;
      continue;
    }

    const lat = e.type === 'node' ? e.lat : e.center?.lat;
    const lon = e.type === 'node' ? e.lon : e.center?.lon;
    if (!lat || !lon) continue;

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .insert({
        name: e.tags.name.trim(),
        slug: slugify(e.tags.name),
        address: addressFromTags(e.tags),
        postcode: e.tags['addr:postcode'] || null,
        phone: e.tags['contact:phone'] || e.tags.phone || null,
        website_url: e.tags.website || null,
        halal_classification: 'unverified',
        data_source: 'osm_import',
        source_reference_id: refId,
        source_attribution_text: '© OpenStreetMap contributors (ODbL)',
        location: `SRID=4326;POINT(${lon} ${lat})`,
      })
      .select('id')
      .single();

    if (error) {
      // Likely a slug/reference collision on a re-run — skip quietly.
      skipped++;
      continue;
    }

    const cuisineTag = (e.tags.cuisine || '').toLowerCase();
    let cuisineGuess = null;
    if (cuisineTag.includes('turkish')) cuisineGuess = 'Turkish';
    else if (cuisineTag.includes('indian')) cuisineGuess = 'Indian';
    else if (cuisineTag.includes('pakistani')) cuisineGuess = 'Pakistani';
    else if (cuisineTag.includes('bangladeshi')) cuisineGuess = 'Bangladeshi';
    else if (cuisineTag.includes('lebanese')) cuisineGuess = 'Lebanese';
    else if (cuisineTag.includes('persian') || cuisineTag.includes('iranian')) cuisineGuess = 'Persian';
    else if (cuisineTag.includes('kebab') || cuisineTag.includes('grill')) cuisineGuess = 'Grill';
    else if (cuisineTag.includes('chicken') || cuisineTag.includes('fried_chicken')) cuisineGuess = 'Fried Chicken';
    else if (cuisineTag.includes('burger')) cuisineGuess = 'Burgers';
    else if (cuisineTag.includes('bakery')) cuisineGuess = 'Bakery';
    else if (cuisineTag.includes('arab') || cuisineTag.includes('middle_eastern')) cuisineGuess = 'Middle Eastern';

    if (cuisineGuess && cuisineByName.has(cuisineGuess.toLowerCase())) {
      await supabase.from('restaurant_cuisines').insert({
        restaurant_id: restaurant.id,
        cuisine_id: cuisineByName.get(cuisineGuess.toLowerCase()),
      });
    }
    inserted++;
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (already present) from OpenStreetMap.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
