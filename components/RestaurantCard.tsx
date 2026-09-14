'use client';

import Image from 'next/image';
import Link from 'next/link';
import { HalalBadge } from './HalalBadge';
import { ArrowRightIcon } from './icons';
import { cleanRestaurantName } from '@/lib/restaurantName';
import { getOpenStatus } from '@/lib/openingStatus';
import { coverFor } from '@/lib/representativeImages';
import { isStockPhoto, statusOf, type SearchResultRestaurant } from '@/lib/types';

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
  // The reason line: what the label rests on, or for a place not checked yet,
  // that nobody has confirmed anything.
  const reason = restaurant.halal_summary ?? (status === 'unknown' ? "We don't know yet if the food is halal" : null);

  return (
    <Link
      href={`/restaurant/${restaurant.slug}`}
      className="group flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-black/10 sm:gap-4 sm:p-3"
    >
      <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-halal-unverifiedSoft sm:h-[92px] sm:w-[92px]">
        <Image
          src={cover.src}
          alt={cover.own ? `${title}` : ''}
          fill
          sizes="(max-width: 640px) 76px, 92px"
          priority={priority}
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        {/* Never the restaurant's own food unless it sent us a photo, and the
            card says so rather than let a stock biryani pass as theirs. */}
        {!cover.own && (
          <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-[3px] text-center text-[9px] font-medium leading-none tracking-wide text-white">
            Example dish
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate font-display text-[15px] font-semibold leading-snug text-ink sm:text-base">{title}</h3>

        <p className="truncate text-[13px] text-muted">
          <span className="font-medium text-ink/75">{distance}</span>
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
              <span suppressHydrationWarning className={`font-medium ${OPEN_TONE[open.state]}`}>{open.label}</span>
            </>
          )}
        </p>

        {/* The label and, beside it, the reason for it: a label alone is the
            thing this site exists to improve on. */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0">
            <HalalBadge classification={status} size="sm" />
          </span>
          {reason && <span className="truncate text-xs text-muted">{reason}</span>}
        </div>
      </div>

      <ArrowRightIcon className="mr-1 hidden h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink sm:block" />
    </Link>
  );
}
