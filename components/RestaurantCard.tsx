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

// A horizontal row at every breakpoint. The previous vertical card meant only
// ~3 results fitted the desktop list column beside the map; a row fits 6–7, and
// a results list is scanned, not browsed.
export function RestaurantCard({
  restaurant,
  priority = false,
}: {
  restaurant: SearchResultRestaurant;
  /** Set on the first few rows: one of them is the LCP element. */
  priority?: boolean;
}) {
  const cuisines = restaurant.cuisines?.slice(0, 2).join(' · ') || 'Restaurant';

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
          {restaurant.name}
        </h3>
        <p className="truncate text-[13px] text-muted">
          {cuisines}
          <span className="mx-1.5 text-subtle" aria-hidden="true">
            ·
          </span>
          <span className="font-medium text-ink/75">{formatDistance(restaurant.distance_meters)}</span>
        </p>
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
