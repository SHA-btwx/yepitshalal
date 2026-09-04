import clsx from 'clsx';
import type { HalalClassification } from '@/lib/types';

const CONFIG: Record<
  HalalClassification,
  { label: string; dot: string; text: string; bg: string }
> = {
  fully_halal: {
    label: 'Fully Halal',
    dot: 'bg-halal-full',
    text: 'text-halal-full',
    bg: 'bg-halal-fullSoft',
  },
  halal_options: {
    label: 'Halal Options',
    dot: 'bg-halal-partial',
    text: 'text-halal-partial',
    bg: 'bg-halal-partialSoft',
  },
  unverified: {
    label: 'Unverified',
    dot: 'bg-halal-unverified',
    text: 'text-halal-unverified',
    bg: 'bg-halal-unverifiedSoft',
  },
};

export function HalalBadge({
  classification,
  size = 'md',
}: {
  classification: HalalClassification;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cfg = CONFIG[classification];
  const sizeClasses =
    size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : size === 'lg' ? 'text-sm px-3.5 py-1.5 gap-2' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-semibold whitespace-nowrap',
        cfg.bg,
        cfg.text,
        sizeClasses
      )}
    >
      <span className={clsx('rounded-full', cfg.dot, size === 'lg' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5')} />
      {cfg.label}
    </span>
  );
}

export function halalLabel(classification: HalalClassification): string {
  return CONFIG[classification].label;
}
