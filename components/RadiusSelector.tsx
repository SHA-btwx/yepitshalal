'use client';

import clsx from 'clsx';
import { LockIcon } from './icons';
import { RADIUS_OPTIONS_MILES } from '@/lib/types';

interface RadiusSelectorProps {
  isYepPlus: boolean;
  freeCapMiles: number;
  selectedMiles: number;
  /** Locked tier currently outlined on the map. Not a selection: search is unchanged. */
  previewMiles?: number | null;
  onSelect: (miles: number) => void;
  onLockedSelect: (miles: number) => void;
}

// Radio-group semantics, not a row of buttons: exactly one radius is active,
// and arrow keys should move between options the way a native radio group does.
export function RadiusSelector({
  isYepPlus,
  freeCapMiles,
  selectedMiles,
  previewMiles = null,
  onSelect,
  onLockedSelect,
}: RadiusSelectorProps) {
  // Searching a place (rather than using your location) caps the free radius at
  // 0.5 mi, which is not one of the standard steps — without it in the list the
  // control opened with no chip selected at all.
  const steps: number[] = (RADIUS_OPTIONS_MILES as readonly number[]).includes(freeCapMiles)
    ? [...RADIUS_OPTIONS_MILES]
    : [freeCapMiles, ...RADIUS_OPTIONS_MILES];

  const options: { miles: number; label: string }[] = [
    ...steps.map((m) => ({ miles: m, label: `${m} mi` })),
    { miles: 999, label: 'Anywhere' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Search radius"
      className="no-scrollbar rail-fade flex items-center gap-2 overflow-x-auto pb-1 sm:[mask-image:none]"
    >
      {options.map(({ miles, label }) => {
        const locked = !isYepPlus && (miles === 999 || miles > freeCapMiles);
        const active = miles === selectedMiles && !(miles === 999 && !isYepPlus);
        const previewing = locked && miles === previewMiles;
        return (
          <button
            key={miles}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={
              locked
                ? `${label}, Yep+ only${previewing ? ', coverage shown on map' : ''}`
                : label
            }
            onClick={() => (locked ? onLockedSelect(miles) : onSelect(miles))}
            className={clsx(
              'inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition',
              active
                ? 'border-ink bg-ink text-white'
                : previewing
                ? // Dashed to match its outline on the map, so the chip and the
                  // ring read as the same object without becoming a selection.
                  'border-dashed border-ink/45 bg-white text-ink'
                : locked
                ? 'border-line bg-white text-subtle'
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
            {label}
            {locked && <LockIcon className="h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
}
