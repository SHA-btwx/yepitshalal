import { unstable_cache } from 'next/cache';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { TOPUP_PACKS, type TopupPence } from './rules';

/**
 * Can a restaurant pay for credit right now?
 *
 * Each pack's Stripe price comes from an environment variable
 * (STRIPE_PRICE_DEAL_CREDIT_25 and _50). The account is live only, so the
 * price is checked before anything is offered: it must exist, be active, be
 * a one off payment, and be exactly the amount the button says, in pounds.
 * Anything else and the pack is not offered: the free £10 still works. Read
 * only, cached ten minutes, so the day the prices are set the buttons switch
 * on by themselves. The top up action checks again before it opens Checkout.
 */

export function priceFits(pence: TopupPence, price: Stripe.Price): boolean {
  return (
    price.active &&
    price.type === 'one_time' &&
    price.currency === 'gbp' &&
    price.unit_amount === pence &&
    // A live key with a live price. A sandbox price can never reach the live site.
    price.livemode === !(process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_')
  );
}

export async function readyPrice(pence: TopupPence): Promise<string | null> {
  const stripe = getStripe();
  const pack = TOPUP_PACKS.find((p) => p.pence === pence);
  const priceId = pack ? process.env[pack.env] : undefined;
  if (!stripe || !priceId) return null;
  try {
    const price = await stripe.prices.retrieve(priceId);
    return priceFits(pence, price) ? priceId : null;
  } catch {
    return null;
  }
}

async function check(): Promise<TopupPence[]> {
  const ready: TopupPence[] = [];
  for (const pack of TOPUP_PACKS) if (await readyPrice(pack.pence)) ready.push(pack.pence);
  return ready;
}

export const readyTopups = unstable_cache(check, ['deal-topups-ready'], { revalidate: 600 });
