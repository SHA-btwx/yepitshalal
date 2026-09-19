import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getAreas } from '@/lib/areas';
import { AreaVote } from '@/components/AreaVote';
import { HeartHandIcon, SealCheckIcon, SparkleIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your account' };

function monthAndYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export default async function AccountPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/account');

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan, current_period_end, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const isActive = subscription?.status === 'active';

  // Only supporters can vote, so only they are asked to. The standings are the
  // same for everyone, counted by the database, not by this page.
  const [areas, { data: tally }] = await Promise.all([
    isActive ? getAreas() : Promise.resolve([]),
    isActive ? supabase.rpc('area_vote_tally') : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-14">
      <h1 className="font-display text-2xl font-semibold text-ink">Your account</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
        {isActive ? (
          <>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-halal-fullInk">
              <SealCheckIcon className="h-[18px] w-[18px]" />
              Yep+ supporter
              {subscription?.created_at && (
                <span className="font-normal text-muted">since {monthAndYear(subscription.created_at)}</span>
              )}
            </p>
            <p className="mt-1 text-sm text-muted">
              {subscription?.plan === 'annual' ? 'Annual' : 'Monthly'}
              {subscription?.current_period_end &&
                ` · renews ${new Date(subscription.current_period_end).toLocaleDateString('en-GB')}`}
            </p>
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm leading-relaxed text-accent-ink">
              <HeartHandIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Thank you. You are paying for the checking that keeps this site free for everyone.</span>
            </p>
            <form action="/api/checkout/portal" method="POST" className="mt-4">
              <button className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-ink px-4 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white">
                Manage billing
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">You have the whole site already.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Search, labels, evidence and every mile of London are free, and they stay that way.
              Yep+ is for paying towards the checking if you want to.
            </p>
            <Link
              href="/yep-plus"
              className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink"
            >
              <SparkleIcon className="h-4 w-4" />
              Support YepItsHalal
            </Link>
          </>
        )}
      </div>

      {isActive && (
        <AreaVote
          areas={areas.map((a) => ({ borough: a.borough, notChecked: a.not_checked }))}
          tally={(tally ?? []) as { borough: string; votes: number; mine: boolean }[]}
        />
      )}
    </div>
  );
}
