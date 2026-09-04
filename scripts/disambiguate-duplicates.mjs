// For restaurants that share an exact name (legitimate different branches of
// local mini-chains — verified these are real distinct addresses, not import
// bugs), append the nearest named area so they're distinguishable in lists,
// e.g. "Spice Hut" -> "Spice Hut (Bethnal Green)".
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

const AREAS = [
  { name: 'Whitechapel', lat: 51.5194, lng: -0.0610 }, { name: 'Bethnal Green', lat: 51.5270, lng: -0.0554 },
  { name: 'Bow', lat: 51.5270, lng: -0.0246 }, { name: 'Stratford', lat: 51.5416, lng: -0.0042 },
  { name: 'Leyton', lat: 51.5606, lng: -0.0116 }, { name: 'Dalston', lat: 51.5465, lng: -0.0752 },
  { name: 'Upton Park', lat: 51.5324, lng: 0.0335 }, { name: 'East Ham', lat: 51.5350, lng: 0.0555 },
  { name: 'Ilford', lat: 51.5590, lng: 0.0741 }, { name: 'Barking', lat: 51.5397, lng: 0.0810 },
  { name: 'Dagenham', lat: 51.5461, lng: 0.1520 }, { name: 'Walthamstow', lat: 51.5886, lng: -0.0210 },
  { name: 'Edmonton', lat: 51.6127, lng: -0.0653 }, { name: 'Enfield', lat: 51.6521, lng: -0.0807 },
  { name: 'Turnpike Lane', lat: 51.5977, lng: -0.1093 }, { name: 'Harringay', lat: 51.5799, lng: -0.1057 },
  { name: 'Finsbury Park', lat: 51.5646, lng: -0.1064 }, { name: 'Camden', lat: 51.5390, lng: -0.1426 },
  { name: 'Kings Cross', lat: 51.5320, lng: -0.1233 }, { name: 'Edgware Road', lat: 51.5203, lng: -0.1679 },
  { name: 'Paddington', lat: 51.5154, lng: -0.1755 }, { name: 'Shepherds Bush', lat: 51.5057, lng: -0.2258 },
  { name: 'Acton', lat: 51.5085, lng: -0.2707 }, { name: 'Southall', lat: 51.5077, lng: -0.3762 },
  { name: 'Hounslow', lat: 51.4746, lng: -0.3680 }, { name: 'Hayes', lat: 51.5046, lng: -0.4222 },
  { name: 'Wembley', lat: 51.5520, lng: -0.2960 }, { name: 'Harrow', lat: 51.5836, lng: -0.3464 },
  { name: 'Colindale', lat: 51.6030, lng: -0.2410 }, { name: 'Barnet', lat: 51.6252, lng: -0.1517 },
  { name: 'Tottenham', lat: 51.5886, lng: -0.0682 }, { name: 'Elephant & Castle', lat: 51.4949, lng: -0.1000 },
  { name: 'Peckham', lat: 51.4740, lng: -0.0693 }, { name: 'Brixton', lat: 51.4613, lng: -0.1156 },
  { name: 'Streatham', lat: 51.4267, lng: -0.1287 }, { name: 'Tooting', lat: 51.4274, lng: -0.1682 },
  { name: 'Croydon', lat: 51.3762, lng: -0.0982 }, { name: 'Lewisham', lat: 51.4624, lng: -0.0119 },
  { name: 'Woolwich', lat: 51.4900, lng: 0.0648 }, { name: 'Vauxhall', lat: 51.4857, lng: -0.1246 },
];

function nearestArea(lat, lng) {
  let best = AREAS[0];
  let bestDist = Infinity;
  for (const area of AREAS) {
    const d = Math.hypot(area.lat - lat, area.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      best = area;
    }
  }
  return best.name;
}

async function fetchAll(buildQuery) {
  const pageSize = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data ?? []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  const restaurants = await fetchAll(() =>
    supabase
      .from('restaurants_with_coords')
      .select('id, name, lat, lng')
      .in('data_source', ['fsa_import', 'osm_import'])
  );

  const byName = new Map();
  for (const r of restaurants ?? []) {
    if (/\([^)]+\)$/.test(r.name)) continue; // already disambiguated — idempotent re-runs
    if (!byName.has(r.name)) byName.set(r.name, []);
    byName.get(r.name).push(r);
  }

  let updated = 0;
  for (const [name, group] of byName) {
    if (group.length < 2) continue;
    for (const r of group) {
      const area = nearestArea(r.lat, r.lng);
      const newName = `${name} (${area})`;
      await supabase.from('restaurants').update({ name: newName }).eq('id', r.id);
      updated++;
    }
  }

  console.log(`Disambiguated ${updated} restaurants across ${[...byName.values()].filter(g => g.length > 1).length} duplicate names.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
