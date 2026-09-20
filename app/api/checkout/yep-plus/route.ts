import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabase } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/site';

// Live-mode Stripe account: price IDs stay unset until you're ready to test
// real payments (see .env.local). Until then this redirects back with a
// clear "not configured" message rather than erroring.
export async function POST(request: Request) {
  const formData = await request.formData();
  const plan = formData.get('plan') === 'annual' ? 'annual' : 'monthly';

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('next', '/yep-plus');
    return NextResponse.redirect(url, { status: 303 });
  }

  const priceId =
    plan === 'annual'
      ? process.env.STRIPE_PRICE_YEP_PLUS_ANNUAL
      : process.env.STRIPE_PRICE_YEP_PLUS_MONTHLY;

  const stripe = getStripe();
  const siteUrl = SITE_URL;

  if (!stripe || !priceId) {
    const url = new URL('/yep-plus', request.url);
    url.searchParams.set('checkout', 'not_configured');
    return NextResponse.redirect(url, { status: 303 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/yep-plus?checkout=success`,
    cancel_url: `${siteUrl}/yep-plus?checkout=cancelled`,
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { yepitshalal_user_id: user.id },
    subscription_data: { metadata: { yepitshalal_user_id: user.id } },
    // Supporter status reads the `subscriptions` table, never Stripe directly:
    // the webhook is what keeps that table in sync. Nothing anyone can search,
    // read or see depends on this session; support pays for the site, it does
    // not unlock any of it.
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
