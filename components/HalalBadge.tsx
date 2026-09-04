import clsx from 'clsx';
import type { HalalClassification } from '@/lib/types';

// The three statuses are never distinguished by colour alone: each carries its
// own word, and the dot's *shape* differs too (solid / ringed / hollow), so the
// badge still separates on a greyscale or colour-blind rendering.
const CONFIG: Record<
  HalalClassification,
  { label: string; dot: string; text: string; bg: string; ring: string }
> = {
  fully_halal: {
    label: 'Fully Halal',
    dot: 'bg-halal-full',
    text: 'text-halal-fullInk',
    bg: 'bg-halal-fullSoft',
    ring: 'ring-halal-full/20',
  },
  halal_options: {
    label: 'Halal Options',
    dot: 'bg-halal-partial ring-2 ring-inset ring-white/70',
    text: 'text-halal-partialInk',
    bg: 'bg-halal-partialSoft',
    ring: 'ring-halal-partial/20',
  },
  unverified: {
    label: 'Unverified',
    dot: 'bg-transparent border-2 border-halal-unverified',
    text: 'text-halal-unverifiedInk',
    bg: 'bg-halal-unverifiedSoft',
    ring: 'ring-halal-unverified/20',
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
    size === 'sm'
      ? 'text-xs px-2 py-0.5 gap-1.5'
      : size === 'lg'
      ? 'text-sm px-3.5 py-1.5 gap-2'
      : 'text-xs px-2.5 py-1 gap-1.5';
  const dotSize = size === 'lg' ? 'h-2.5 w-2.5' : size === 'sm' ? 'h-2 w-2' : 'h-2 w-2';

  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1',
        cfg.bg,
        cfg.text,
        cfg.ring,
        sizeClasses
      )}
    >
      <span className={clsx('shrink-0 rounded-full', cfg.dot, dotSize)} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

export function halalLabel(classification: HalalClassification): string {
  return CONFIG[classification].label;
}
