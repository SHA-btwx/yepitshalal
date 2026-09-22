/**
 * One source of truth for what Yep+ costs, and a guard that the checkout
 * actually charges it.
 *
 * Why this file exists, plainly. The page has advertised GBP 2.99 a month and
 * GBP 24 a year since the paywall came off on 2026-09-19. The Stripe price IDs
 * in Vercel are the ones created on 2026-09-04, for the old GBP 4.99 and GBP
 * 39.99 model, and the new prices were never created. The checkout route passes
 * the environment variable straight to Stripe, so the page says one number and
 * the card is charged another, on a livemode account with no sandbox.
 *
 * Nobody has been charged wrongly, because there are no subscriptions. The
 * first person to click would be, and anything that makes the supporter tier
 * more prominent makes that more likely, sooner.
 *
 * So the checkout now asks Stripe what the price actually is and refuses to
 * open a session unless it matches what the page promised. A supporter who
 * cannot pay today is a nuisance. A supporter charged 67% more than the number
 * they read is a broken promise on the one site whose entire argument is that
 * it does not overclaim.
 *
 * Delete the guard the day the Stripe prices are right, or leave it: it costs
 * one cached API call and it can only ever fire when something is wrong.
 */

export type SupporterPlan = 'monthly' | 'annual';

export interface SupporterPrice {
  /** In pence, to compare against Stripe's unit_amount directly. */
  amount: number;
  currency: string;
  /** Stripe's recurring.interval. */
  interval: 'month' | 'year';
  /** Exactly as the page prints it. */
  label: string;
}

export const SUPPORTER_PRICES: Record<SupporterPlan, SupporterPrice> = {
  monthly: { amount: 299, currency: 'gbp', interval: 'month', label: '£2.99' },
  annual: { amount: 2400, currency: 'gbp', interval: 'year', label: '£24' },
};

/** "£2.99 a month", for anywhere that needs the price in a sentence. */
export function supporterPriceSentence(plan: SupporterPlan = 'monthly'): string {
  const p = SUPPORTER_PRICES[plan];
  return plan === 'monthly' ? `${p.label} a month` : `${p.label} a year`;
}

export interface PriceCheck {
  ok: boolean;
  /** Set when it does not match, for the log. Never shown to the visitor. */
  reason?: string;
}

/**
 * Does the Stripe price match what we advertised?
 *
 * Deliberately strict about all three of amount, currency and interval: a
 * monthly price ID sitting in the annual variable would charge the right number
 * at the wrong cadence, which is the same broken promise in a different shape.
 */
export function priceMatches(
  plan: SupporterPlan,
  stripePrice: { unit_amount?: number | null; currency?: string | null; recurring?: { interval?: string } | null }
): PriceCheck {
  const want = SUPPORTER_PRICES[plan];
  if (stripePrice.unit_amount !== want.amount) {
    return { ok: false, reason: `amount ${stripePrice.unit_amount} but the page says ${want.amount}` };
  }
  if ((stripePrice.currency ?? '').toLowerCase() !== want.currency) {
    return { ok: false, reason: `currency ${stripePrice.currency} but the page says ${want.currency}` };
  }
  if (stripePrice.recurring?.interval !== want.interval) {
    return { ok: false, reason: `interval ${stripePrice.recurring?.interval} but the page says ${want.interval}` };
  }
  return { ok: true };
}
