// Compliant data-seeding: UK Food Standards Agency open Food Hygiene Rating
// Scheme API. FSA has no halal/cuisine data, so every imported row enters as
// ⚪ Unverified — name-keyword matching only biases toward halal-likely
// cuisines for this platform's audience, it is not a halal claim.
//
// Run with: node scripts/import-fsa.mjs
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

// Broad coverage across Greater London, not just the densest pockets.
const AREAS = [
  { name: 'Whitechapel', lat: 51.5194, lng: -0.0610 },
  { name: 'Bethnal Green', lat: 51.5270, lng: -0.0554 },
  { name: 'Bow', lat: 51.5270, lng: -0.0246 },
  { name: 'Stratford', lat: 51.5416, lng: -0.0042 },
  { name: 'Leyton', lat: 51.5606, lng: -0.0116 },
  { name: 'Hackney / Dalston', lat: 51.5465, lng: -0.0752 },
  { name: 'Green Street / Upton Park', lat: 51.5324, lng: 0.0335 },
  { name: 'East Ham / Manor Park', lat: 51.5350, lng: 0.0555 },
  { name: 'Ilford', lat: 51.5590, lng: 0.0741 },
  { name: 'Barking', lat: 51.5397, lng: 0.0810 },
  { name: 'Dagenham', lat: 51.5461, lng: 0.1520 },
  { name: 'Walthamstow', lat: 51.5886, lng: -0.0210 },
  { name: 'Edmonton', lat: 51.6127, lng: -0.0653 },
  { name: 'Enfield', lat: 51.6521, lng: -0.0807 },
  { name: 'Wood Green / Turnpike Lane', lat: 51.5977, lng: -0.1093 },
  { name: 'Green Lanes / Harringay', lat: 51.5799, lng: -0.1057 },
  { name: 'Finsbury Park', lat: 51.5646, lng: -0.1064 },
  { name: 'Camden', lat: 51.5390, lng: -0.1426 },
  { name: 'Kings Cross', lat: 51.5320, lng: -0.1233 },
  { name: 'Edgware Road', lat: 51.5203, lng: -0.1679 },
  { name: 'Paddington', lat: 51.5154, lng: -0.1755 },
  { name: 'Shepherds Bush', lat: 51.5057, lng: -0.2258 },
  { name: 'Acton', lat: 51.5085, lng: -0.2707 },
  { name: 'Southall', lat: 51.5077, lng: -0.3762 },
  { name: 'Hounslow', lat: 51.4746, lng: -0.3680 },
  { name: 'Hayes', lat: 51.5046, lng: -0.4222 },
  { name: 'Wembley', lat: 51.5520, lng: -0.2960 },
  { name: 'Harrow', lat: 51.5836, lng: -0.3464 },
  { name: 'Colindale / Edgware', lat: 51.6030, lng: -0.2410 },
  { name: 'Barnet', lat: 51.6252, lng: -0.1517 },
  { name: 'Tottenham', lat: 51.5886, lng: -0.0682 },
  { name: 'Elephant & Castle', lat: 51.4949, lng: -0.1000 },
  { name: 'Peckham', lat: 51.4740, lng: -0.0693 },
  { name: 'Brixton', lat: 51.4613, lng: -0.1156 },
  { name: 'Streatham', lat: 51.4267, lng: -0.1287 },
  { name: 'Tooting', lat: 51.4274, lng: -0.1682 },
  { name: 'Croydon', lat: 51.3762, lng: -0.0982 },
  { name: 'Lewisham', lat: 51.4624, lng: -0.0119 },
  { name: 'Woolwich', lat: 51.4900, lng: 0.0648 },
  { name: 'Vauxhall / Nine Elms', lat: 51.4857, lng: -0.1246 },
];

const BUSINESS_TYPE_IDS = [1, 7844]; // Restaurant/Cafe/Canteen, Takeaway/sandwich shop
const RADIUS_MILES = 1.3;

const KEYWORDS = [
  'halal', 'kebab', 'kebap', 'doner', 'döner', 'shawarma', 'shwarma', 'tandoori', 'tandori',
  'biryani', 'biriyani', 'karahi', 'nihari', 'haleem', 'mandi', 'grill', 'peri', 'tikka',
  'kofta', 'kabab', 'turkish', 'lebanese', 'persian', 'afghan', 'pakistani', 'bangladeshi',
  'indian', 'punjabi', 'bengali', 'arab', 'egyptian', 'yemeni', 'somali', 'ethiopian',
  'eritrean', 'nigerian', 'moroccan', 'iraqi', 'syrian', 'kurdish', 'istanbul', 'sultan',
  'delhi', 'mumbai', 'karachi', 'lahore', 'dhaka', 'cairo', 'medina', 'bismillah', 'chicken',
  'wings', 'sweets', 'samosa', 'curry', 'spice', 'jollof', 'suya', 'shisha', 'kabsa', 'mandy',
];

