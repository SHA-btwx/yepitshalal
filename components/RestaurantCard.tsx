import Image from 'next/image';
import Link from 'next/link';
import { HalalBadge } from './HalalBadge';
import { ForkKnifeIcon, ArrowRightIcon } from './icons';
import type { SearchResultRestaurant } from '@/lib/types';

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return 'On your doorstep';
  return `${miles.toFixed(1)} mi`;
}

/**
 * A branch descriptor used to live inside the name — "Morley's Chicken (Acton)".
 * Now that brand and branch are separate columns, the card can show the brand
 * once and put the location on its own line, so two nearby branches read as two
 * places rather than as the same name twice.
 *
 * Falls back to the stored name when a record has no brand, and strips a
 * trailing "(Area)" left over from the old convention so it never doubles up
 * with the branch line beneath it.
 */
export function displayName(r: {
  name: string;
  brand_name?: string | null;
  branch_label?: string | null;
}): string {
  if (r.brand_name) return r.brand_name;
  return r.name.replace(/\s*\([^)]*\)\s*$/, '').trim() || r.name;
}

export function RestaurantCard({
  restaurant,
  priority = false,
}: {
  restaurant: SearchResultRestaurant;
  /** Set on the first few rows: one of them is the LCP element. */
  priority?: boolean;
}) {
  const cuisines = restaurant.cuisines?.slice(0, 2).join(' · ') || 'Restaurant';
  const title = displayName(restaurant);
  const distance = formatDistance(restaurant.distance_meters);

  return (
    <Link
      href={`/restaurant/${restaurant.slug}`}
      className="group flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-black/10 sm:gap-4 sm:p-3"
    >
      <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-halal-unverifiedSoft sm:h-[92px] sm:w-[92px]">
        {restaurant.primary_photo_path ? (
          <Image
            src={restaurant.primary_photo_path}
            alt=""
            fill
            sizes="(max-width: 640px) 76px, 92px"
            priority={priority}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-halal-unverified">
            <ForkKnifeIcon className="h-7 w-7" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="truncate font-display text-[15px] font-semibold leading-snug text-ink sm:text-base">
          {title}
        </h3>

        {/* Location line. For a chain this is what tells one branch from
            another, so it leads with the branch and keeps distance beside it. */}
        <p className="truncate text-[13px] text-muted">
          {restaurant.branch_label && (
            <>
              <span className="font-medium text-ink/75">{restaurant.branch_label}</span>
              <span className="mx-1.5 text-subtle" aria-hidden="true">
                ·
              </span>
            </>
          )}
          <span className={restaurant.branch_label ? '' : 'font-medium text-ink/75'}>
            {distance}
          </span>
          {!restaurant.branch_label && (
            <>
              <span className="mx-1.5 text-subtle" aria-hidden="true">
                ·
              </span>
              {cuisines}
            </>
          )}
        </p>

        {restaurant.branch_label && (
          <p className="truncate text-xs text-subtle">{cuisines}</p>
        )}

        {/* Wrapped so the pill hugs its label — a bare flex child would stretch
            to the column width and read as a banner, not a badge. */}
        <span className="self-start">
          <HalalBadge classification={restaurant.halal_classification} size="sm" />
        </span>
      </div>

      <ArrowRightIcon className="mr-1 hidden h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink sm:block" />
    </Link>
  );
}
