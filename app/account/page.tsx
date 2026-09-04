import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { SealCheckIcon, SparkleIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your account' };

export default async function AccountPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/account');

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  const isActive = subscription?.status === 'active';

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-14">
      <h1 className="font-display text-2xl font-semibold text-ink">Your account</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
        {isActive ? (
          <>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-halal-fullInk">
              <SealCheckIcon className="h-[18px] w-[18px]" />
              Yep+ member
            </p>
            <p className="mt-1 text-sm text-muted">
              {subscription?.plan === 'annual' ? 'Annual' : 'Monthly'} plan
              {subscription?.current_period_end &&
                ` · renews ${new Date(subscription.current_period_end).toLocaleDateString('en-GB')}`}
            </p>
            <form action="/api/checkout/portal" method="POST" className="mt-4">
              <button className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-ink px-4 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white">
                Manage billing
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/80">You&apos;re on Yep Free.</p>
            <p className="mt-1 text-sm text-muted">
              Halal info stays free. Yep+ lifts the distance limit across London.
            </p>
            <a
              href="/yep-plus"
              className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink"
            >
              <SparkleIcon className="h-4 w-4" />
              Upgrade to Yep+
            </a>
          </>
        )}
      </div>
    </div>
  );
}
