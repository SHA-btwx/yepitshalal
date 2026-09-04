import Image from 'next/image';
import Link from 'next/link';
import { HalalBadge } from './HalalBadge';
import type { SearchResultRestaurant } from '@/lib/types';

export function RestaurantPreviewCard({
  restaurant,
  onClose,
}: {
  restaurant: SearchResultRestaurant;
  onClose: () => void;
}) {
  const miles = (restaurant.distance_meters / 1609.34).toFixed(1);

  return (
    <div className="absolute inset-x-3 bottom-3 z-20 sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-80">
      <Link
        href={`/restaurant/${restaurant.slug}`}
        className="flex gap-3 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/10"
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-halal-unverifiedSoft">
          {restaurant.primary_photo_path ? (
            <Image src={restaurant.primary_photo_path} alt={restaurant.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xl">🍽️</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold text-ink">{restaurant.name}</p>
          <p className="text-xs text-ink/50">{miles} mi away</p>
          <div className="mt-1">
            <HalalBadge classification={restaurant.halal_classification} size="sm" />
          </div>
        </div>
      </Link>
      <button
        onClick={onClose}
        aria-label="Close preview"
        className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white shadow-md"
      >
        ✕
      </button>
    </div>
  );
}
