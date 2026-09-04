'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HalalBadge } from './HalalBadge';
import { ForkKnifeIcon, XIcon } from './icons';
import type { SearchResultRestaurant } from '@/lib/types';

export function RestaurantPreviewCard({
  restaurant,
  onClose,
}: {
  restaurant: SearchResultRestaurant;
  onClose: () => void;
}) {
  const miles = (restaurant.distance_meters / 1609.34).toFixed(1);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Selecting a pin is a pointer action, but the card that appears is where the
  // next action lives — so focus follows it, and Escape (handled by the parent)
  // dismisses it.
  useEffect(() => {
    linkRef.current?.focus({ preventScroll: true });
  }, [restaurant.id]);

  return (
    <div
      role="dialog"
      aria-label={`${restaurant.name} — preview`}
      className="absolute inset-x-3 bottom-3 z-20 animate-sheet-up sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-80"
    >
      <Link
        ref={linkRef}
        href={`/restaurant/${restaurant.slug}`}
        className="flex gap-3 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/10"
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-halal-unverifiedSoft">
          {restaurant.primary_photo_path ? (
            <Image
              src={restaurant.primary_photo_path}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-halal-unverified">
              <ForkKnifeIcon className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold text-ink">{restaurant.name}</p>
          <p className="text-xs text-muted">{miles} mi away</p>
          <div className="mt-1.5">
            <HalalBadge classification={restaurant.halal_classification} size="sm" />
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white shadow-lg ring-2 ring-white transition hover:bg-accent-ink"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
