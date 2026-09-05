import clsx from 'clsx';
import { HalalFullMark, HalalPartialMark, HalalUnknownMark } from './icons';
import type { HalalClassification } from '@/lib/types';

// Two jobs, two shapes.
//
// `inline` is the default because it is what appears in lists, and in a list the
// status is a *reading* about one restaurant, not a bucket it belongs to. As a
// tinted pill it had the same visual weight as the cuisine tag beside it, so it
// scanned as another category chip. Mark plus word, no chip, reads as a status.
//
// `solid` keeps the filled pill for the two places that need to hold their own
// against a photograph or act as a page-level headline.
//
// The mark does the semantic work in both: filled-with-a-tick / half-filled /
// dashed-and-empty survives greyscale and colour blindness, where three
// coloured dots did not.
const CONFIG: Record<
  HalalClassification,
  { label: string; hint: string; Mark: typeof HalalFullMark; text: string; bg: string; ring: string }
> = {
  fully_halal: {
    label: 'Fully Halal',
    hint: 'Everything on the menu',
    Mark: HalalFullMark,
    text: 'text-halal-fullInk',
    bg: 'bg-halal-fullSoft',
    ring: 'ring-halal-full/20',
  },
  halal_options: {
    label: 'Halal Options',
    hint: 'Some of the menu',
    Mark: HalalPartialMark,
    text: 'text-halal-partialInk',
    bg: 'bg-halal-partialSoft',
    ring: 'ring-halal-partial/20',
  },
  unverified: {
    label: 'Unverified',
    hint: "We haven't checked yet",
    Mark: HalalUnknownMark,
    text: 'text-halal-unverifiedInk',
    bg: 'bg-halal-unverifiedSoft',
    ring: 'ring-halal-unverified/20',
  },
};

export function HalalBadge({
  classification,
  size = 'md',
  variant = 'inline',
}: {
  classification: HalalClassification;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'solid';
}) {
  const cfg = CONFIG[classification];
  const Mark = cfg.Mark;

  const markSize = size === 'lg' ? 'h-[18px] w-[18px]' : size === 'sm' ? 'h-4 w-4' : 'h-[17px] w-[17px]';
  const textSize = size === 'lg' ? 'text-sm' : size === 'sm' ? 'text-xs' : 'text-[13px]';

  if (variant === 'inline') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 whitespace-nowrap font-semibold',
          cfg.text,
          textSize
        )}
      >
        <Mark className={clsx('shrink-0', markSize)} />
        {cfg.label}
      </span>
    );
  }

  const pad = size === 'lg' ? 'px-3 py-1.5 gap-2' : size === 'sm' ? 'px-2 py-0.5 gap-1.5' : 'px-2.5 py-1 gap-1.5';

  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1',
        cfg.bg,
        cfg.text,
        cfg.ring,
        pad,
        textSize
      )}
    >
      <Mark className={clsx('shrink-0', markSize)} />
      {cfg.label}
    </span>
  );
}

export function halalLabel(classification: HalalClassification): string {
  return CONFIG[classification].label;
}

export function halalHint(classification: HalalClassification): string {
  return CONFIG[classification].hint;
}
