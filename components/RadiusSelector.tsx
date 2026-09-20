'use client';

import clsx from 'clsx';
import { RADIUS_OPTIONS_MILES, formatRadiusLabel } from '@/lib/types';

// Four distances, so this is a segmented control rather than a scrolling rail:
// every option is visible at 375px, which is the width that matters most.
//
// White with a lifted selection, like everything else in the bar above the
// results. A grey tub is one more box on a screen that had too many.
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
      className={clsx(
        'flex items-center gap-0.5 rounded-full bg-white p-[3px] shadow-[0_1px_2px_rgba(20,24,26,0.04),0_6px_16px_-10px_rgba(20,24,26,0.18)]',
        className
      )}
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
              'min-h-[36px] flex-1 rounded-full px-2 text-[13px] font-semibold transition',
              active
                ? 'bg-ink text-white shadow-[0_6px_16px_-10px_rgba(20,24,26,0.6)]'
                : 'text-ink/55 hover:text-ink active:scale-[0.97]'
            )}
          >
            {formatRadiusLabel(miles)}
          </button>
        );
      })}
    </div>
  );
}
