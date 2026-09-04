// Assigns a compliant, licensed (Unsplash License — free for commercial use)
// cuisine-representative photo to every restaurant that currently has none.
// These are NOT photos of the restaurant's actual food — the UI labels them
// "Representative photo" (detected by the images.unsplash.com domain) so
// this is never presented as the restaurant's own image. Real photos
// naturally replace these once an owner claims their listing and uploads
// their own via /admin or a future self-serve flow.
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

const PHOTO_BY_CUISINE = {
  turkish: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800',
  lebanese: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  'middle eastern': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  indian: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
  pakistani: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
  biryani: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
  bangladeshi: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800',
  persian: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800',
  grill: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800',
  'fried chicken': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800',
  burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
};
const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800';

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
  // Restaurants that have zero photo rows at all.
  const allRestaurants = await fetchAll(() => supabase.from('restaurants').select('id'));
  const withPhotos = await fetchAll(() => supabase.from('restaurant_photos').select('restaurant_id'));
  const hasPhoto = new Set(withPhotos.map((p) => p.restaurant_id));
  const needsPhoto = allRestaurants.filter((r) => !hasPhoto.has(r.id));
  console.log(`${needsPhoto.length} of ${allRestaurants.length} restaurants have no photo yet.`);

  const cuisineLinks = await fetchAll(() =>
    supabase.from('restaurant_cuisines').select('restaurant_id, cuisines(name)')
  );
  const cuisineByRestaurant = new Map();
  for (const link of cuisineLinks) {
    const name = Array.isArray(link.cuisines) ? link.cuisines[0]?.name : link.cuisines?.name;
    if (name) cuisineByRestaurant.set(link.restaurant_id, name.toLowerCase());
  }

  let assigned = 0;
  const batch = [];
  for (const r of needsPhoto) {
    const cuisine = cuisineByRestaurant.get(r.id);
    const url = (cuisine && PHOTO_BY_CUISINE[cuisine]) || FALLBACK_PHOTO;
    batch.push({ restaurant_id: r.id, storage_path: url, type: 'food', is_primary: true });
    if (batch.length === 500) {
      await supabase.from('restaurant_photos').insert(batch.splice(0));
      assigned += 500;
      console.log(`  ...${assigned} assigned`);
    }
  }
  if (batch.length) {
    await supabase.from('restaurant_photos').insert(batch);
    assigned += batch.length;
  }

  console.log(`\nDone. Assigned representative photos to ${assigned} restaurants.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
