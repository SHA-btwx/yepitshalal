'use client';

import clsx from 'clsx';
import { RADIUS_OPTIONS_MILES } from '@/lib/types';

interface RadiusSelectorProps {
  isYepPlus: boolean;
  freeCapMiles: number;
  selectedMiles: number;
  onSelect: (miles: number) => void;
  onLockedSelect: () => void;
}

export function RadiusSelector({
  isYepPlus,
  freeCapMiles,
  selectedMiles,
  onSelect,
  onLockedSelect,
}: RadiusSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {RADIUS_OPTIONS_MILES.map((miles) => {
        const locked = !isYepPlus && miles > freeCapMiles;
        const active = miles === selectedMiles;
        return (
          <button
            key={miles}
            onClick={() => (locked ? onLockedSelect() : onSelect(miles))}
            className={clsx(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
              active
                ? 'border-ink bg-ink text-white'
                : locked
                ? 'border-black/10 bg-white text-ink/35'
                : 'border-black/10 bg-white text-ink/70 hover:border-ink/30'
            )}
          >
            {miles} mi {locked && '🔒'}
          </button>
        );
      })}
      <button
        onClick={() => (isYepPlus ? onSelect(999) : onLockedSelect())}
        className={clsx(
          'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
          selectedMiles === 999 && isYepPlus
            ? 'border-ink bg-ink text-white'
            : !isYepPlus
            ? 'border-black/10 bg-white text-ink/35'
            : 'border-black/10 bg-white text-ink/70 hover:border-ink/30'
        )}
      >
        Unlimited {!isYepPlus && '🔒'}
      </button>
    </div>
  );
}
