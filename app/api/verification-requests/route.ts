import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { SITE_URL } from '@/lib/site';
import { notifyInbox } from '@/lib/notify';

export async function POST(request: Request) {
  const body = await request.json();
  const { restaurantId, queueType, contactName, contactEmail } = body as {
    restaurantId: string;
    queueType: 'free' | 'priority';
    contactName?: string;
    contactEmail?: string;
  };

  if (!restaurantId || (queueType !== 'free' && queueType !== 'priority')) {
    return NextResponse.json({ error: 'restaurantId and queueType are required.' }, { status: 400 });
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: 'Please check the email address.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 503 }
    );
  }

  if (queueType === 'priority') {
    const stripe = getStripe();
    const priceId = process.env.STRIPE_PRICE_PRIORITY_VERIFICATION;
    const siteUrl = SITE_URL;

    if (!stripe || !priceId) {
      return NextResponse.json(
        { error: 'Priority Verification payments are not configured yet.' },
        { status: 503 }
      );
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('slug, name')
      .eq('id', restaurantId)
      .maybeSingle();
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
    }

    // The verification_requests row is created by the webhook on
    // checkout.session.completed, not here: payment purchases queue
    // priority only, never a favourable classification (§16).
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/restaurant/${restaurant.slug}/verify?checkout=success`,
      cancel_url: `${siteUrl}/restaurant/${restaurant.slug}/verify?checkout=cancelled`,
      customer_email: contactEmail || undefined,
      metadata: {
        yepitshalal_type: 'priority_verification',
        restaurant_id: restaurantId,
        contact_name: contactName ?? '',
        contact_email: contactEmail ?? '',
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  }

  const { data: exists } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('id', restaurantId)
    .maybeSingle();
  if (!exists) {
    return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
  }

  // Free queue: hard cap of 3 new entries/day, platform-wide.
  const today = new Date().toISOString().slice(0, 10);
  const { data: counter } = await supabase
    .from('daily_free_queue_counter')
    .select('count')
    .eq('counter_date', today)
    .maybeSingle();

  const currentCount = counter?.count ?? 0;
  const admittedToday = currentCount < 3;

  if (admittedToday) {
    await supabase
      .from('daily_free_queue_counter')
      .upsert({ counter_date: today, count: currentCount + 1 }, { onConflict: 'counter_date' });
  }

  const { error } = await supabase.from('verification_requests').insert({
    restaurant_id: restaurantId,
    queue_type: 'free',
    status: admittedToday ? 'queued' : 'awaiting_slot',
    contact_name: contactName ?? null,
    contact_email: contactEmail ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Verification is support work, so help@. Priority requests are paid through
  // Stripe and recorded by the webhook, which is deliberately left alone.
  await notifyInbox({
    inbox: 'help',
    subject: `Verification request: ${exists.name}`,
    fields: [
      ['Restaurant', exists.name],
      ['Page', `${SITE_URL}/restaurant/${exists.slug}`],
      ['Queue', admittedToday ? "Free, in today's queue" : "Free, waiting for tomorrow's slot"],
      ['Name', contactName],
      ['Email', contactEmail],
    ],
    replyTo: contactEmail,
    action: { label: 'Open the verification queue', href: `${SITE_URL}/admin/verify` },
  });

  return NextResponse.json({ ok: true, status: admittedToday ? 'queued' : 'awaiting_slot' });
}