function nameLooksHalalLikely(name) {
  const lower = name.toLowerCase();
  return KEYWORDS.some((k) => lower.includes(k));
}

function slugify(name) {
  return (
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
    '-' + Math.random().toString(36).slice(2, 6)
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchArea(area, businessTypeId, attempt = 1) {
  const url = new URL('https://api.ratings.food.gov.uk/Establishments');
  url.searchParams.set('latitude', area.lat);
  url.searchParams.set('longitude', area.lng);
  url.searchParams.set('maxDistanceLimit', RADIUS_MILES);
  url.searchParams.set('businessTypeId', businessTypeId);
  url.searchParams.set('pageSize', 200);
  url.searchParams.set('sortOptionKey', 'distance');

  const res = await fetch(url, { headers: { 'x-api-version': '2' } });
  if (res.status === 403 && attempt <= 3) {
    await sleep(4000 * attempt);
    return fetchArea(area, businessTypeId, attempt + 1);
  }
  if (!res.ok) {
    console.error(`  FSA fetch failed for ${area.name} (type ${businessTypeId}): ${res.status}`);
    return [];
  }
  const json = await res.json();
  return json.establishments ?? [];
}

async function main() {
  const { data: existing } = await supabase.from('restaurants').select('source_reference_id').not('source_reference_id', 'is', null);
  const existingIds = new Set((existing ?? []).map((r) => r.source_reference_id));

  const { data: cuisineRows } = await supabase.from('cuisines').select('id, name');
  const cuisineByName = new Map((cuisineRows ?? []).map((c) => [c.name.toLowerCase(), c.id]));

  const candidates = new Map();

  for (const area of AREAS) {
    for (const typeId of BUSINESS_TYPE_IDS) {
      const results = await fetchArea(area, typeId);
      for (const e of results) {
        if (!e.geocode?.latitude || !e.geocode?.longitude) continue;
        if (!nameLooksHalalLikely(e.BusinessName)) continue;
        if (existingIds.has(String(e.FHRSID))) continue;
        candidates.set(e.FHRSID, e);
      }
      await sleep(700);
    }
    console.log(`${area.name}: ${candidates.size} candidates so far`);
  }

  console.log(`\nInserting ${candidates.size} new restaurants...`);
  let inserted = 0;

  for (const e of candidates.values()) {
    const addressParts = [e.AddressLine1, e.AddressLine2, e.AddressLine3, e.AddressLine4].filter(Boolean);
    const address = [...addressParts, e.PostCode].filter(Boolean).join(', ');
    const slug = slugify(e.BusinessName);

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .insert({
        name: e.BusinessName.trim(),
        slug,
        address: address || 'London',
        postcode: e.PostCode || null,
        halal_classification: 'unverified',
        data_source: 'fsa_import',
        source_reference_id: String(e.FHRSID),
        source_attribution_text: 'Food hygiene data from the Food Standards Agency (FHRS)',
        location: `SRID=4326;POINT(${e.geocode.longitude} ${e.geocode.latitude})`,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Skipped "${e.BusinessName}": ${error.message}`);
      continue;
    }

    const lower = e.BusinessName.toLowerCase();
    let cuisineGuess = null;
    if (/turk|kebap|döner|doner/.test(lower)) cuisineGuess = 'Turkish';
    else if (/biryani|biriyani/.test(lower)) cuisineGuess = 'Biryani';
    else if (/tandoor|curry|indian|punjabi/.test(lower)) cuisineGuess = 'Indian';
    else if (/pakistan|karahi|lahore|karachi/.test(lower)) cuisineGuess = 'Pakistani';
    else if (/bengal|bangladesh|dhaka/.test(lower)) cuisineGuess = 'Bangladeshi';
    else if (/leban|shawarma/.test(lower)) cuisineGuess = 'Lebanese';
    else if (/persia|iran/.test(lower)) cuisineGuess = 'Persian';
    else if (/chicken|wings|peri/.test(lower)) cuisineGuess = 'Fried Chicken';
    else if (/burger/.test(lower)) cuisineGuess = 'Burgers';
    else if (/grill|kabab|kofta|tikka|mandi|mandy|kabsa/.test(lower)) cuisineGuess = 'Grill';
    else if (/sweet|bakery|patisserie/.test(lower)) cuisineGuess = 'Bakery';
    else if (/arab|egypt|syria|iraq|yemen/.test(lower)) cuisineGuess = 'Middle Eastern';

    if (cuisineGuess && cuisineByName.has(cuisineGuess.toLowerCase())) {
      await supabase.from('restaurant_cuisines').insert({
        restaurant_id: restaurant.id,
        cuisine_id: cuisineByName.get(cuisineGuess.toLowerCase()),
      });
    }
    inserted++;
    if (inserted % 50 === 0) console.log(`  ...${inserted} inserted`);
  }

  console.log(`\nDone. Inserted ${inserted} restaurants from FSA open data.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
