import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getOwnedRestaurants } from '@/lib/deals/data';
import { ArrowRightIcon } from '@/components/icons';
import { linkCard } from '@/components/cta';

// Every restaurant this account runs. An owner is whoever restaurants.owner_id
// points at, set when an admin approves their claim. Staff never sign in: they
// use the restaurant's PIN.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your restaurants', robots: { index: false } };

export default async function ManageIndexPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/manage');

  const restaurants = await getOwnedRestaurants(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Your restaurants</h1>

      {restaurants.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <p className="font-display text-lg font-semibold text-ink">No restaurants yet</p>
          <ol className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-ink/85">
            <li>1. Find your restaurant on YepItsHalal.</li>
            <li>2. On its page, tap &ldquo;Run this restaurant?&rdquo;.</li>
            <li>3. We check it is yours. Then it shows here.</li>
          </ol>
          <Link href="/search" className="mt-4 inline-flex min-h-[44px] items-center font-semibold text-accent-ink hover:underline">
            Find your restaurant
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {restaurants.map((r) => (
            <li key={r.id}>
              <Link href={`/manage/${r.slug}/deals`} className={`${linkCard} flex items-center justify-between gap-3 p-5`}>
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-semibold text-ink">
                    {r.branch_label ? `${r.name}, ${r.branch_label}` : r.name}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">Deal, reels and poster</span>
                </span>
                <ArrowRightIcon className="h-5 w-5 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
