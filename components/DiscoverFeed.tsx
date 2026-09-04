'use client';

import Image from 'next/image';
import Link from 'next/link';
import { HalalBadge } from './HalalBadge';
import { ForkKnifeIcon, ArrowRightIcon } from './icons';
import { isStockPhoto } from '@/lib/types';
import type { DiscoverCard } from '@/lib/discover';

// One card per viewport, minus the header (56px) and — on phones — the bottom
// tab bar (64px).
const CARD_HEIGHT = 'h-[calc(100dvh-120px)] sm:h-[calc(100dvh-56px)]';

export function DiscoverFeed({ cards }: { cards: DiscoverCard[] }) {
  if (cards.length === 0) {
    return (
      <div className={`flex ${CARD_HEIGHT} flex-col items-center justify-center px-6 text-center`}>
        <ForkKnifeIcon className="h-10 w-10 text-subtle" />
        <p className="mt-3 text-sm text-muted">
          No restaurants to show right now — check back soon.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink"
        >
          Search by area instead
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`${CARD_HEIGHT} snap-y snap-mandatory overflow-y-scroll scroll-smooth`}
      aria-label="Restaurant feed"
    >
      <h1 className="sr-only">Discover halal restaurants in London</h1>
      {cards.map((card, index) => (
        <Link
          key={card.id}
          href={`/restaurant/${card.slug}`}
          className={`group relative flex ${CARD_HEIGHT} w-full snap-start snap-always items-end justify-center overflow-hidden bg-ink`}
        >
          {card.photoUrl ? (
            <Image
              src={card.photoUrl}
              alt=""
              fill
              className="object-cover transition duration-300 group-active:scale-105"
              sizes="100vw"
              // Only the card that is actually on screen at load is worth
              // blocking on; the rest stream in as the feed is scrolled.
              priority={index === 0}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/80 text-white/40">
              <ForkKnifeIcon className="h-14 w-14" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

          {card.photoUrl && isStockPhoto(card.photoUrl) && (
            <span className="absolute right-4 top-4 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              Representative photo
            </span>
          )}

          <div className="relative w-full max-w-3xl px-5 pb-10 sm:px-8 sm:pb-14">
            <HalalBadge classification={card.halal_classification} size="lg" />
            <h2 className="mt-3 text-balance font-display text-2xl font-semibold text-white sm:text-3xl">
              {card.name}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              {card.cuisines.join(' · ') || 'Restaurant'}
              <span className="mx-1.5 text-white/50" aria-hidden="true">
                ·
              </span>
              {card.address}
            </p>
            <span className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-ink transition group-hover:bg-white/90">
              View restaurant
              <ArrowRightIcon className="h-4 w-4" />
            </span>
          </div>

          {/* Nothing on a full-bleed photo says "there is more below" — this does. */}
          {index === 0 && cards.length > 1 && (
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-medium uppercase tracking-wide text-white/60">
              Scroll for more
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
