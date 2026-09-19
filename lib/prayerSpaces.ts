import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

// Mosques and prayer rooms: a separate thing from the restaurant catalogue, on
// purpose. It answers "where can I pray", and nothing in it may ever affect
// whether food is called halal. The two meet in exactly one place: a restaurant
// page says how far the nearest one is to walk.
//
// The data is OpenStreetMap (ODbL), credited wherever it is shown.

function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

export interface PrayerSpace {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  postcode: string | null;
  borough: string | null;
  kind: string;
  website_url: string | null;
  has_womens_area: boolean | null;
  wheelchair: boolean | null;
  lat: number;
  lng: number;
  distance_meters: number;
}

/**
 * Roughly how long that is on foot.
 *
 * The distance we hold is a straight line, and streets are not straight, so it
 * is scaled by a third before being turned into minutes at a normal walking
 * pace. That is an estimate and the interface says "about", because the honest
 * alternative would be a routing service we do not run.
 */
export function walkingMinutes(meters: number): number {
  const WALKING_METRES_PER_MINUTE = 80;
  const STREETS_ARE_NOT_STRAIGHT = 1.3;
  return Math.max(1, Math.round((meters * STREETS_ARE_NOT_STRAIGHT) / WALKING_METRES_PER_MINUTE));
}

/** "250 m" / "1.2 km", for the distance beside the walk. */
export function formatMetres(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export const getNearestPrayerSpaces = cache(async function getNearestPrayerSpaces(
  lat: number,
  lng: number,
  limit = 3,
  radiusMeters = 3000
): Promise<PrayerSpace[]> {
  const { data, error } = await publicClient().rpc('nearest_prayer_spaces', {
    p_lat: lat,
    p_lng: lng,
    p_limit: limit,
    p_radius_meters: radiusMeters,
  });
  if (error || !data) return [];
  return data as PrayerSpace[];
});

export const getPrayerSpaceBoroughs = cache(async function getPrayerSpaceBoroughs(): Promise<
  { borough: string; spaces: number }[]
> {
  const { data, error } = await publicClient().rpc('prayer_space_boroughs');
  if (error || !data) return [];
  return data as { borough: string; spaces: number }[];
});

export async function countPrayerSpaces(): Promise<number> {
  const { count } = await publicClient().from('prayer_spaces').select('id', { count: 'exact', head: true });
  return count ?? 0;
}
