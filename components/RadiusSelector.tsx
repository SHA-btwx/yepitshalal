'use client';

import clsx from 'clsx';
import { RADIUS_OPTIONS_MILES } from '@/lib/types';

// Radio-group semantics, not a row of buttons: exactly one radius is active,
// and arrow keys should move between options the way a native radio group does.
//
// Every radius is available to everyone. Nothing here is locked.
export function RadiusSelector({
  selectedMiles,
  onSelect,
}: {
  selectedMiles: number;
  onSelect: (miles: number) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Search radius"
      className="no-scrollbar rail-fade flex items-center gap-2 overflow-x-auto pb-1 sm:[mask-image:none]"
    >
      {RADIUS_OPTIONS_MILES.map((miles) => {
        const active = miles === selectedMiles;
        return (
          <button
            key={miles}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(miles)}
            className={clsx(
              'inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition',
              active
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-white text-ink/75 hover:border-ink/30 hover:text-ink'
            )}
          >
            {/* The same filled green ring the map draws, so the selected chip and
                the searched area read as one thing: this chip is that circle. */}
            {active && (
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-accent-onDark bg-accent-onDark/30"
              />
            )}
            {miles} mi
          </button>
        );
      })}
    </div>
  );
}
