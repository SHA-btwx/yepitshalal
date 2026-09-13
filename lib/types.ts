export type HalalClassification = 'fully_halal' | 'halal_options' | 'unverified';

export type TriState = boolean | null;

export interface SearchResultRestaurant {
  id: string;
  name: string;
  slug: string;
  address: string;
  lat: number;
  lng: number;
  halal_classification: HalalClassification;
  distance_meters: number;
  primary_photo_path: string | null;
  cuisines: string[] | null;
  effective_radius_meters: number;
  is_yep_plus: boolean;
  /** Set when this location belongs to a multi-branch brand. */
  brand_name: string | null;
  /** The neighbourhood or street that distinguishes this branch. */
  branch_label: string | null;
}

export interface RestaurantDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  postcode: string | null;
  phone: string | null;
  website_url: string | null;
  menu_url: string | null;
  halal_classification: HalalClassification;
  lat: number;
  lng: number;
}

export interface HalalFactsPublic {
  restaurant_id: string;
  all_meat_halal: TriState;
  halal_meat_types: string[] | null;
  serves_non_halal_meat: TriState;
  serves_pork: TriState;
  serves_alcohol: TriState;
  has_certification: TriState;
  certification_body: string | null;
  verified_at: string | null;
  last_verified_at: string | null;
  next_review_due_at: string | null;
  last_outcome: 'verified' | 'unable_to_verify' | null;
  verification_state: 'current' | 'due' | 'overdue' | 'unable_to_verify' | 'never_verified';
}

export interface RestaurantPhoto {
  id: string;
  storage_path: string;
  type: 'exterior' | 'interior' | 'food' | 'menu';
  is_primary: boolean;
}

export interface RestaurantVideo {
  id: string;
  provider: 'instagram' | 'tiktok' | 'youtube';
  embed_url: string;
  caption: string | null;
}

export interface OpeningHour {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export const RADIUS_OPTIONS_MILES = [1, 2, 5, 10, 25, 50] as const;

export const FREE_RADIUS_METERS = {
  current_location: 1609,
  searched_location: 805,
} as const;

/** Ceiling for a Yep+ search. Mirrors v_max_radius in search_restaurants(). */
export const YEP_PLUS_MAX_RADIUS_METERS = 80467;

export type SearchMode = 'current_location' | 'searched_location';

export function milesToMeters(miles: number): number {
  return Math.round(miles * 1609.34);
}

/**
 * The radius the search *actually* used, which is not always the one requested.
 *
 * search_restaurants() clamps every request to the caller's ceiling
 * (`least(requested, max)`), so "Anywhere" (sent as 999 miles) comes back as a
 * 50 mile search, and any locked tier a free user reaches comes back capped.
 * Drawing coverage from the requested value would put a 999 mile ring on the map.
 *
 * This mirrors that clamp so the client can derive the true radius without a
 * result row to read it from, which matters most in the case where the map has
 * the most to say: a search that found nothing.
 */
export function effectiveRadiusMeters(options: {
  requestedMiles: number | null;
  mode: SearchMode;
  isYepPlus: boolean;
}): number {
  const { requestedMiles, mode, isYepPlus } = options;
  const max = isYepPlus ? YEP_PLUS_MAX_RADIUS_METERS : FREE_RADIUS_METERS[mode];
  if (requestedMiles === null) return max;
  return Math.min(milesToMeters(requestedMiles), max);
}

/** "0.5 mi" / "50 mi". Used for the radius chips and the map's coverage label. */
export function formatRadiusMiles(meters: number): string {
  const miles = meters / 1609.34;
  const rounded = miles < 10 ? Math.round(miles * 10) / 10 : Math.round(miles);
  return `${rounded} mi`;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Real uploads live in Supabase Storage; any Unsplash URL is a licensed
// cuisine-representative placeholder we assigned, not the restaurant's own
// photo — flagged in the UI so it's never mistaken for one.
export function isStockPhoto(url: string): boolean {
  return url.includes('images.unsplash.com');
}
