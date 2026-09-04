import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { addWorkingHours } from '@/lib/workingHours';

// This is the ONLY place `subscriptions` is ever written from the Stripe side —
// search_restaurants() and offers_public read that table directly, never Stripe,
// so this handler being correct is what keeps radius/voucher entitlement honest.
export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook not configured.' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === 'subscription') {
        const userId = session.metadata?.yepitshalal_user_id || session.client_reference_id;
        if (!userId || !session.subscription || !session.customer) break;
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await upsertSubscription(userId, subscription);
        break;
      }

      if (session.mode === 'payment' && session.metadata?.yepitshalal_type === 'priority_verification') {
        // Idempotent: a Stripe retry of this same event must not create a
        // second verification_requests row for the same payment.
        const { data: existing } = await supabase
          .from('verification_requests')
          .select('id')
          .eq('stripe_payment_id', session.id)
          .maybeSingle();
        if (existing) break;

        const { data: holidays } = await supabase.from('uk_bank_holidays').select('holiday_date');
        const bankHolidays = new Set((holidays ?? []).map((h) => h.holiday_date));
        const slaDueAt = addWorkingHours(new Date(), 48, bankHolidays);

        await supabase.from('verification_requests').insert({
          restaurant_id: session.metadata.restaurant_id,
          queue_type: 'priority',
          status: 'queued',
          stripe_payment_id: session.id,
          sla_due_at: slaDueAt.toISOString(),
          contact_name: session.metadata.contact_name || null,
          contact_email: session.metadata.contact_email || null,
        });
      }
      break;
    }

    // Covers renewals, cancellations, plan changes, and payment-failure status
    // changes — the same upsert path as the initial checkout.
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.yepitshalal_user_id;
      if (!userId) break;
      await upsertSubscription(userId, subscription);
      break;
    }

    // Refunds are only ever initiated manually by an admin (from the Stripe
    // dashboard, per §16 — payment purchases priority, not a guaranteed
    // outcome, so this never happens automatically). This just reflects that
    // decision back into our own records once it happens.
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      if (typeof charge.payment_intent === 'string') {
        const session = await stripe.checkout.sessions
          .list({ payment_intent: charge.payment_intent, limit: 1 })
          .then((r) => r.data[0]);
        if (session) {
          await supabase
            .from('verification_requests')
            .update({ refund_status: 'issued' })
            .eq('stripe_payment_id', session.id);
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });

  async function upsertSubscription(userId: string, subscription: Stripe.Subscription) {
    const item = subscription.items.data[0];
    const plan = item?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
    const status =
      subscription.status === 'active'
        ? 'active'
        : subscription.status === 'past_due'
        ? 'past_due'
        : subscription.status === 'canceled'
        ? 'canceled'
        : 'incomplete';

    await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        status,
        plan,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      },
      { onConflict: 'user_id' }
    );

    await supabase
      .from('users')
      .update({ is_yep_plus: status === 'active' })
      .eq('id', userId);
  }
}
