import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display text-2xl font-semibold text-ink">Your account</h1>
      <p className="mt-1 text-sm text-ink/60">{user.email}</p>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        {isActive ? (
          <>
            <p className="text-sm font-semibold text-halal-full">✓ Yep+ member</p>
            <p className="mt-1 text-sm text-ink/60">
              {subscription?.plan === 'annual' ? 'Annual' : 'Monthly'} plan
              {subscription?.current_period_end &&
                ` · renews ${new Date(subscription.current_period_end).toLocaleDateString('en-GB')}`}
            </p>
            <form action="/api/checkout/portal" method="POST" className="mt-4">
              <button className="w-full rounded-full border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-ink hover:text-white">
                Manage billing
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/70">You&apos;re on Yep Free.</p>
            <a
              href="/yep-plus"
              className="mt-4 inline-block rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-accent-ink"
            >
              Upgrade to Yep+
            </a>
          </>
        )}
      </div>
    </div>
  );
}
