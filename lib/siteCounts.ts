import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

/**
 * The handful of numbers the site says about itself out loud.
 *
 * Queried rather than written down, for one reason: the honest ones move. The
 * count of places we have checked ourselves is zero today and the introduction
 * says so. The day that becomes one, the site should say one, without anybody
 * remembering to come back and edit a string. A hardcoded "0 visited" would
 * quietly become a lie the moment the work starts.
 *
 * Cached per request, and the page that uses them revalidates hourly, so this
 * is five counts an hour rather than five per visitor.
 */

export interface SiteCounts {
  searchable: number;
  withEvidence: number;
  boroughs: number;
  prayerSpaces: number;
  checkedByUs: number;
}

function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

/** Falls back to nothing rather than to invented numbers: the caller hides the facts. */
export const getSiteCounts = cache(async function getSiteCounts(): Promise<SiteCounts | null> {
  const sb = publicClient();
  try {
    const [searchable, withEvidence, prayerSpaces, checkedByUs, boroughs] = await Promise.all([
      sb.from('restaurants').select('id', { count: 'exact', head: true }).eq('is_searchable', true),
      sb.from('restaurants').select('id', { count: 'exact', head: true }).eq('is_listed', true),
      sb.from('prayer_spaces').select('id', { count: 'exact', head: true }),
      sb.from('restaurants').select('id', { count: 'exact', head: true }).eq('checked_by_us', true),
      sb.rpc('listing_boroughs'),
    ]);

    if (searchable.error || withEvidence.error) return null;

    return {
      searchable: searchable.count ?? 0,
      withEvidence: withEvidence.count ?? 0,
      prayerSpaces: prayerSpaces.count ?? 0,
      checkedByUs: checkedByUs.count ?? 0,
      boroughs: Array.isArray(boroughs.data) ? boroughs.data.length : 0,
    };
  } catch {
    return null;
  }
});
