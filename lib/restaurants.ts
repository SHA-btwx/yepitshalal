import { cache } from 'react';
import { createServerSupabase } from './supabase/server';
import type { HalalFactsPublic, OpeningHour, RestaurantPhoto, RestaurantVideo } from './types';

export interface FullRestaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  postcode: string | null;
  phone: string | null;
  website_url: string | null;
  menu_url: string | null;
  halal_classification: 'fully_halal' | 'halal_options' | 'unverified';
  lat: number;
  lng: number;
  cuisines: string[];
  brandName: string | null;
  branchLabel: string | null;
  photos: RestaurantPhoto[];
  videos: RestaurantVideo[];
  openingHours: OpeningHour[];
  halalFacts: HalalFactsPublic | null;
  offers: {
    id: string;
    title: string;
    description: string | null;
    yep_plus_only: boolean;
    is_early_access: boolean;
    voucher_code: string | null;
  }[];
}

// Wrapped in React cache so generateMetadata and the page body share one
// round-trip instead of querying Supabase twice per request.
export const getRestaurantBySlug = cache(async function getRestaurantBySlug(
  slug: string
): Promise<FullRestaurant | null> {
  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants_with_coords')
    .select(
      'id, name, slug, description, address, postcode, phone, website_url, menu_url, halal_classification, lat, lng, branch_label, brands(name)'
    )
    .eq('slug', slug)
    .maybeSingle();

  if (!restaurant) return null;

  const [{ data: cuisineRows }, { data: photos }, { data: videos }, { data: hours }, { data: facts }, { data: offers }] =
    await Promise.all([
      supabase.from('restaurant_cuisines').select('cuisines(name)').eq('restaurant_id', restaurant.id),
      supabase
        .from('restaurant_photos')
        .select('id, storage_path, type, is_primary')
        .eq('restaurant_id', restaurant.id)
        .order('is_primary', { ascending: false }),
      supabase.from('restaurant_videos').select('id, provider, embed_url, caption').eq('restaurant_id', restaurant.id),
      supabase
        .from('opening_hours')
        .select('day_of_week, open_time, close_time, is_closed')
        .eq('restaurant_id', restaurant.id)
        .order('day_of_week', { ascending: true }),
      supabase.from('restaurant_halal_facts_public').select('*').eq('restaurant_id', restaurant.id).maybeSingle(),
      supabase
        .from('offers_public')
        .select('id, title, description, yep_plus_only, is_early_access, voucher_code')
        .eq('restaurant_id', restaurant.id),
    ]);

  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    address: restaurant.address,
    postcode: restaurant.postcode,
    phone: restaurant.phone,
    website_url: restaurant.website_url,
    menu_url: restaurant.menu_url,
    halal_classification: restaurant.halal_classification,
    // PostgREST types an embedded relation as either an object or an array
    // depending on the inferred cardinality, so both shapes are handled.
    brandName: (() => {
      const b = (restaurant as { brands?: { name: string } | { name: string }[] | null }).brands;
      if (!b) return null;
      return Array.isArray(b) ? b[0]?.name ?? null : b.name;
    })(),
    branchLabel: restaurant.branch_label ?? null,
    lat: restaurant.lat,
    lng: restaurant.lng,
    cuisines: (cuisineRows ?? [])
      .map((r: { cuisines: { name: string } | { name: string }[] }) =>
        Array.isArray(r.cuisines) ? r.cuisines[0]?.name : r.cuisines?.name
      )
      .filter(Boolean),
    photos: photos ?? [],
    videos: videos ?? [],
    openingHours: hours ?? [],
    halalFacts: facts ?? null,
    offers: offers ?? [],
  };
});
