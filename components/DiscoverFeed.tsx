'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HalalBadge } from './HalalBadge';
import { ForkKnifeIcon, ArrowRightIcon, SparkleIcon } from './icons';
import { toEmbedUrl, canAutoplay } from '@/lib/reelEmbed';
import { isStockPhoto } from '@/lib/types';
import type { DiscoverItem } from '@/lib/reels';

// One card per viewport, minus the header (56px) and — on phones — the bottom
// tab bar (64px).
const CARD_HEIGHT = 'h-[calc(100dvh-120px)] sm:h-[calc(100dvh-56px)]';

export function DiscoverFeed({ items }: { items: DiscoverItem[] }) {
  if (items.length === 0) {
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
      {items.map((item, index) => (
        <DiscoverCard key={item.key} item={item} index={index} total={items.length} />
      ))}
    </div>
  );
}

function DiscoverCard({
  item,
  index,
  total,
}: {
  item: DiscoverItem;
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(index === 0);
  const [embedLive, setEmbedLive] = useState(false);

  // Only the card actually on screen plays. Without this every video in the
  // feed would decode at once, which on a phone is the difference between a
  // smooth scroll and a hot, stuttering one.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting && entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {
        // Autoplay can still be refused (low power mode, data saver). The
        // controls remain, so the card is not broken — just not automatic.
      });
    } else {
      v.pause();
      setEmbedLive(false);
    }
  }, [active]);

  const isReel = item.kind === 'reel';
  const autoplays = canAutoplay(item.provider, item.mediaKind);
  const embedUrl =
    isReel && item.mediaKind === 'embed' && item.provider
      ? toEmbedUrl(item.provider, item.mediaUrl, autoplays)
      : null;

  return (
    <section
      ref={ref}
      className={`relative flex ${CARD_HEIGHT} w-full snap-start snap-always items-end justify-center overflow-hidden bg-ink`}
      aria-label={`${item.name}, card ${index + 1} of ${total}`}
    >
      {/* Media layer */}
      {isReel && item.mediaKind === 'upload' ? (
        <video
          ref={videoRef}
          src={item.mediaUrl}
          poster={item.coverUrl ?? undefined}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload={index < 2 ? 'auto' : 'none'}
        />
      ) : isReel && embedUrl && (embedLive || (autoplays && active)) ? (
        <iframe
          src={embedUrl}
          title={item.caption ?? `Reel from ${item.name}`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : item.coverUrl || item.mediaUrl ? (
        <Image
          src={item.coverUrl ?? item.mediaUrl}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority={index === 0}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/80 text-white/40">
          <ForkKnifeIcon className="h-14 w-14" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

      {/* Instagram and TikTok refuse to autoplay in an iframe, so those get an
          explicit play affordance rather than a card that looks broken. */}
      {isReel && embedUrl && !autoplays && !embedLive && (
        <button
          type="button"
          onClick={() => setEmbedLive(true)}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-xl transition hover:scale-105"
          aria-label={`Play reel from ${item.name}`}
        >
          <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
          </svg>
        </button>
      )}

      {item.kind === 'photo' && isStockPhoto(item.mediaUrl) && (
        <span className="absolute right-4 top-4 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          Representative photo
        </span>
      )}

      {isReel && item.isPartner && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          <SparkleIcon className="h-3.5 w-3.5 text-accent-onDark" />
          Partner
        </span>
      )}

      <div className="relative w-full max-w-3xl px-5 pb-10 sm:px-8 sm:pb-14">
        <HalalBadge classification={item.halal_classification} size="lg" variant="solid" />
        <h2 className="mt-3 text-balance font-display text-2xl font-semibold text-white sm:text-3xl">
          {item.name}
        </h2>
        {item.caption ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/90">{item.caption}</p>
        ) : null}
        <p className="mt-1 text-sm text-white/80">
          {item.cuisines.join(' · ') || 'Restaurant'}
          <span className="mx-1.5 text-white/50" aria-hidden="true">
            ·
          </span>
          {item.address}
        </p>
        <Link
          href={`/restaurant/${item.slug}`}
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-ink transition hover:bg-white/90"
        >
          View restaurant
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {index === 0 && total > 1 && (
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-medium uppercase tracking-wide text-white/60">
          Scroll for more
        </span>
      )}
    </section>
  );
}
