import { cache } from 'react';
import { dealsDb } from '@/lib/deals/db';
import { statusFor } from '@/lib/halalPages';
import type { HalalStatus } from '@/lib/types';
import type { DealRow, DealState } from './rules';

/**
 * Reads for the deal screens. All through the service role: the tables have
 * no public access at all (0052). Each read fails soft, so a restaurant page
 * still draws if the deals tables are missing or the database hiccups: it
 * just shows no deal.
 */

export const getDealState = cache(async (restaurantId: string): Promise<DealState | null> => {
  try {
    const { data, error } = await dealsDb().rpc('deal_state', { p_restaurant_id: restaurantId });
    if (error || !data) return null;
    return data as DealState;
  } catch {
    return null;
  }
});

/** The deal a diner can claim right now, or null. */
export async function getClaimableDeal(restaurantId: string): Promise<DealRow | null> {
  const state = await getDealState(restaurantId);
  return state?.state === 'live' ? state.deal : null;
}

export interface ClaimView {
  id: string;
  code: string;
  status: 'claimed' | 'redeemed' | 'expired' | 'void';
  source: 'site' | 'qr';
  device_hash: string | null;
  created_at: string;
  expires_at: string;
  redeemed_at: string | null;
  reported_at: string | null;
  deal: DealRow;
  restaurant: { id: string; name: string; slug: string; label: HalalStatus | null };
}

/** A code and everything its screen shows. */
export async function getClaim(code: string): Promise<ClaimView | null> {
  if (!/^[2-9A-HJ-NP-Z]{6}$/i.test(code)) return null;
  try {
    const db = dealsDb();
    const { data: claim } = await db
      .from('deal_claims')
      .select('id, code, status, source, device_hash, created_at, expires_at, redeemed_at, reported_at, deal_id, restaurant_id')
      .eq('code', code.toUpperCase())
      .maybeSingle();
    if (!claim) return null;
    const [{ data: deal }, { data: r }] = await Promise.all([
      db.from('deals').select('*').eq('id', claim.deal_id).maybeSingle(),
      db
        .from('restaurants')
        .select('id, name, slug, branch_label, halal_classification, is_listed, is_searchable')
        .eq('id', claim.restaurant_id)
        .maybeSingle(),
    ]);
    if (!deal || !r) return null;
    const isExpired = claim.status === 'claimed' && new Date(claim.expires_at).getTime() <= Date.now();
    return {
      ...claim,
      status: isExpired ? 'expired' : claim.status,
      deal: deal as DealRow,
      restaurant: {
        id: r.id,
        name: r.branch_label ? `${r.name}, ${r.branch_label}` : r.name,
        slug: r.slug,
        label: statusFor({
          isListed: !!r.is_listed,
          isSearchable: !!r.is_searchable,
          halal_classification: r.halal_classification,
        }),
      },
    } as ClaimView;
  } catch {
    return null;
  }
}

export interface OwnedRestaurant {
  id: string;
  name: string;
  slug: string;
  branch_label: string | null;
  is_listed: boolean | null;
}

export async function getOwnedRestaurants(userId: string): Promise<OwnedRestaurant[]> {
  const { data } = await dealsDb()
    .from('restaurants')
    .select('id, name, slug, branch_label, is_listed')
    .eq('owner_id', userId)
    .order('name');
  return (data ?? []) as OwnedRestaurant[];
}

/** The owner's email, for the deal emails. */
export async function ownerEmailFor(restaurantId: string): Promise<{ email: string; name: string; slug: string } | null> {
  const db = dealsDb();
  const { data: r } = await db.from('restaurants').select('owner_id, name, slug').eq('id', restaurantId).maybeSingle();
  if (!r?.owner_id) return null;
  const { data: u } = await db.from('users').select('email').eq('id', r.owner_id).maybeSingle();
  return u?.email ? { email: u.email, name: r.name, slug: r.slug } : null;
}
