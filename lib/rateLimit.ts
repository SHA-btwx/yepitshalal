import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A cap on how many times one connection can put an email address on a list.
 *
 * The risk is not somebody signing up twice. It is one person or one script
 * putting a hundred other people's addresses on our lists, which would make us
 * the ones sending strangers mail they never asked for. A few per address per
 * day stops that dead and is far more than any real person needs.
 *
 * The IP is never stored. What is stored is a salted SHA-256 of it, truncated,
 * which is enough to count repeats from the same place and not enough to turn
 * back into an address or to check a guess against without the salt. The salt
 * lives in the environment, so the hashes are useless to anybody who gets the
 * table.
 *
 * Known limit, worth stating plainly: a mobile network or a large office puts
 * many people behind one address, so a genuine third person on a shared
 * connection can be turned away on the same day. That is the cost of the cap,
 * and for a waitlist it is the right side to err on. Raise MAX_PER_IP_PER_DAY
 * if that starts happening.
 */

export const MAX_PER_IP_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** What the site says when somebody hits the cap. Never blames them. */
export const RATE_LIMITED_MESSAGE =
  "That's a few from this connection today. If that wasn't you, or you need another, email us and we'll sort it.";

export function ipHashFor(request: Request): string {
  const ip =
    (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown';
  const salt = process.env.SUBMISSION_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || '';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/**
 * True when this connection has already used up its allowance on this table.
 *
 * Fails open: if the count itself errors we let the submission through, because
 * losing a real person's sign-up to a database hiccup is worse than letting a
 * fourth one past.
 */
export async function overIpLimit(
  supabase: SupabaseClient,
  table: string,
  ipHash: string,
  options: { max?: number; windowMs?: number; dateColumn?: string } = {}
): Promise<boolean> {
  const { max = MAX_PER_IP_PER_DAY, windowMs = DAY_MS, dateColumn = 'created_at' } = options;
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte(dateColumn, new Date(Date.now() - windowMs).toISOString());
  if (error) return false;
  return (count ?? 0) >= max;
}
