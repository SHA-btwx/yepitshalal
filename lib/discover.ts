import { createServerSupabase } from './supabase/server';
import type { HalalClassification } from './types';

export interface DiscoverCard {
  id: string;
  name: string;
  slug: string;
  address: string;
  halal_classification: HalalClassification;
  cuisines: string[];
  photoUrl: string | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A lightweight "for you" style feed: pulls a randomised window of restaurants
// (all of which have at least a representative photo, real or stock — see
// scripts/assign-stock-photos.mjs) rather than every restaurant in London, so
// the page loads fast and still feels different on each visit.
export async function getDiscoverFeed(limit = 24): Promise<DiscoverCard[]> {
  const supabase = createServerSupabase();

  const { count } = await supabase.from('restaurants').select('id', { count: 'exact', head: true });
  const total = count ?? 0;
  const windowSize = Math.min(300, total || 300);
  const maxOffset = Math.max(0, total - windowSize);
  const offset = Math.floor(Math.random() * (maxOffset + 1));

  const { data: idRows } = await supabase
    .from('restaurants')
    .select('id')
    .range(offset, offset + windowSize - 1);

  const ids = shuffle(idRows ?? []).slice(0, limit).map((r) => r.id);
  if (ids.length === 0) return [];

  const [{ data: restaurants }, { data: cuisineLinks }, { data: photos }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, slug, address, halal_classification')
      .in('id', ids),
    supabase.from('restaurant_cuisines').select('restaurant_id, cuisines(name)').in('restaurant_id', ids),
    supabase
      .from('restaurant_photos')
      .select('restaurant_id, storage_path, is_primary')
      .in('restaurant_id', ids)
      .order('is_primary', { ascending: false }),
  ]);

  const cuisinesByRestaurant = new Map<string, string[]>();
  for (const link of cuisineLinks ?? []) {
    const name = Array.isArray(link.cuisines) ? link.cuisines[0]?.name : (link.cuisines as { name: string } | null)?.name;
    if (!name) continue;
    if (!cuisinesByRestaurant.has(link.restaurant_id)) cuisinesByRestaurant.set(link.restaurant_id, []);
    cuisinesByRestaurant.get(link.restaurant_id)!.push(name);
  }

  const photoByRestaurant = new Map<string, string>();
  for (const p of photos ?? []) {
    if (!photoByRestaurant.has(p.restaurant_id)) photoByRestaurant.set(p.restaurant_id, p.storage_path);
  }

  const byId = new Map((restaurants ?? []).map((r) => [r.id, r]));

  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      address: r.address,
      halal_classification: r.halal_classification as HalalClassification,
      cuisines: cuisinesByRestaurant.get(r.id) ?? [],
      photoUrl: photoByRestaurant.get(r.id) ?? null,
    }));
}
