'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { HalalBadge } from './HalalBadge';
import { XIcon, ArrowRightIcon, SparkleIcon } from './icons';
import { toEmbedUrl } from '@/lib/reelEmbed';
import type { Reel } from '@/lib/reels';
import type { HalalClassification } from '@/lib/types';

interface ReelShowcaseProps {
  reels: Reel[];
  restaurantName: string;
  classification: HalalClassification;
  isPartner: boolean;
}

/**
 * "Latest from X" — the reel layer on a restaurant page.
 *
 * The brief is explicit that reels must not push the halal information aside,
 * so this sits *below* the verification panel in the page order, and the viewer
 * keeps the halal badge pinned next to the restaurant name the whole time. A
 * promotional layer that obscured the trust signal would invert the point of
 * the product.
 */
export function ReelShowcase({
  reels,
  restaurantName,
  classification,
  isPartner,
}: ReelShowcaseProps) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (reels.length === 0) return null;

  return (
    <section aria-labelledby="reels-heading">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="reels-heading" className="font-display text-lg font-semibold text-ink">
          Latest from {restaurantName}
        </h2>
        {isPartner && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-ink">
            <SparkleIcon className="h-3 w-3" />
            Partner
          </span>
        )}
      </div>

      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {reels.map((reel, i) => (
          <li key={reel.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setOpenAt(i)}
              className="group relative block aspect-[9/16] w-[148px] overflow-hidden rounded-2xl bg-ink ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:shadow-lg sm:w-[168px]"
            >
              <ReelPoster reel={reel} alt={`Reel from ${restaurantName}`} />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <span className="pointer-events-none absolute inset-x-2 bottom-2 text-left">
                {reel.caption && (
                  <span className="line-clamp-2 text-[12px] font-medium leading-snug text-white">
                    {reel.caption}
                  </span>
                )}
              </span>
              <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg transition group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {openAt !== null && (
        <ReelViewer
          reels={reels}
          index={openAt}
          onIndexChange={setOpenAt}
          onClose={() => setOpenAt(null)}
          restaurantName={restaurantName}
          classification={classification}
        />
      )}
    </section>
  );
}

function ReelPoster({ reel, alt }: { reel: Reel; alt: string }) {
  if (reel.cover_url) {
    return (
      <Image
        src={reel.cover_url}
        alt={alt}
        fill
        sizes="168px"
        className="object-cover transition duration-300 group-hover:scale-105"
      />
    );
  }
  // An uploaded reel with no cover: the browser paints its first frame.
  return (
    <video
      src={reel.media_url}
      className="h-full w-full object-cover"
      muted
      playsInline
      preload="metadata"
      aria-label={alt}
    />
  );
}

function ReelViewer({
  reels,
  index,
  onIndexChange,
  onClose,
  restaurantName,
  classification,
}: {
  reels: Reel[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  restaurantName: string;
  classification: HalalClassification;
}) {
  const reel = reels[index];
  const closeRef = useRef<HTMLButtonElement>(null);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < reels.length) onIndexChange(next);
    },
    [index, reels.length, onIndexChange]
  );

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    // The page behind must not scroll while a full-screen viewer is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  const embedUrl =
    reel.media_kind === 'embed' && reel.provider
      ? toEmbedUrl(reel.provider, reel.media_url, reel.provider === 'youtube')
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Reels from ${restaurantName}`}
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur"
    >
      {/* Identity and halal status stay visible for the whole session — the
          promotional content never displaces the trust signal. */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-white">{restaurantName}</p>
          <div className="mt-1.5">
            <HalalBadge classification={classification} size="sm" variant="solid" />
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close reels"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 sm:px-6">
        <div className="relative h-full max-h-[70vh] w-full max-w-[min(100%,420px)] overflow-hidden rounded-2xl bg-black">
          {reel.media_kind === 'upload' ? (
            <video
              key={reel.id}
              src={reel.media_url}
              className="h-full w-full object-contain"
              controls
              autoPlay
              muted
              playsInline
              loop
            />
          ) : embedUrl ? (
            <iframe
              key={reel.id}
              src={embedUrl}
              title={reel.caption ?? `Reel from ${restaurantName}`}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <a
              href={reel.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-semibold text-white underline"
            >
              Open this reel on {reel.provider}
            </a>
          )}
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        {reel.caption && (
          <p className="mx-auto max-w-md text-pretty text-center text-sm leading-relaxed text-white/85">
            {reel.caption}
          </p>
        )}

        {reels.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-35"
              aria-label="Previous reel"
            >
              <ArrowRightIcon className="h-5 w-5 rotate-180" />
            </button>
            <p className="text-xs font-medium tabular-nums text-white/70" aria-live="polite">
              {index + 1} of {reels.length}
            </p>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index === reels.length - 1}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-35"
              aria-label="Next reel"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
