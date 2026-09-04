'use client';

import { useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { ForkKnifeIcon } from './icons';
import type { RestaurantPhoto } from '@/lib/types';
import { isStockPhoto } from '@/lib/types';

export function PhotoGallery({
  photos,
  restaurantName,
}: {
  photos: RestaurantPhoto[];
  restaurantName: string;
}) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-halal-unverifiedSoft text-halal-unverified sm:aspect-[16/9]">
        <ForkKnifeIcon className="h-10 w-10" />
        <span className="sr-only">No photos of {restaurantName} yet</span>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-halal-unverifiedSoft sm:aspect-[16/9]">
        <Image
          src={photos[active].storage_path}
          alt={`${restaurantName} — photo ${active + 1} of ${photos.length}`}
          fill
          priority
          sizes="(max-width: 896px) 100vw, 896px"
          className="object-cover"
        />
        {isStockPhoto(photos[active].storage_path) && (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            Representative photo
          </span>
        )}
      </div>
      {photos.length > 1 && (
        <div
          role="tablist"
          aria-label={`${restaurantName} photos`}
          className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1"
        >
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              onClick={() => setActive(i)}
              className={clsx(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition',
                i === active ? 'ring-ink' : 'opacity-70 ring-transparent hover:opacity-100'
              )}
            >
              <Image src={photo.storage_path} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
