import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { EvidenceStrength, HalalClassification } from './types';

// Area pages are public and identical for every visitor, so they read with a
// cookieless anonymous client and can be cached, unlike search.
function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

/**
 * Fewer listed places than this and a borough gets no page: a page with a
 * handful of entries helps nobody searching and reads as filler to a search
 * engine. Those boroughs are still fully searchable.
 */
export const MIN_AREA_LISTINGS = 12;

export interface AreaSummary {
  borough: string;
  slug: string;
  listed: number;
  fully_halal: number;
  halal_options: number;
  unverified: number;
  anchor_lat: number;
  anchor_lng: number;
  last_checked_at: string | null;
  /** Places in the borough nobody has checked yet. */
  not_checked: number;
}

export interface AreaListing {
  id: string;
  name: string;
  slug: string;
  address: string;
  postcode: string | null;
  halal_classification: HalalClassification;
  halal_evidence_strength: EvidenceStrength | null;
  halal_summary: string | null;
  halal_checked_at: string | null;
  cuisine_label: string | null;
  brand_name: string | null;
  branch_label: string | null;
  lat: number;
  lng: number;
}

export function boroughSlug(borough: string): string {
  return borough.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const getAreas = cache(async function getAreas(): Promise<AreaSummary[]> {
  const { data, error } = await publicClient().rpc('listing_boroughs');
  if (error || !data) return [];
  return (data as Omit<AreaSummary, 'slug'>[]).map((a) => ({ ...a, slug: boroughSlug(a.borough) }));
});

/** Boroughs with enough listed places to deserve a page. */
export async function getAreasWithPages(): Promise<AreaSummary[]> {
  return (await getAreas()).filter((a) => a.listed >= MIN_AREA_LISTINGS);
}

export const getAreaBySlug = cache(async function getAreaBySlug(slug: string) {
  const area = (await getAreasWithPages()).find((a) => a.slug === slug);
  if (!area) return null;
  const { data } = await publicClient().rpc('borough_listings', { p_borough: area.borough });
  return { area, listings: (data ?? []) as AreaListing[] };
});
