'use client';

import Image from 'next/image';
import Link from 'next/link';
import { HalalBadge } from './HalalBadge';
import { isStockPhoto } from '@/lib/types';
import type { DiscoverCard } from '@/lib/discover';

export function DiscoverFeed({ cards }: { cards: DiscoverCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-120px)] flex-col items-center justify-center px-6 text-center sm:h-[calc(100dvh-56px)]">
        <p className="text-4xl">🍽️</p>
        <p className="mt-3 text-sm text-ink/60">No restaurants to show right now — check back soon.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-120px)] snap-y snap-mandatory overflow-y-scroll scroll-smooth sm:h-[calc(100dvh-56px)]">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={`/restaurant/${card.slug}`}
          className="group relative flex h-[calc(100dvh-120px)] w-full snap-start snap-always items-end justify-center overflow-hidden bg-ink sm:h-[calc(100dvh-56px)]"
        >
          {card.photoUrl ? (
            <Image
              src={card.photoUrl}
              alt={card.name}
              fill
              className="object-cover transition duration-300 group-active:scale-105"
              sizes="100vw"
              priority={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/80 text-5xl">🍽️</div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />

          {card.photoUrl && isStockPhoto(card.photoUrl) && (
            <span className="absolute right-4 top-4 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              Representative photo
            </span>
          )}

          <div className="relative w-full max-w-3xl px-5 pb-10 sm:px-8 sm:pb-14">
            <HalalBadge classification={card.halal_classification} size="lg" />
            <h2 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">{card.name}</h2>
            <p className="mt-1 text-sm text-white/80">
              {card.cuisines.join(' · ') || 'Restaurant'} · {card.address}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition group-hover:bg-white/90">
              View restaurant →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
