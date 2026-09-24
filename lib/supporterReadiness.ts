import { unstable_cache } from 'next/cache';
import { getStripe } from './stripe';
import { priceMatches } from './supporterPricing';

// Can a supporter actually pay the price the page shows, right now?
//
// The checkout route already refuses any session whose Stripe price does not
// match the advertised amount, currency and interval (the price guard, see
// lib/supporterPricing). That protects the card, but it only speaks after
// somebody has pressed the button. Until the GBP 2.99 and GBP 24 prices exist
// in Stripe, pressing it can only ever end in "we stopped that", so the page
// should not offer it as if it works.
//
// This asks the same question the route asks, the same way, before the page
// is drawn. It only reads prices: nothing here creates a session or a charge.
// Cached for ten minutes, so the day the prices are fixed the buttons switch
// on by themselves, and a Stripe hiccup cannot pin them off for long. Any
// doubt at all answers "not ready": the route's guard still stands behind it.

async function check(): Promise<boolean> {
  const stripe = getStripe();
  const monthly = process.env.STRIPE_PRICE_YEP_PLUS_MONTHLY;
  const annual = process.env.STRIPE_PRICE_YEP_PLUS_ANNUAL;
  if (!stripe || !monthly || !annual) return false;
  try {
    const [m, a] = await Promise.all([stripe.prices.retrieve(monthly), stripe.prices.retrieve(annual)]);
    return m.active && a.active && priceMatches('monthly', m).ok && priceMatches('annual', a).ok;
  } catch {
    return false;
  }
}

export const supporterPaymentsReady = unstable_cache(check, ['supporter-payments-ready'], { revalidate: 600 });
