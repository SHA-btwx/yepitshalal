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
// The loop is the generated original, untouched (lib/media.ts), on every
// screen. A clip is five seconds and was not made to loop, so two copies of
// the same file take turns: just before one ends, the other starts from the
// beginning and fades in over it. The seam disappears without re-encoding
// anything. The second copy only loads once the first is fully buffered, so
// it comes from the browser's cache rather than the network.
//
// It is only fetched when:
//
//  - the frame is actually displayed (a hidden frame never fetches anything)
//  - the screen is at least `videoMinWidth` wide
//  - the visitor has not asked for reduced motion or to save data
//  - the frame is within a screen of being seen; it pauses when scrolled away
//
// No player controls. Shabir, 2026-09-24: "the video should just be looping in
// the background". Moving content that plays for more than five seconds still
// needs a way to stop it (WCAG 2.2.2), so a "Pause" control exists for keyboard
// users and appears only when tabbed to; with reduced motion there is no loop
// at all. The choice lasts for the rest of the visit.

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
  /** A different composition for screens narrower than `below`. */
  narrow?: SceneSource & { below: number };
}

type Fade = { left?: string; right?: string; top?: string; bottom?: string };

const PAUSED_KEY = 'yih:hero-art-paused';
/** Seconds the two copies overlap at the loop point. */
const CROSSFADE_S = 0.9;

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
  /** Where the keyboard-only Pause control appears when it has focus. */
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
  const first = useRef<HTMLVideoElement>(null);
  const second = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  // The second copy exists once the first has fully buffered.
  const [twin, setTwin] = useState(false);
  // Which copy is showing: 0 the first, 1 the second.
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);
  const swapping = useRef(false);

  useEffect(() => {
    const el = frame.current;
    if (!active || src || !el || el.offsetParent === null) return;
    const width = window.innerWidth;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (width < videoMinWidth || still || saveData) return;
    const narrow = art.narrow && width < art.narrow.below;
    const chosen = narrow ? art.narrow!.video : art.video;
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
    const start = () => {
      if (idle) idle(() => setSrc(chosen));
      else window.setTimeout(() => setSrc(chosen), 400);
    };
    if (typeof IntersectionObserver === 'undefined') {
      start();
      return;
    }
    // The originals are 3 to 8 MB each, so a loop further down the page is
    // only fetched once it is within a screen of being seen.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        start();
      },
      { rootMargin: '100% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // `src` is deliberately left out: once a loop is chosen it stays chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, videoMinWidth, active]);

  // Whether the frame is on screen at all.
  useEffect(() => {
    const el = frame.current;
    if (!el || !src) return;
    if (typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  const running = Boolean(src) && active && onScreen && !paused;

  // Play the copy in front while running; just before it ends, start the other
  // from the beginning and hand over.
  useEffect(() => {
    const copies = [first.current, second.current];
    if (!src) return;
    if (!running) {
      copies.forEach((v) => v?.pause());
      return;
    }
    copies[frontRef.current]?.play().catch(() => {});
    let raf = 0;
    let settle = 0;
    const tick = () => {
      const f = frontRef.current;
      const now = [first.current, second.current][f];
      const next = [first.current, second.current][1 - f];
      if (now && next && !swapping.current && now.duration && now.duration - now.currentTime <= CROSSFADE_S) {
        swapping.current = true;
        next.currentTime = 0;
        next.play().catch(() => {});
        frontRef.current = 1 - f;
        setFront(1 - f);
        settle = window.setTimeout(() => {
          now.pause();
          now.currentTime = 0;
          swapping.current = false;
        }, CROSSFADE_S * 1000 + 60);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      swapping.current = false;
    };
  }, [src, running, twin]);

  function toggle() {
    const next = !paused;
    setPaused(next);
    try {
      sessionStorage.setItem(PAUSED_KEY, next ? '1' : '0');
    } catch {
      /* not essential */
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
  // The first reveal is slow and gentle; after that the copies cross in time
  // with the handover.
  const fadeMs = ready ? CROSSFADE_S * 1000 : 1000;
  const copyClass = 'scene-fit absolute inset-0 h-full w-full transition-opacity ease-linear';

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
              ref={first}
              src={src}
              muted
              playsInline
              // Until the second copy exists, the first loops on its own.
              loop={!twin}
              preload="auto"
              aria-hidden={decorative || undefined}
              aria-label={decorative ? undefined : art.videoLabel ?? art.alt}
              onPlaying={() => setReady(true)}
              onCanPlayThrough={() => setTwin(true)}
              className={copyClass}
              style={{ opacity: ready && front === 0 ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
            />
          )}
          {src && twin && (
            <video
              ref={second}
              src={src}
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
              className={copyClass}
              style={{ opacity: front === 1 ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
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
            // Invisible until a keyboard reaches it.
            'scene-control sr-only focus-visible:not-sr-only focus-visible:pointer-events-auto focus-visible:absolute focus-visible:inline-flex focus-visible:min-h-[40px] focus-visible:items-center focus-visible:px-3 focus-visible:text-[12px] focus-visible:font-semibold focus-visible:underline focus-visible:underline-offset-4',
            control === 'bottom-right' && 'focus-visible:bottom-2 focus-visible:right-2',
            control === 'top-right' && 'focus-visible:right-2 focus-visible:top-2',
            control === 'bottom-left' && 'focus-visible:bottom-2 focus-visible:left-2',
            control === 'top-left' && 'focus-visible:left-2 focus-visible:top-2',
            controlTone === 'light'
              ? 'text-white [text-shadow:0_1px_6px_rgba(4,24,30,0.7)]'
              : 'text-ink'
          )}
        >
          {paused ? 'Play' : 'Pause'}
        </button>
      )}
    </div>
  );
}
