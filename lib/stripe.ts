import Stripe from 'stripe';

let cached: Stripe | null = null;

// Returns null (never throws) when Stripe isn't configured yet, so every
// caller can degrade gracefully with a "not configured" response instead of
// a 500. This account is LIVE-mode only — nothing here creates a charge
// unless STRIPE_SECRET_KEY is deliberately set.
export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key, { apiVersion: '2024-10-28.acacia' });
  return cached;
}
