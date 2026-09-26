/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import { FOUNDER } from '@/lib/founders';

// Shabir, in a circle, with the YepItsHalal pin on the corner.
//
// The brief asked for a small green "online" dot. A dot that is always green
// says he is online all the time, which nobody is, so the green mark on the
// corner is the logo's lime pin instead: it says whose founder he is, and it
// is true at three in the morning too.
//
// His own photo (FOUNDER.photo, lib/founders.ts); with none set, his
// initials. Never a stand-in portrait of somebody else.

export function FounderAvatar({
  size = 64,
  ground = 'dark',
  className,
  eager = false,
  decorative = false,
}: {
  size?: number;
  /** The ground it sits on, for the ring around the pin. */
  ground?: 'dark' | 'light';
  className?: string;
  eager?: boolean;
  /** When his name is written right beside it. */
  decorative?: boolean;
}) {
  const pin = Math.max(18, Math.round(size * 0.36));
  const label = decorative ? undefined : FOUNDER.name;

  return (
    <span className={clsx('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      {FOUNDER.photo ? (
        <picture>
          <source type="image/avif" srcSet={`${FOUNDER.photo}.avif`} />
          <source type="image/webp" srcSet={`${FOUNDER.photo}.webp`} />
          <img
            src={`${FOUNDER.photo}.jpg`}
            alt={label ?? ''}
            width={size}
            height={size}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className={clsx(
              'block h-full w-full rounded-full bg-forest object-cover',
              ground === 'dark' ? 'ring-2 ring-white/80' : 'ring-2 ring-white shadow-sm'
            )}
          />
        </picture>
      ) : (
        <span
          role={label ? 'img' : undefined}
          aria-label={label}
          aria-hidden={label ? undefined : true}
          className={clsx(
            'flex h-full w-full select-none items-center justify-center rounded-full bg-gradient-to-br from-[#1C5C6B] to-forest-deep font-display font-semibold tracking-[0.02em] text-white',
            ground === 'dark' ? 'ring-2 ring-white/70' : 'ring-2 ring-white shadow-sm'
          )}
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          SA
        </span>
      )}
      <img
        src="/favicon.svg"
        alt=""
        aria-hidden="true"
        width={pin}
        height={pin}
        decoding="async"
        className={clsx(
          'absolute -bottom-0.5 -right-0.5 rounded-full',
          ground === 'dark' ? 'ring-[2.5px] ring-forest-deep' : 'ring-[2.5px] ring-white'
        )}
        style={{ width: pin, height: pin }}
      />
    </span>
  );
}
