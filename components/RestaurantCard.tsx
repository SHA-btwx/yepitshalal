'use client';

import Link from 'next/link';
import { CoverImage } from './CoverImage';
import { HalalBadge } from './HalalBadge';
import { CheckedByUsBadge } from './CheckedByUsBadge';
import { ArrowRightIcon } from './icons';
import { cleanRestaurantName } from '@/lib/restaurantName';
import { getOpenStatus } from '@/lib/openingStatus';
import { coverFor } from '@/lib/representativeImages';
import { isBusinessLogo, isStockPhoto, statusOf, type SearchResultRestaurant } from '@/lib/types';

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return 'On your doorstep';
  return `${miles.toFixed(1)} mi`;
}

/**
 * A branch descriptor used to live inside the name ("Morley's Chicken (Acton)").
 * With brand and branch as separate columns the card shows the brand once and
 * puts the location on its own line, so two nearby branches read as two places.
 * Registration names ("X Ltd t/a Y") are shown as the name on the door.
 */
export function displayName(r: { name: string; brand_name?: string | null; branch_label?: string | null }): string {
  return cleanRestaurantName(r.brand_name ?? r.name);
}

const OPEN_TONE: Record<string, string> = {
  open: 'text-halal-fullInk',
  closing_soon: 'text-halal-partialInk',
  closed: 'text-subtle',
};

export function RestaurantCard({
  restaurant,
  priority = false,
}: {
  restaurant: SearchResultRestaurant;
  /** Set on the first few rows: one of them is the LCP element. */
  priority?: boolean;
}) {
  const cuisine = restaurant.cuisines?.slice(0, 2).join(' · ') || restaurant.cuisine_label || null;
  const title = displayName(restaurant);
  const distance = formatDistance(restaurant.distance_meters);
  const status = statusOf(restaurant);
  const open = restaurant.opening_hours?.length ? getOpenStatus(restaurant.opening_hours) : null;
  const cover = coverFor(restaurant, (url) => !isStockPhoto(url));
  const logo = cover.own && isBusinessLogo(cover.src);
  // The reason line: what the label rests on, or for a place not checked yet,
  // that nobody has confirmed anything.
  const reason = restaurant.halal_summary ?? (status === 'unknown' ? "We don't know yet if the food is halal" : null);

  return (
    <Link
      href={`/restaurant/${restaurant.slug}`}
      className="group flex items-center gap-3.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition duration-200 active:scale-[0.99] active:bg-black/[0.02] hover:-translate-y-0.5 hover:shadow-lg hover:ring-black/10 sm:gap-4 sm:p-3.5"
    >
      {/* Bigger than it was. At 76px a photo of a dinner was a thumbnail you
          squinted at; this is the thing that makes a row identifiable before
          you have read a word of it. */}
      <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-halal-unverifiedSoft sm:h-[120px] sm:w-[120px]">
        <CoverImage
          src={cover.src}
          alt={cover.own ? title : ''}
          sizes="(max-width: 640px) 104px, 120px"
          priority={priority}
          thumb
          className={logo ? '' : 'transition duration-300 group-hover:scale-105'}
        />
        {/* Never the restaurant's own food unless it is their picture, and the
            card says so rather than let a stock biryani pass as theirs. */}
        {!cover.own && (
          <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-[2px] text-[9px] font-medium leading-none tracking-wide text-white backdrop-blur-[2px]">
            Example
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="line-clamp-2 font-display text-[17px] font-semibold leading-tight text-ink sm:text-lg">{title}</h3>

        <p className="truncate text-[13px] text-muted">
          <span className="font-semibold text-ink/80">{distance}</span>
          {restaurant.branch_label && (
            <>
              <span className="mx-1.5 text-subtle" aria-hidden="true">·</span>
              {restaurant.branch_label}
            </>
          )}
          {cuisine && (
            <>
              <span className="mx-1.5 text-subtle" aria-hidden="true">·</span>
              {cuisine}
            </>
          )}
          {open && open.state !== 'unknown' && (
            <>
              <span className="mx-1.5 text-subtle" aria-hidden="true">·</span>
              <span suppressHydrationWarning className={`font-semibold ${OPEN_TONE[open.state]}`}>{open.label}</span>
            </>
          )}
        </p>

        {/* The label and, under it, the reason for it: a label alone is the
            thing this site exists to improve on. */}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex shrink-0 flex-wrap items-center gap-2">
            <HalalBadge classification={status} size="sm" />
            {restaurant.checked_by_us && <CheckedByUsBadge size="sm" />}
          </span>
          {reason && <span className="line-clamp-2 text-xs leading-snug text-muted">{reason}</span>}
        </div>
      </div>

      <ArrowRightIcon className="mr-0.5 hidden h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink sm:block" aria-hidden="true" />
    </Link>
  );
}
