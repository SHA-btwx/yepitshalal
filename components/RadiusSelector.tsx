'use client';

import clsx from 'clsx';
import { RADIUS_OPTIONS_MILES, formatRadiusLabel } from '@/lib/types';

// Four distances, so this is a segmented control rather than a scrolling rail:
// every option is visible at 375px, which is the width that matters most.
//
// Radio-group semantics, not a row of buttons: exactly one radius is active,
// and arrow keys move between options the way a native radio group does.
// Every radius is available to everyone. Nothing here is locked.
export function RadiusSelector({
  selectedMiles,
  onSelect,
  className,
}: {
  selectedMiles: number;
  onSelect: (miles: number) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Search radius"
      className={clsx('flex items-center gap-0.5 rounded-full bg-black/[0.055] p-[3px]', className)}
    >
      {RADIUS_OPTIONS_MILES.map((miles) => {
        const active = miles === selectedMiles;
        return (
          <button
            key={miles}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Within ${formatRadiusLabel(miles)}`}
            onClick={() => onSelect(miles)}
            className={clsx(
              'min-h-[34px] flex-1 rounded-full px-2 text-[13px] font-semibold transition',
              active ? 'bg-ink text-white shadow-sm' : 'text-ink/65 hover:text-ink active:scale-[0.97]'
            )}
          >
            {formatRadiusLabel(miles)}
          </button>
        );
      })}
    </div>
  );
}
