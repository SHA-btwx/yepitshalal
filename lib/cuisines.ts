import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { AreaListing } from './areas';

// Browsing by kind of food, the other half of how people look for dinner.
//
// "Halal near me" and "halal in Tower Hamlets" were both answerable. "Halal
// kebab" was not, without typing into a filter box, and every directory in this
// category leads with the dish rather than the postcode. These pages are the
// borough pages again, keyed on what is being eaten.
//
// Public and identical for every visitor, so they read with a cookieless client
// and can be cached, the same way the area pages do.

function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

export interface CuisineSummary {
  cuisine: string;
  slug: string;
  listed: number;
  fully_halal: number;
  halal_options: number;
  unverified: number;
  not_checked: number;
}

/** A listing on a cuisine page: an area listing, plus where it is. */
export type CuisineListing = AreaListing & { borough: string | null };

export function cuisineSlug(cuisine: string): string {
  return cuisine
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Every kind of food with enough places behind it to be worth a page.
 *
 * The floor is in the database (15 listed places). A page for a cuisine with
 * four entries helps nobody choosing dinner and reads as filler to a search
 * engine, which is the same rule the borough pages follow.
 */
export const getCuisines = cache(async function getCuisines(): Promise<CuisineSummary[]> {
  const { data, error } = await publicClient().rpc('listing_cuisines');
  if (error || !data) return [];
  return (data as Omit<CuisineSummary, 'slug'>[]).map((c) => ({ ...c, slug: cuisineSlug(c.cuisine) }));
});

export const getCuisineBySlug = cache(async function getCuisineBySlug(slug: string) {
  const cuisine = (await getCuisines()).find((c) => c.slug === slug);
  if (!cuisine) return null;
  const { data } = await publicClient().rpc('cuisine_listings', { p_cuisine: cuisine.cuisine });
  return { cuisine, listings: (data ?? []) as CuisineListing[] };
});
