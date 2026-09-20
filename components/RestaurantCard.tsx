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
    // No outline. A hairline ring plus a shadow plus a border on the thing
    // above it is what made a list of thirty of these read as a stack of boxes;
    // a soft shadow alone is enough to lift a white card off a warm ground, and
    // the eye is then free to land on the photograph and the name.
    <Link
      href={`/restaurant/${restaurant.slug}`}
      className="group flex items-center gap-4 rounded-[22px] bg-white p-3 shadow-[0_1px_2px_rgba(20,24,26,0.04),0_10px_28px_-14px_rgba(20,24,26,0.18)] transition duration-200 active:scale-[0.995] hover:-translate-y-[2px] hover:shadow-[0_2px_4px_rgba(20,24,26,0.05),0_18px_38px_-16px_rgba(20,24,26,0.26)] sm:p-3.5"
    >
      <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-[16px] bg-halal-unverifiedSoft sm:h-[116px] sm:w-[116px]">
        <CoverImage
          src={cover.src}
          alt={cover.own ? title : ''}
          sizes="(max-width: 640px) 100px, 116px"
          priority={priority}
          thumb
          className={logo ? '' : 'transition duration-500 group-hover:scale-[1.06]'}
        />
        {/* Never the restaurant's own food unless it is their picture, and the
            card says so. A wash into the bottom edge rather than a black pill
            stuck on the corner: the same honesty, without a hard little box. */}
        {!cover.own && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-black/45 to-transparent"
            />
            <span className="absolute bottom-1 left-2 text-[10px] font-medium leading-none text-white/85">
              Example
            </span>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 font-display text-[17px] font-semibold leading-[1.2] text-ink sm:text-[19px]">
          {title}
        </h3>

        <p className="mt-1 truncate text-[13px] leading-snug text-muted">
          <span className="font-semibold text-ink/75">{distance}</span>
          {restaurant.branch_label && (
            <>
              <span className="mx-1.5 text-black/20" aria-hidden="true">•</span>
              {restaurant.branch_label}
            </>
          )}
          {cuisine && (
            <>
              <span className="mx-1.5 text-black/20" aria-hidden="true">•</span>
              {cuisine}
            </>
          )}
          {open && open.state !== 'unknown' && (
            <>
              <span className="mx-1.5 text-black/20" aria-hidden="true">•</span>
              <span suppressHydrationWarning className={`font-semibold ${OPEN_TONE[open.state]}`}>
                {open.label}
              </span>
            </>
          )}
        </p>

        {/* The label and, under it, the reason for it: a label alone is the
            thing this site exists to improve on. */}
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <HalalBadge classification={status} size="sm" />
          {restaurant.checked_by_us && <CheckedByUsBadge size="sm" />}
        </span>
        {reason && (
          <span className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-subtle">{reason}</span>
        )}
      </div>

      <ArrowRightIcon
        className="mr-1 hidden h-4 w-4 shrink-0 text-black/15 transition group-hover:translate-x-0.5 group-hover:text-ink/50 sm:block"
        aria-hidden="true"
      />
    </Link>
  );
}
