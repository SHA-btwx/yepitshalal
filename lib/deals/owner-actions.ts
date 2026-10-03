'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRestaurantAccess } from '@/lib/require-restaurant';
import { dealsDb } from '@/lib/deals/db';
import { getStripe } from '@/lib/stripe';
import { SITE_URL } from '@/lib/site';
import { buildDeal } from './terms';
import { ownerError } from './messages';
import { CAP_MAX_PENCE, CAP_MIN_PENCE, TERMS_VERSION, TOPUP_PACKS, money, type TopupPence } from './rules';
import { readyPrice } from './topups';

// Every action checks access itself: a Server Action can be called over the
// network without its page ever loading. requireRestaurantAccess lets the
// restaurant's owner in, and an admin (for support).

export type OwnerState =
  | { status: 'idle' }
  | { status: 'saved'; message: string }
  | { status: 'error'; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function access(formData: FormData) {
  const restaurantId = String(formData.get('restaurant_id') ?? '');
  if (!UUID.test(restaurantId)) throw new Error('Restaurant not found.');
  const who = await requireRestaurantAccess(restaurantId);
  const { data: r } = await dealsDb()
    .from('restaurants')
    .select('id, name, slug')
    .eq('id', restaurantId)
    .maybeSingle();
  if (!r) throw new Error('Restaurant not found.');
  return { ...who, restaurant: r as { id: string; name: string; slug: string } };
}

function refresh(slug: string) {
  revalidatePath(`/manage/${slug}/deals`);
  revalidatePath(`/manage/${slug}/poster`);
  revalidatePath(`/restaurant/${slug}`);
  revalidatePath('/admin/deals', 'layout');
}

function readPin(formData: FormData, name = 'pin'): string {
  return String(formData.get(name) ?? '').replace(/\D/g, '');
}

/** Starts a deal, or replaces the running one. Sets the PIN the first time. */
export async function saveDeal(_prev: OwnerState, formData: FormData): Promise<OwnerState> {
  let who;
  try {
    who = await access(formData);
  } catch (e) {
    return { status: 'error', message: (e as Error).message };
  }

  const built = buildDeal(formData);
  if (!built.ok) return { status: 'error', message: built.error };
  if (formData.get('accept') !== 'on') {
    return { status: 'error', message: 'Tick the box to say you agree to the deal terms.' };
  }

  const db = dealsDb();
  const { data: pinRow } = await db
    .from('restaurant_staff_pin')
    .select('restaurant_id')
    .eq('restaurant_id', who.restaurant.id)
    .maybeSingle();

  if (!pinRow) {
    const pin = readPin(formData);
    if (pin.length !== 4) return { status: 'error', message: 'Pick a 4 number PIN for your staff.' };
    if (pin !== readPin(formData, 'pin_again')) return { status: 'error', message: 'The two PINs do not match.' };
    const { error } = await db.rpc('set_staff_pin', { p_restaurant_id: who.restaurant.id, p_pin: pin });
    if (error) return { status: 'error', message: ownerError(error.message, error.hint) };
  }

  const d = built.input;
  const { data, error } = await db.rpc('start_deal', {
    p_restaurant_id: who.restaurant.id,
    p_kind: d.kind,
    p_item: d.item,
    p_percent_off: d.percentOff,
    p_min_spend_pence: d.minSpendPence,
    p_quiet_days: d.quietDays,
    p_quiet_start: d.quietStart,
    p_quiet_end: d.quietEnd,
    p_title: built.title,
    p_terms_version: TERMS_VERSION,
    p_accepted_by: who.userId,
  });
  if (error) return { status: 'error', message: ownerError(error.message, error.hint) };

  refresh(who.restaurant.slug);
  const granted = (data as { granted?: boolean } | null)?.granted;
  return {
    status: 'saved',
    message: granted ? 'Your deal is live. We added £10 of free credit.' : 'Your deal is live.',
  };
}

export async function changePin(_prev: OwnerState, formData: FormData): Promise<OwnerState> {
  let who;
  try {
    who = await access(formData);
  } catch (e) {
    return { status: 'error', message: (e as Error).message };
  }
  const pin = readPin(formData);
  if (pin.length !== 4) return { status: 'error', message: 'A PIN is 4 numbers.' };
  if (pin !== readPin(formData, 'pin_again')) return { status: 'error', message: 'The two PINs do not match.' };
  const { error } = await dealsDb().rpc('set_staff_pin', { p_restaurant_id: who.restaurant.id, p_pin: pin });
  if (error) return { status: 'error', message: ownerError(error.message, error.hint) };
  refresh(who.restaurant.slug);
  return { status: 'saved', message: 'New PIN saved. Tell your staff. The old one stopped working.' };
}

export async function setCap(_prev: OwnerState, formData: FormData): Promise<OwnerState> {
  let who;
  try {
    who = await access(formData);
  } catch (e) {
    return { status: 'error', message: (e as Error).message };
  }
  const pounds = Number(String(formData.get('cap') ?? '').replace(/[£,\s]/g, ''));
  const pence = Math.round(pounds * 100);
  if (!Number.isFinite(pounds) || pence < CAP_MIN_PENCE || pence > CAP_MAX_PENCE) {
    return { status: 'error', message: `Pick a number from ${money(CAP_MIN_PENCE)} to ${money(CAP_MAX_PENCE)}.` };
  }
  const { error } = await dealsDb().rpc('set_deal_cap', { p_restaurant_id: who.restaurant.id, p_cap_pence: pence });
  if (error) return { status: 'error', message: ownerError(error.message, error.hint) };
  refresh(who.restaurant.slug);
  return { status: 'saved', message: `Saved. You will never pay more than ${money(pence)} in fees in a month.` };
}

/** pause, resume or end, from the owner's deal page. */
export async function ownerDealStatus(formData: FormData): Promise<void> {
  const who = await access(formData);
  const action = String(formData.get('action') ?? '');
  if (!['pause', 'resume', 'end'].includes(action)) return;
  await dealsDb().rpc('set_deal_status', {
    p_restaurant_id: who.restaurant.id,
    p_action: action,
    p_by: 'owner',
  });
  refresh(who.restaurant.slug);
}

/**
 * Opens Stripe Checkout for a credit pack. Live money: the price is checked
 * against the pack before a session exists, and the credit the webhook posts
 * is what Stripe says was paid.
 */
export async function startTopUp(formData: FormData): Promise<void> {
  const who = await access(formData);
  const pence = Number(formData.get('pack')) as TopupPence;
  const back = `/manage/${who.restaurant.slug}/deals`;
  if (!TOPUP_PACKS.some((p) => p.pence === pence)) redirect(`${back}?topup=unavailable`);

  const stripe = getStripe();
  const priceId = await readyPrice(pence);
  if (!stripe || !priceId) redirect(`${back}?topup=unavailable`);

  const { data: u } = await dealsDb().from('users').select('email').eq('id', who.userId).maybeSingle();
  const metadata = {
    yepitshalal_type: 'deal_credit',
    restaurant_id: who.restaurant.id,
    pack_pence: String(pence),
    user_id: who.userId,
  };
  const session = await stripe!.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId!, quantity: 1 }],
    customer_email: u?.email || undefined,
    success_url: `${SITE_URL}${back}?topup=done`,
    cancel_url: `${SITE_URL}${back}?topup=cancelled`,
    metadata,
    // Copied by Stripe onto the charge, so a refund can be matched to this
    // restaurant without another lookup.
    payment_intent_data: {
      metadata: { yepitshalal_type: 'deal_credit', restaurant_id: who.restaurant.id },
      description: `YepItsHalal deal credit, ${who.restaurant.name}`,
    },
  });
  if (!session.url) redirect(`${back}?topup=unavailable`);
  redirect(session.url);
}
