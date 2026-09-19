'use client';

import clsx from 'clsx';
import { CoverImage } from './CoverImage';
import { HalalBadge } from './HalalBadge';
import { displayName } from './RestaurantCard';
import { coverFor } from '@/lib/representativeImages';
import { isStockPhoto, statusOf, type SearchResultRestaurant } from '@/lib/types';
import { XIcon } from './icons';

// Several places at one point on the map: a food court, a parade of shops, or
// two branches that share a door. Zooming will never separate them, so tapping
// the cluster opens this instead of moving the camera and changing nothing.

export function ClusterSheet({
  places,
  onPick,
  onClose,
}: {
  places: SearchResultRestaurant[];
  onPick: (r: SearchResultRestaurant) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={`${places.length} places at this spot`}
      className={clsx(
        'absolute z-30 animate-sheet-up',
        'inset-x-0 bottom-0 max-h-[72%]',
        'sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-h-[calc(100%-2rem)] sm:w-[22.5rem]'
      )}
    >
      <div className="flex max-h-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/10 sm:rounded-3xl sm:shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink">
            {places.length} places at this spot
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-black/[0.05] active:scale-95"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {places.map((r) => {
            const cover = coverFor(r, (url) => !isStockPhoto(url));
            const status = statusOf(r);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-black/[0.035] active:bg-black/[0.06]"
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-halal-unverifiedSoft">
                    <CoverImage src={cover.src} alt="" sizes="48px" thumb />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{displayName(r)}</span>
                    <span className="mt-0.5 block">
                      <HalalBadge classification={status} size="sm" />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
