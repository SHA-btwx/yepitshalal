'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { RestaurantPhoto } from '@/lib/types';
import { isStockPhoto } from '@/lib/types';

export function PhotoGallery({ photos, restaurantName }: { photos: RestaurantPhoto[]; restaurantName: string }) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-halal-unverifiedSoft text-4xl sm:aspect-[16/9]">
        🍽️
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-halal-unverifiedSoft sm:aspect-[16/9]">
        <Image
          src={photos[active].storage_path}
          alt={restaurantName}
          fill
          priority
          className="object-cover"
        />
        {isStockPhoto(photos[active].storage_path) && (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            Representative photo
          </span>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                i === active ? 'ring-ink' : 'ring-transparent opacity-70'
              }`}
            >
              <Image src={photo.storage_path} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
