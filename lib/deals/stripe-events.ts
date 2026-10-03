import type Stripe from 'stripe';

/**
 * The deal side of the Stripe webhook (app/api/webhooks/stripe/route.ts).
 * Kept apart from the route, with the database call passed in, so the tests
 * can run real signed events through it against a throwaway database.
 *
 * Both writes are idempotent in the database (0052): a top up is keyed on
 * the Checkout Session, a refund on the charge and its running total. So
 * Stripe retrying an event, or sending two at once, posts once. Anything that
 * fails throws, and the route answers 500, so Stripe tries again later.
 */

export type DealRpc = (
  fn: 'post_deal_topup' | 'post_deal_refund',
  args: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

export type DealEventResult = 'topup_posted' | 'topup_seen' | 'refund_posted' | 'refund_seen' | 'not_deal' | 'not_paid';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDealCheckout(session: Stripe.Checkout.Session): boolean {
  return session.mode === 'payment' && session.metadata?.yepitshalal_type === 'deal_credit';
}

export async function handleDealCheckout(session: Stripe.Checkout.Session, rpc: DealRpc): Promise<DealEventResult> {
  if (!isDealCheckout(session)) return 'not_deal';
  // Cards settle at once. Anything still unpaid is not credit yet.
  if (session.payment_status !== 'paid') return 'not_paid';

  const restaurantId = session.metadata?.restaurant_id ?? '';
  if (!UUID.test(restaurantId)) throw new Error(`deal_credit session ${session.id} has no restaurant`);
  if ((session.currency ?? '').toLowerCase() !== 'gbp') throw new Error(`deal_credit session ${session.id} is not in GBP`);
  // The credit is what was actually paid, not what the button said.
  const amount = session.amount_total ?? 0;
  if (amount <= 0) throw new Error(`deal_credit session ${session.id} has no amount`);

  const { data, error } = await rpc('post_deal_topup', {
    p_restaurant_id: restaurantId,
    p_session_id: session.id,
    p_amount_pence: amount,
  });
  if (error) throw new Error(`post_deal_topup: ${error.message}`);
  return (data as { posted?: boolean } | null)?.posted ? 'topup_posted' : 'topup_seen';
}

/**
 * A refund of a top up takes that credit back. Stripe copies the
 * PaymentIntent's metadata onto the charge, which is how this knows it is a
 * deal payment without asking Stripe anything.
 */
export async function handleDealRefund(charge: Stripe.Charge, rpc: DealRpc): Promise<DealEventResult> {
  if (charge.metadata?.yepitshalal_type !== 'deal_credit') return 'not_deal';
  const restaurantId = charge.metadata.restaurant_id ?? '';
  if (!UUID.test(restaurantId)) throw new Error(`deal_credit charge ${charge.id} has no restaurant`);
  if (!charge.amount_refunded || charge.amount_refunded <= 0) return 'refund_seen';

  const { data, error } = await rpc('post_deal_refund', {
    p_restaurant_id: restaurantId,
    p_charge_id: charge.id,
    p_refunded_total_pence: charge.amount_refunded,
  });
  if (error) throw new Error(`post_deal_refund: ${error.message}`);
  return (data as { posted?: boolean } | null)?.posted ? 'refund_posted' : 'refund_seen';
}
