import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/sign-in?next=/account', request.url), { status: 303 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured yet.' }, { status: 503 });
  }

  const admin = createAdminSupabase();
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found yet.' }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${siteUrl}/account`,
  });

  return NextResponse.redirect(portalSession.url, { status: 303 });
}
