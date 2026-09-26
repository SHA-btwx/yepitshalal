import { createAdminSupabase } from './supabase/admin';
import { FOUNDERS_CAP, type Availability } from './founders';

// Server only: reads through the service role. Never import this from a
// client component.

/**
 * The live Founder count, read from the database on every call. Null when it
 * cannot be read, so the page says it could not load the count rather than
 * showing a number nobody measured.
 */
export async function getFounderAvailability(): Promise<Availability | null> {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.rpc('founder_availability');
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as { claimed: number; cap: number } | undefined;
    if (!row) return null;
    const claimed = Number(row.claimed);
    const cap = Number(row.cap) || FOUNDERS_CAP;
    return Number.isFinite(claimed) ? { claimed, cap } : null;
  } catch {
    return null;
  }
}
