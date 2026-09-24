'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

// A picture, and sometimes a short silent loop, built into the ground it sits
// on instead of placed on top of it in a box.
//
// Until 2026-09-24 every picture on the site was a rounded frame with a ring
// and a shadow: a photo placed on the page. Here the picture has no edge of
// its own. Each side it shares with the page fades out through an eased mask,
// so the forest (or the sand) with its lights and grain shows through where
// the photo ends, and the section's own grain runs across both.
//
// Served as static files from /public/media, never through the image
// optimiser (see the 2026-09-19 quota incident), with a separate composition
// for narrow screens where one exists: a phone gets the tall photo and the
// tall loop, not a sliver cropped out of the wide one.
//
// The loop is treated as a nicety. It is only fetched when:
//
//  - the frame is actually displayed (a hidden frame never fetches anything)
//  - the screen is at least `videoMinWidth` wide
//  - the visitor has not asked for reduced motion or to save data
//  - the frame is on screen; it pauses when scrolled away
//
// Moving content that plays for more than five seconds needs a way to stop it
// (WCAG 2.2.2). That is a small word, "Pause", in the corner of the picture,
// never a round play button sitting on the image: the loop is part of the
// page, not a video player. The choice lasts for the rest of the visit.

export interface SceneSource {
  /** Path without size or extension, e.g. /media/london-high-street-wide */
  still: string;
  /** Widths that exist on disk, smallest first. */
  widths: number[];
  video?: string;
}

export interface SceneArt extends SceneSource {
  alt: string;
  /** What the loop shows, read out in place of the still's alt. */
  videoLabel?: string;
  /** A lighter loop for phones when there is no tall composition. */
  videoSmall?: string;
  /** A different composition for screens narrower than `below`. */
  narrow?: SceneSource & { below: number };
}

type Fade = { left?: string; right?: string; top?: string; bottom?: string };

const PAUSED_KEY = 'yih:hero-art-paused';

/** An eased mask along one axis: soft where it starts, solid by `len`. */
function axisMask(axis: 'x' | 'y', start?: string, end?: string): string {
  if (!start && !end) return 'none';
  const to = axis === 'x' ? 'to right' : 'to bottom';
  const s = start
    ? [
        'transparent 0%',
        `rgba(0,0,0,0.12) calc(${start} * 0.28)`,
        `rgba(0,0,0,0.42) calc(${start} * 0.52)`,
        `rgba(0,0,0,0.78) calc(${start} * 0.76)`,
        `#000 ${start}`,
      ]
    : ['#000 0%'];
  const e = end
    ? [
        `#000 calc(100% - ${end})`,
        `rgba(0,0,0,0.78) calc(100% - ${end} * 0.76)`,
        `rgba(0,0,0,0.42) calc(100% - ${end} * 0.52)`,
        `rgba(0,0,0,0.12) calc(100% - ${end} * 0.28)`,
        'transparent 100%',
      ]
    : ['#000 100%'];
  return `linear-gradient(${to}, ${[...s, ...e].join(', ')})`;
}

function srcSet(still: string, widths: number[], ext: string) {
  return widths.map((w) => `${still}-${w}.${ext} ${w}w`).join(', ');
}

