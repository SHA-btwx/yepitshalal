import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { submitOwnershipClaim } from '@/lib/reel-actions';
import { SparkleIcon, ArrowRightIcon } from './icons';

/**
 * The self-serve half of restaurant access: an owner asks here, an admin
 * approves in /admin/claims. Admins can also link an account directly from the
 * restaurant's admin page, which is the faster path for one we already know.
 */
export async function OwnershipCta({
  restaurantId,
  slug,
}: {
  restaurantId: string;
  slug: string;
}) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminSupabase();
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('owner_id')
    .eq('id', restaurantId)
    .maybeSingle();

  if (user && restaurant?.owner_id === user.id) {
    return (
      <Link
        href={`/manage/${slug}`}
        className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <span>
          <span className="block font-display text-base font-semibold text-ink">
            You manage this restaurant
          </span>
          <span className="mt-0.5 block text-sm text-muted">Add reels, update details.</span>
        </span>
        <ArrowRightIcon className="h-5 w-5 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-5">
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
          <SparkleIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent-ink" />
          <span>
            Do you run this place?{' '}
            <Link
              href={`/sign-in?next=/restaurant/${slug}`}
              className="font-semibold text-accent-ink hover:underline"
            >
              Sign in
            </Link>{' '}
            to claim it and post a reel — the first one is free.
          </span>
        </p>
      </div>
    );
  }

  // Signed in, not the owner. Show the claim form unless one is already in.
  const { data: existing } = await admin
    .from('restaurant_ownership_claims')
    .select('status')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing?.status === 'pending') {
    return (
      <p className="rounded-2xl border border-dashed border-black/15 p-5 text-sm leading-relaxed text-muted">
        Your claim for this restaurant is with us — we&apos;ll email you once it&apos;s reviewed.
      </p>
    );
  }
  if (existing?.status === 'rejected') return null;

  return (
    <form
      action={submitOwnershipClaim.bind(null, restaurantId)}
      className="rounded-2xl border border-dashed border-black/15 p-5"
    >
      <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
        <SparkleIcon className="h-[18px] w-[18px] text-accent-ink" />
        Do you run this restaurant?
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Claim it to post a reel and keep the details right. Your first reel is free.
      </p>
      <label htmlFor="contact_note" className="mt-3 block text-sm font-medium text-ink">
        How can we check that with you?
      </label>
      <input
        id="contact_note"
        name="contact_note"
        placeholder="A phone number, or the email on your website"
        className="mt-1.5 w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-[16px] text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm"
      />
      <button
        type="submit"
        className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink"
      >
        Claim this restaurant
      </button>
    </form>
  );
}
