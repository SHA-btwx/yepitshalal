import { cache } from 'react';
import { createServerSupabase } from './supabase/server';
import type {
  EvidenceStrength,
  HalalEvidence,
  HalalFactsPublic,
  OpeningHour,
  RestaurantPhoto,
  RestaurantVideo,
} from './types';

export interface SourceLink {
  source: 'fsa' | 'overture' | 'osm' | 'owner_submission';
  source_id: string;
  licence: string | null;
  last_seen_at: string;
}

export interface FullRestaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  postcode: string | null;
  borough: string | null;
  phone: string | null;
  website_url: string | null;
  menu_url: string | null;
  socials: string[];
  halal_classification: 'fully_halal' | 'halal_options' | 'unverified';
  /** Null when there is no current evidence at all. */
  halal_evidence_strength: EvidenceStrength | null;
  halal_summary: string | null;
  halal_checked_at: string | null;
  isListed: boolean;
  catalogueStatus: 'active' | 'temporarily_closed' | 'permanently_closed' | 'needs_review';
  lat: number;
  lng: number;
  cuisines: string[];
  cuisineLabel: string | null;
  brandName: string | null;
  branchLabel: string | null;
  photos: RestaurantPhoto[];
  videos: RestaurantVideo[];
  openingHours: (OpeningHour & { source?: string | null; checked_at?: string | null })[];
  halalFacts: HalalFactsPublic | null;
  evidence: HalalEvidence[];
  sources: SourceLink[];
  offers: {
    id: string;
    title: string;
    description: string | null;
    yep_plus_only: boolean;
    is_early_access: boolean;
    voucher_code: string | null;
  }[];
}

// Strongest and most direct first, so the page can lead with what matters.
const STRENGTH_ORDER: Record<EvidenceStrength, number> = { strong: 0, moderate: 1, weak: 2 };
const KIND_ORDER: Record<string, number> = {
  yepitshalal_check: 0, certification: 1, first_party_statement: 2, certification_claim: 3,
  business_name: 4, community_tag: 5, directory_category: 6, owner_submission: 7, public_submission: 8,
};

// Wrapped in React cache so generateMetadata and the page body share one
// round-trip instead of querying Supabase twice per request.
export const getRestaurantBySlug = cache(async function getRestaurantBySlug(
  slug: string
): Promise<FullRestaurant | null> {
  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants_with_coords')
    .select(
      'id, name, slug, description, address, postcode, borough, phone, website_url, menu_url, socials, halal_classification, halal_evidence_strength, halal_summary, halal_checked_at, is_listed, catalogue_status, lat, lng, branch_label, cuisine_label, brand_id'
    )
    .eq('slug', slug)
    .maybeSingle();

  if (!restaurant) return null;

  const [
    { data: brand },
    { data: cuisineRows },
    { data: photos },
    { data: videos },
    { data: hours },
    { data: facts },
    { data: offers },
    { data: evidence },
    { data: sources },
  ] = await Promise.all([
    restaurant.brand_id
      ? supabase.from('brands').select('name').eq('id', restaurant.brand_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('restaurant_cuisines').select('cuisines(name)').eq('restaurant_id', restaurant.id),
    supabase
      .from('restaurant_photos')
      .select('id, storage_path, type, is_primary')
      .eq('restaurant_id', restaurant.id)
      .order('is_primary', { ascending: false }),
    supabase.from('restaurant_videos').select('id, provider, embed_url, caption').eq('restaurant_id', restaurant.id),
    supabase
      .from('opening_hours')
      .select('day_of_week, open_time, close_time, is_closed, source, checked_at')
      .eq('restaurant_id', restaurant.id)
      .order('day_of_week', { ascending: true })
      .order('open_time', { ascending: true }),
    supabase.from('restaurant_halal_facts_public').select('*').eq('restaurant_id', restaurant.id).maybeSingle(),
    supabase
      .from('offers_public')
      .select('id, title, description, yep_plus_only, is_early_access, voucher_code')
      .eq('restaurant_id', restaurant.id),
    supabase
      .from('restaurant_halal_evidence')
      .select('id, kind, claim, strength, source_name, source_url, excerpt, notes, checked_at')
      .eq('restaurant_id', restaurant.id)
      .eq('is_current', true),
    supabase
      .from('restaurant_source_links')
      .select('source, source_id, licence, last_seen_at')
      .eq('restaurant_id', restaurant.id),
  ]);

  const sortedEvidence = ((evidence ?? []) as HalalEvidence[]).sort(
    (a, b) =>
      STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength] ||
      (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) ||
      b.checked_at.localeCompare(a.checked_at)
  );

  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    address: restaurant.address,
    postcode: restaurant.postcode,
    borough: restaurant.borough ?? null,
    phone: restaurant.phone,
    website_url: restaurant.website_url,
    menu_url: restaurant.menu_url,
    socials: restaurant.socials ?? [],
    halal_classification: restaurant.halal_classification,
    halal_evidence_strength: restaurant.halal_evidence_strength ?? null,
    halal_summary: restaurant.halal_summary ?? null,
    halal_checked_at: restaurant.halal_checked_at ?? null,
    isListed: Boolean(restaurant.is_listed),
    catalogueStatus: restaurant.catalogue_status,
    brandName: (brand as { name: string } | null)?.name ?? null,
    branchLabel: restaurant.branch_label ?? null,
    lat: restaurant.lat,
    lng: restaurant.lng,
    cuisines: (cuisineRows ?? [])
      .map((r: { cuisines: { name: string } | { name: string }[] }) =>
        Array.isArray(r.cuisines) ? r.cuisines[0]?.name : r.cuisines?.name
      )
      .filter(Boolean),
    cuisineLabel: restaurant.cuisine_label ?? null,
    photos: photos ?? [],
    videos: videos ?? [],
    openingHours: hours ?? [],
    halalFacts: facts ?? null,
    evidence: sortedEvidence,
    sources: (sources ?? []) as SourceLink[],
    offers: offers ?? [],
  };
});