export function SceneMedia({
  art,
  className,
  fade = {},
  fadeLg,
  position = 'center',
  positionLg,
  eager = false,
  sizes = '100vw',
  videoMinWidth = 0,
  decorative = true,
  control = 'bottom-right',
  controlTone = 'light',
  active = true,
  children,
}: {
  art: SceneArt;
  /** Positioning and size: the frame fills whatever box this describes. */
  className?: string;
  /** How far in from each edge the picture fades into the ground, on phones. */
  fade?: Fade;
  /** The same from 1024px up. Falls back to `fade`. */
  fadeLg?: Fade;
  /** object-position of the photo and loop. */
  position?: string;
  positionLg?: string;
  /** For art that is the first thing on screen. */
  eager?: boolean;
  sizes?: string;
  /** Narrowest screen that may fetch a loop at all. */
  videoMinWidth?: number;
  /** Behind or beside words that already say it: empty alt, loop hidden from screen readers. */
  decorative?: boolean;
  control?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | 'none';
  controlTone?: 'light' | 'dark';
  /**
   * False while this picture is not the one being looked at (a card in a deck
   * that has not been reached): the loop is not fetched, or is paused.
   */
  active?: boolean;
  /** Overlays that belong to the picture, such as a scrim under text. */
  children?: React.ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = frame.current;
    if (!active || src || !el || el.offsetParent === null) return;
    const width = window.innerWidth;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (width < videoMinWidth || still || saveData) return;
    const narrow = art.narrow && width < art.narrow.below;
    const chosen = narrow ? art.narrow!.video : width < 768 ? art.videoSmall ?? art.video : art.video;
    if (!chosen) return;
    let remembered = false;
    try {
      remembered = sessionStorage.getItem(PAUSED_KEY) === '1';
    } catch {
      /* storage can be blocked; the default is fine */
    }
    setPaused(remembered);
    // After the page has settled, so the loop never competes with the words.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const start = () => setSrc(chosen);
    if (idle) idle(start);
    else window.setTimeout(start, 400);
    // `src` is deliberately left out: once a loop is chosen it stays chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, videoMinWidth, active]);

  // Play only while on screen, current, and not paused by the visitor.
  useEffect(() => {
    const v = video.current;
    const el = frame.current;
    if (!v || !el || !src) return;
    if (!active) {
      v.pause();
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      if (!paused) v.play().catch(() => {});
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !paused) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [src, paused, active]);

  function toggle() {
    const next = !paused;
    setPaused(next);
    try {
      sessionStorage.setItem(PAUSED_KEY, next ? '1' : '0');
    } catch {
      /* not essential */
    }
    const v = video.current;
    if (v) {
      if (next) v.pause();
      else v.play().catch(() => {});
    }
  }

  const lg = fadeLg ?? fade;
  const style = {
    '--mask-x': axisMask('x', fade.left, fade.right),
    '--mask-y': axisMask('y', fade.top, fade.bottom),
    '--mask-x-lg': axisMask('x', lg.left, lg.right),
    '--mask-y-lg': axisMask('y', lg.top, lg.bottom),
    '--scene-pos': position,
    '--scene-pos-lg': positionLg ?? position,
  } as React.CSSProperties;

  const { narrow } = art;
  const alt = decorative ? '' : art.alt;

  return (
    <div ref={frame} className={clsx('scene-media pointer-events-none', className)} style={style}>
      <div className="scene-mask-x absolute inset-0">
        <div className="scene-mask-y absolute inset-0">
          <picture>
            {narrow && (
              <>
                <source media={`(max-width: ${narrow.below - 1}px)`} type="image/avif" srcSet={srcSet(narrow.still, narrow.widths, 'avif')} sizes="100vw" />
                <source media={`(max-width: ${narrow.below - 1}px)`} type="image/webp" srcSet={srcSet(narrow.still, narrow.widths, 'webp')} sizes="100vw" />
                <source media={`(max-width: ${narrow.below - 1}px)`} srcSet={srcSet(narrow.still, narrow.widths, 'jpg')} sizes="100vw" />
              </>
            )}
            <source type="image/avif" srcSet={srcSet(art.still, art.widths, 'avif')} sizes={sizes} />
            <source type="image/webp" srcSet={srcSet(art.still, art.widths, 'webp')} sizes={sizes} />
            <img
              src={`${art.still}-${art.widths[Math.min(1, art.widths.length - 1)]}.jpg`}
              srcSet={srcSet(art.still, art.widths, 'jpg')}
              sizes={sizes}
              alt={src && ready ? '' : alt}
              aria-hidden={decorative || undefined}
              // The frame is sized by its container; these only give the
              // browser the picture's own proportions before it arrives.
              width={art.widths[art.widths.length - 1]}
              height={Math.round((art.widths[art.widths.length - 1] * 9) / 16)}
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : undefined}
              decoding="async"
              className="scene-fit absolute inset-0 h-full w-full"
            />
          </picture>

          {src && (
            <video
              ref={video}
              src={src}
              muted
              loop
              playsInline
              autoPlay={!paused}
              preload="auto"
              aria-hidden={decorative || undefined}
              aria-label={decorative ? undefined : art.videoLabel ?? art.alt}
              onPlaying={() => setReady(true)}
              className={clsx(
                'scene-fit absolute inset-0 h-full w-full transition-opacity duration-1000 ease-out',
                ready ? 'opacity-100' : 'opacity-0'
              )}
            />
          )}
          {children}
        </div>
      </div>

      {src && ready && control !== 'none' && (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={paused}
          aria-label={paused ? 'Play the moving picture' : 'Pause the moving picture'}
          className={clsx(
            'scene-control pointer-events-auto absolute inline-flex min-h-[40px] items-center px-3 text-[12px] font-semibold tracking-wide underline underline-offset-4 transition-opacity duration-200',
            control === 'bottom-right' && 'bottom-2 right-2',
            control === 'top-right' && 'right-2 top-2',
            control === 'bottom-left' && 'bottom-2 left-2',
            control === 'top-left' && 'left-2 top-2',
            controlTone === 'light'
              ? 'text-white decoration-white/40 [text-shadow:0_1px_6px_rgba(4,24,30,0.7)] hover:decoration-white'
              : 'text-ink decoration-ink/30 hover:decoration-ink'
          )}
        >
          {paused ? 'Play' : 'Pause'}
        </button>
      )}
    </div>
  );
}
