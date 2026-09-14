'use client';

import Link from 'next/link';
import { LockIcon, MapIcon } from './icons';
import type { TierCount } from '@/lib/types';

// What a bigger radius would actually show, in numbers from the same query as
// the results. Never "Unlock 0": with nothing more to show, it says nothing.
//
// The additional count is the difference between two counts of the same
// search, so it is exactly the number of places the visitor would gain.

/** Largest radius the message will talk about: past this it stops being "near". */
const MESSAGE_MAX_METERS = 16093;

export function pickUnlockTier(
  tierCounts: TierCount[],
  accessibleMeters: number,
  preferredMiles: number | null
): { tier: TierCount; shown: number; extra: number } | null {
  const here = tierCounts.find((t) => t.meters === accessibleMeters);
  if (!here) return null;
  const locked = tierCounts
    .filter((t) => t.meters > accessibleMeters && t.meters <= MESSAGE_MAX_METERS)
    .map((t) => ({ tier: t, shown: here.places, extra: t.places - here.places }))
    .filter((o) => o.extra > 0);
  if (!locked.length) return null;

  if (preferredMiles !== null) {
    const preferred = locked.find((o) => o.tier.miles === preferredMiles);
    if (preferred) return preferred;
  }
  // The nearest tier that adds a worthwhile handful, otherwise the nearest that
  // adds any at all.
  return locked.find((o) => o.extra >= 5) ?? locked[0];
}

export function RadiusUnlockBanner({
  unlock,
  previewing,
  onPreview,
}: {
  unlock: { tier: TierCount; shown: number; extra: number };
  previewing: boolean;
  onPreview: (miles: number) => void;
}) {
  const { tier, shown, extra } = unlock;
  const miles = `${tier.miles} ${tier.miles === 1 ? 'mile' : 'miles'}`;
  const placeWord = extra === 1 ? 'place' : 'places';

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-ink px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="flex items-start gap-2.5 text-sm">
        <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-onDark" />
        <span>
          {shown > 0 ? (
            <>
              You&apos;re seeing {shown}.{' '}
              <span className="font-semibold">
                Unlock {extra} more halal {placeWord} within {miles}.
              </span>
            </>
          ) : (
            <span className="font-semibold">
              Unlock {extra} halal {placeWord} within {miles}.
            </span>
          )}
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-2 pl-[26px] sm:pl-0">
        {!previewing && (
          <button
            type="button"
            onClick={() => onPreview(tier.miles)}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-white/85 ring-1 ring-white/25 transition hover:bg-white/10"
          >
            <MapIcon className="h-4 w-4" />
            See the area
          </button>
        )}
        <Link
          href="/yep-plus"
          className="inline-flex min-h-[36px] items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-ink transition hover:bg-white/90"
        >
          Get Yep+
        </Link>
      </div>
    </div>
  );
}
