// FSA's AddressLine1 often repeats the trading name (e.g. "Lahore Kebab
// House, 2-4 Umberston Street..."). Strip that leading duplicate for a
// cleaner address display — data quality touch-up, not a new import.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnvLocal() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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

const restaurants = await fetchAll(() =>
  supabase.from('restaurants').select('id, name, address').eq('data_source', 'fsa_import')
);

let updated = 0;
for (const r of restaurants ?? []) {
  const prefix = `${r.name}, `;
  if (r.address.startsWith(prefix)) {
    const cleaned = r.address.slice(prefix.length);
    await supabase.from('restaurants').update({ address: cleaned }).eq('id', r.id);
    updated++;
  }
}
console.log(`Cleaned ${updated} of ${restaurants?.length ?? 0} addresses.`);
