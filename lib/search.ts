import { createServerSupabase } from './supabase/server';
import {
  DEFAULT_RADIUS_METERS,
  RADIUS_OPTIONS_MILES,
  effectiveRadiusMeters,
  milesToMeters,
  type HalalStatus,
  type SearchMode,
  type SearchResultRestaurant,
  type TierCount,
} from './types';

// The one place the app runs a search. The results page renders its first view
// through this and /api/search answers every later change through it, so the
// first paint and every refresh are the same query.
//
// Behind it, in the database, search_restaurants() and search_radius_counts()
// both call search_candidates(). That is why the list, the count and the map
// ring always agree: they are one definition of a match.
//
// Search is the same for everyone. There is no radius entitlement: anybody can
// look anywhere in London, signed in or not. See migration 0033.
//
// Search includes places nobody has checked yet ("Worth asking"), alongside
// places with halal evidence. Each result carries halal_status to tell them apart,
// and each radius count says how many of its places have evidence.

/** Every radius the selector offers, smallest first. */
export const TIER_MILES: number[] = [...RADIUS_OPTIONS_MILES].sort((a, b) => a - b);

export interface SearchParams {
  lat: number;
  lng: number;
  mode: SearchMode;
  radiusMiles?: number | null;
  classification?: HalalStatus[] | null;
  query?: string | null;
  sort?: 'distance' | 'evidence';
}

export interface SearchResponse {
  results: SearchResultRestaurant[];
  totalCount: number;
  effectiveRadiusMeters: number;
  tierCounts: TierCount[];
}

export async function runSearch(params: SearchParams): Promise<SearchResponse> {
  const supabase = createServerSupabase();
  const classification = params.classification?.length ? params.classification : null;
  const query = params.query?.trim() ? params.query.trim().slice(0, 80) : null;
  const requested = params.radiusMiles ? milesToMeters(params.radiusMiles) : DEFAULT_RADIUS_METERS;

  const [{ data, error }, { data: counts }] = await Promise.all([
    supabase.rpc('search_restaurants', {
      p_lat: params.lat,
      p_lng: params.lng,
      p_radius_meters: requested,
      p_mode: params.mode,
      p_classification: classification,
      p_cuisine_ids: null,
      p_query: query,
      p_limit: 500,
      p_offset: 0,
      p_sort: params.sort ?? 'distance',
      p_include_candidates: true,
    }),
    supabase.rpc('search_radius_counts', {
      p_lat: params.lat,
      p_lng: params.lng,
      p_radii: TIER_MILES.map(milesToMeters),
      p_classification: classification,
      p_cuisine_ids: null,
      p_query: query,
      p_include_candidates: true,
    }),
  ]);

  if (error) throw new Error(error.message);

  const results = (data ?? []) as SearchResultRestaurant[];
  const byMeters = new Map(
    ((counts ?? []) as { radius_meters: number; places: number; with_evidence: number }[]).map((c) => [c.radius_meters, c])
  );
  const tierCounts: TierCount[] = TIER_MILES.map((miles) => {
    const c = byMeters.get(milesToMeters(miles));
    return { miles, meters: milesToMeters(miles), places: Number(c?.places ?? 0), withEvidence: Number(c?.with_evidence ?? 0) };
  });

  // The server reports the radius it actually used on every row. With no rows,
  // the same clamp the database applies gives the same answer.
  const radius = results[0]?.effective_radius_meters ?? effectiveRadiusMeters(params.radiusMiles ?? null);

  return {
    results,
    totalCount: Number(results[0]?.total_count ?? 0),
    effectiveRadiusMeters: radius,
    tierCounts,
  };
}
