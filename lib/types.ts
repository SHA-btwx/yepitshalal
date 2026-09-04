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

export function milesToMeters(miles: number): number {
  return Math.round(miles * 1609.34);
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Real uploads live in Supabase Storage; any Unsplash URL is a licensed
// cuisine-representative placeholder we assigned, not the restaurant's own
// photo — flagged in the UI so it's never mistaken for one.
export function isStockPhoto(url: string): boolean {
  return url.includes('images.unsplash.com');
}
