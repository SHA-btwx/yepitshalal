import { createServerSupabase } from './supabase/server';
import {
  FREE_RADIUS_METERS,
  RADIUS_OPTIONS_MILES,
  effectiveRadiusMeters,
  milesToMeters,
  type HalalClassification,
  type SearchMode,
  type SearchResultRestaurant,
  type TierCount,
} from './types';

// The one place the app runs a search. The results page renders its first view
// through this and /api/search answers every later change through it, so the
// first paint and every refresh are the same query.
//
// Behind it, in the database, search_restaurants() and search_radius_counts()
// both call search_candidates(). That is why the list, the count, the map ring
// and "Unlock N more" always agree: they are one definition of a match.

/** Every radius the selector offers, smallest first, including the free caps. */
export const TIER_MILES: number[] = [...new Set([0.5, ...RADIUS_OPTIONS_MILES])].sort((a, b) => a - b);

export interface SearchParams {
  lat: number;
  lng: number;
  mode: SearchMode;
  radiusMiles?: number | null;
  classification?: HalalClassification[] | null;
  query?: string | null;
  sort?: 'distance' | 'evidence';
}

export interface SearchResponse {
  results: SearchResultRestaurant[];
  totalCount: number;
  isYepPlus: boolean;
  effectiveRadiusMeters: number;
  tierCounts: TierCount[];
}

export async function runSearch(params: SearchParams): Promise<SearchResponse> {
  const supabase = createServerSupabase();
  const classification = params.classification?.length ? params.classification : null;
  const query = params.query?.trim() ? params.query.trim().slice(0, 80) : null;
  const requested = params.radiusMiles ? milesToMeters(params.radiusMiles) : FREE_RADIUS_METERS[params.mode];

  const [{ data, error }, { data: counts }, { data: isYepPlus }] = await Promise.all([
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
    }),
    supabase.rpc('search_radius_counts', {
      p_lat: params.lat,
      p_lng: params.lng,
      p_radii: TIER_MILES.map(milesToMeters),
      p_classification: classification,
      p_cuisine_ids: null,
      p_query: query,
    }),
    supabase.rpc('is_current_user_yep_plus'),
  ]);

  if (error) throw new Error(error.message);

  const results = (data ?? []) as SearchResultRestaurant[];
  const yep = Boolean(isYepPlus);
  const byMeters = new Map(((counts ?? []) as { radius_meters: number; places: number }[]).map((c) => [c.radius_meters, Number(c.places)]));
  const tierCounts: TierCount[] = TIER_MILES.map((miles) => ({
    miles,
    meters: milesToMeters(miles),
    places: byMeters.get(milesToMeters(miles)) ?? 0,
  }));

  // The server reports the radius it actually used on every row. With no rows,
  // the same clamp the database applies gives the same answer.
  // requestedMiles must be what the query was actually asked for: with no radius
  // given that is the mode's default, not "the maximum".
  const radius =
    results[0]?.effective_radius_meters ??
    effectiveRadiusMeters({
      requestedMiles: params.radiusMiles ?? FREE_RADIUS_METERS[params.mode] / 1609.34,
      mode: params.mode,
      isYepPlus: yep,
    });

  return {
    results,
    totalCount: Number(results[0]?.total_count ?? 0),
    isYepPlus: yep,
    effectiveRadiusMeters: radius,
    tierCounts,
  };
}
