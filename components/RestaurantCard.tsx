import Image from 'next/image';
import Link from 'next/link';
import { HalalBadge } from './HalalBadge';
import type { SearchResultRestaurant } from '@/lib/types';

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return 'On your doorstep';
  return `${miles.toFixed(1)} mi away`;
}

export function RestaurantCard({ restaurant }: { restaurant: SearchResultRestaurant }) {
  return (
    <Link
      href={`/restaurant/${restaurant.slug}`}
      className="group flex gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-black/10 sm:flex-col sm:p-0 sm:overflow-hidden"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-halal-unverifiedSoft sm:h-40 sm:w-full sm:rounded-none">
        {restaurant.primary_photo_path ? (
          <Image
            src={restaurant.primary_photo_path}
            alt={restaurant.name}
            fill
            sizes="(max-width: 640px) 80px, 320px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">🍽️</div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-display text-[15px] font-semibold text-ink sm:text-base">
            {restaurant.name}
          </h3>
        </div>
        <p className="truncate text-xs text-ink/50 sm:text-[13px]">
          {restaurant.cuisines?.slice(0, 2).join(' · ') ?? 'Restaurant'}
          {' · '}
          {formatDistance(restaurant.distance_meters)}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <HalalBadge classification={restaurant.halal_classification} size="sm" />
        </div>
      </div>
    </Link>
  );
}
