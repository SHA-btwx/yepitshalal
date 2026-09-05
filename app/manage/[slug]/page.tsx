import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getAllReelsForOwner, getReelAllowance } from '@/lib/reels';
import { withdrawReel, submitReelForReview, archiveReel, addEmbedReel } from '@/lib/reel-actions';
import { ReelUploader } from '@/components/ReelUploader';
import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton';
import { HalalBadge } from '@/components/HalalBadge';
import { SparkleIcon, ArrowUpRightIcon, TrashIcon, InfoIcon } from '@/components/icons';
import type { Reel, ReelStatus } from '@/lib/reels';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Manage reels', robots: { index: false } };

const STATUS_COPY: Record<ReelStatus, { label: string; tone: string; note: string }> = {
  draft: {
    label: 'Draft',
    tone: 'bg-black/[0.05] text-ink/75 ring-black/10',
    note: 'Not live. Send it for review when you are ready.',
  },
  pending_review: {
    label: 'In review',
    tone: 'bg-accent-soft text-accent-ink ring-accent/20',
    note: 'We check every reel before it goes live. This usually takes a day.',
  },
  published: {
    label: 'Live',
    tone: 'bg-halal-fullSoft text-halal-fullInk ring-halal-full/20',
    note: 'On your restaurant page and eligible for Discovery.',
  },
  rejected: {
    label: 'Not approved',
    tone: 'bg-halal-partialSoft text-halal-partialInk ring-halal-partial/20',
    note: '',
  },
  archived: { label: 'Archived', tone: 'bg-black/[0.05] text-subtle ring-black/10', note: '' },
};

export default async function ManageRestaurantPage({ params }: { params: { slug: string } }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/manage/${params.slug}`);

  const admin = createAdminSupabase();
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, name, slug, owner_id, halal_classification')
    .eq('slug', params.slug)
    .maybeSingle();
  if (!restaurant) notFound();

  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';
  if (restaurant.owner_id !== user.id && !isAdmin) notFound();

  const [reels, allowance] = await Promise.all([
    getAllReelsForOwner(restaurant.id),
    getReelAllowance(restaurant.id),
  ]);

  const live = reels.filter((r) => r.status === 'published' || r.status === 'pending_review');
  const atCapacity = live.length >= allowance.allowance;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
            Managing
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink">{restaurant.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <HalalBadge classification={restaurant.halal_classification} size="sm" />
            <span className="text-xs text-muted">Set by verification, not here.</span>
          </div>
        </div>
        <Link
          href={`/restaurant/${restaurant.slug}`}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
        >
          View page
          <ArrowUpRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {/* The commercial message lives here. It states what the free tier gives
          you before it mentions what more costs — a free restaurant should feel
          included, not throttled. */}
      <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Your reels</h2>
            <p className="mt-0.5 text-sm text-muted">
              {live.length} of {allowance.allowance} live
              {allowance.isPartner ? ' on your partner plan' : ' on the free plan'}
            </p>
          </div>
          {allowance.isPartner && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-ink">
              <SparkleIcon className="h-3.5 w-3.5" />
              Partner
            </span>
          )}
        </div>

        <div
          className="mt-3 flex gap-1.5"
          role="img"
          aria-label={`${live.length} of ${allowance.allowance} reel slots used`}
        >
          {Array.from({ length: Math.min(allowance.allowance, 12) }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < live.length ? 'bg-accent-ink' : 'bg-black/10'}`}
            />
          ))}
        </div>

        {!allowance.isPartner && (
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted">
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
            <span>
              Your free reel appears on your page and can show up in Discovery, same as anyone
              else&apos;s. A partnership adds more slots — each extra reel is another chance to be
              found by someone deciding where to eat tonight.{' '}
              <Link href="/partners" className="font-semibold text-accent-ink hover:underline">
                How partnerships work
              </Link>
            </span>
          </p>
        )}
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ReelUploader
          restaurantId={restaurant.id}
          disabled={atCapacity}
          disabledReason={
            atCapacity
              ? `All ${allowance.allowance} of your slots are in use. Take one down to add another.`
              : undefined
          }
        />
      </div>

      <ul className="mt-5 space-y-3">
        {reels.length === 0 && (
          <li className="rounded-2xl border border-dashed border-black/10 px-6 py-10 text-center text-sm text-muted">
            No reels yet. Your first one is free — a 15-second clip of your signature dish is
            usually the one that works.
          </li>
        )}
        {reels.map((reel) => (
          <ReelRow key={reel.id} reel={reel} />
        ))}
      </ul>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h2 className="font-display text-base font-semibold text-ink">Or link one you already have</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Paste an Instagram, TikTok or YouTube link to your own post. It plays on your page, and
          it counts towards the same allowance.
        </p>
        <form action={addEmbedReel.bind(null, restaurant.id)} className="mt-4 space-y-3">
          <div>
            <label htmlFor="embed_url" className="mb-1.5 block text-sm font-medium text-ink">
              Post link
            </label>
            <input
              id="embed_url"
              name="embed_url"
              type="url"
              required
              placeholder="https://instagram.com/reel/…"
              className="w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-[16px] text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="cover_url" className="mb-1.5 block text-sm font-medium text-ink">
              Cover image URL
            </label>
            <input
              id="cover_url"
              name="cover_url"
              type="url"
              required
              className="w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-[16px] text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm"
            />
            <p className="mt-1 text-xs text-muted">
              Instagram and TikTok will not play until someone taps, so the feed needs a still to
              show first.
            </p>
          </div>
          <div>
            <label htmlFor="caption" className="mb-1.5 block text-sm font-medium text-ink">
              Caption
            </label>
            <input
              id="caption"
              name="caption"
              className="w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-[16px] text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={atCapacity}
            className="inline-flex min-h-[44px] items-center rounded-full border border-ink px-5 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white disabled:opacity-50"
          >
            Add reel
          </button>
        </form>
      </section>
    </div>
  );
}

function ReelRow({ reel }: { reel: Reel }) {
  const copy = STATUS_COPY[reel.status];

  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm">
      <div className="relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-xl bg-halal-unverifiedSoft">
        {reel.cover_url ? (
          <Image src={reel.cover_url} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <video src={reel.media_url} className="h-full w-full object-cover" muted preload="metadata" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${copy.tone}`}
          >
            {copy.label}
          </span>
          <span className="text-xs text-subtle">
            {reel.media_kind === 'upload' ? 'Uploaded video' : reel.provider}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-medium text-ink">
          {reel.caption || 'No caption'}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          {reel.status === 'rejected' && reel.moderation_note ? reel.moderation_note : copy.note}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {(reel.status === 'draft' || reel.status === 'rejected') && (
            <form action={submitReelForReview.bind(null, reel.id)}>
              <button className="inline-flex min-h-[36px] items-center rounded-full border border-ink px-3.5 text-xs font-semibold text-ink transition hover:bg-ink hover:text-white">
                Send for review
              </button>
            </form>
          )}
          {(reel.status === 'published' || reel.status === 'pending_review') && (
            <form action={withdrawReel.bind(null, reel.id)}>
              <button className="inline-flex min-h-[36px] items-center rounded-full border border-line px-3.5 text-xs font-semibold text-ink transition hover:border-ink/30">
                Take down
              </button>
            </form>
          )}
          <form action={archiveReel.bind(null, reel.id)}>
            <ConfirmSubmitButton
              message="Archive this reel? It comes off your page and out of Discovery."
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-halal-partialInk transition hover:bg-halal-partialSoft"
            >
              <TrashIcon className="h-[18px] w-[18px]" />
              <span className="sr-only">Archive reel</span>
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    </li>
  );
}
