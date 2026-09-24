'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, m } from 'motion/react';
import { ArrowRightIcon } from '../icons';
import { SceneMedia, type SceneArt } from '../media/SceneMedia';

// The case for supporting YepItsHalal, told one card at a time.
//
// Shabir, 2026-09-24: not a long page of paragraphs, but "card, next, next,
// next, support ask". The order is the argument: the problem, what we are
// building, the work behind it, what support changes, why it matters, and
// only then the ask. It follows the homepage's AIDA order, with Caples'
// curiosity in the headlines and Kennedy's one ask at the end (see the vault's
// Copywriting framework).
//
// How it is built, and why:
//
//  - Native horizontal scroll with snap points. Swiping on a phone, a
//    trackpad, and the scrollbar all simply work, and without JavaScript it is
//    a row of cards you can scroll.
//  - Back and Next, a progress row whose segments are also buttons, arrow
//    keys, Home and End. "3 of 6" is announced as it changes. Nothing ever
//    advances on its own.
//  - Only the card in view can take focus: the others are inert, so Tab never
//    lands on something off to the side, and each card's moving picture only
//    loads and plays while its card is the one being read.
//  - With reduced motion there is no smooth scrolling and no movement, only
//    the change of card.

export interface StoryCard {
  id: string;
  kicker: string;
  /** Plain words, for the progress buttons and the slide label. */
  label: string;
  title: React.ReactNode;
  body: React.ReactNode;
  /** A picture that fades into the card, or a composed visual instead. */
  art?: SceneArt;
  visual?: React.ReactNode;
}

export function SupportStory({ cards }: { cards: StoryCard[] }) {
  const track = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const last = cards.length - 1;

  // Which card is in view. The observer watches the track, not the window, so
  // it follows swipes and scrollbar drags as well as the buttons.
  useEffect(() => {
    const root = track.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const i = cardRefs.current.indexOf(entry.target as HTMLElement);
            if (i >= 0) setActive(i);
          }
        }
      },
      { root, threshold: [0.6] }
    );
    cardRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [cards.length]);

  // Only the current card can take focus. Set on the DOM node: React 18 does
  // not know the `inert` attribute.
  useEffect(() => {
    cardRefs.current.forEach((el, i) => {
      if (el) (el as HTMLElement & { inert: boolean }).inert = i !== active;
    });
  }, [active]);

  const goTo = useCallback(
    (i: number) => {
      const root = track.current;
      const el = cardRefs.current[Math.max(0, Math.min(last, i))];
      if (!root || !el) return;
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      root.scrollTo({ left: el.offsetLeft - (root.clientWidth - el.clientWidth) / 2, behavior: still ? 'auto' : 'smooth' });
    },
    [last]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    const keys: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: last };
    if (!(e.key in keys)) return;
    e.preventDefault();
    goTo(keys[e.key]);
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Why support YepItsHalal"
      onKeyDown={onKeyDown}
      className="relative"
    >
      {/* Where you are, and a way to jump. Each segment is a button. */}
      <div className="mx-auto flex max-w-[1000px] items-center gap-4 px-5 sm:px-6">
        <ol className="flex flex-1 gap-1.5" aria-label="Cards">
          {cards.map((c, i) => (
            <li key={c.id} className="flex-1">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Card ${i + 1} of ${cards.length}: ${c.label}`}
                aria-current={i === active ? 'step' : undefined}
                className="group flex h-10 w-full items-center"
              >
                <span className="relative h-1 w-full overflow-hidden rounded-full bg-white/20 transition group-hover:bg-white/30">
                  <m.span
                    className="absolute inset-0 origin-left rounded-full bg-accent-onDark"
                    initial={false}
                    animate={{ scaleX: i <= active ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-white/80" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Card </span>
          {active + 1} of {cards.length}
        </p>
      </div>

      <div
        ref={track}
        className="no-scrollbar mt-5 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto overscroll-x-contain px-[max(1.25rem,calc((100vw-1000px)/2))] pb-2 sm:gap-6"
      >
        {cards.map((c, i) => {
          const current = i === active;
          return (
            <m.article
              key={c.id}
              ref={(el: HTMLElement | null) => {
                cardRefs.current[i] = el;
              }}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${cards.length}: ${c.label}`}
              initial={false}
              animate={{ opacity: current ? 1 : 0.42, scale: current ? 1 : 0.965 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="ground-light relative flex w-[min(86vw,1000px)] shrink-0 snap-center flex-col overflow-hidden rounded-2xl bg-sand-soft text-ink shadow-[0_30px_60px_-34px_rgba(4,24,30,0.9)] lg:grid lg:min-h-[28rem] lg:grid-cols-[1fr_1.05fr] xl:min-h-[30rem]"
            >
              {/* Every card is as tall as the tallest (the ask). On a narrow
                  screen the picture takes up whatever the words do not need,
                  so a short card gets a taller picture, never an empty gap. */}
              <div className="relative min-h-[11rem] flex-1 sm:min-h-[14rem] lg:min-h-0">

                {c.art ? (
                  <SceneMedia
                    art={c.art}
                    active={current}
                    className="absolute inset-0"
                    fade={{ bottom: '55%' }}
                    fadeLg={{ right: '42%' }}
                    sizes="(min-width: 1024px) 520px, 86vw"
                    control="top-left"
                  />
                ) : (
                  c.visual
                )}
              </div>

              <div className="flex shrink-0 flex-col px-5 pb-6 pt-2 sm:px-8 sm:pb-8 lg:justify-center lg:py-10 lg:pl-4 lg:pr-12">
                <p className="self-start rounded-full bg-spice-soft px-3 py-1 text-xs font-semibold text-spice-ink">{c.kicker}</p>
                <h2 className="mt-3 text-balance font-display text-[1.6rem] font-semibold leading-[1.1] tracking-[-0.01em] sm:text-[2.1rem] lg:text-[2.35rem]">
                  {c.title}
                </h2>
                <div className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">{c.body}</div>
              </div>
            </m.article>
          );
        })}
      </div>

      <div className="mx-auto mt-5 flex max-w-[1000px] flex-wrap items-center justify-between gap-3 px-5 sm:px-6">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-sm font-semibold text-white ring-1 ring-white/30 transition duration-200 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-35"
        >
          Back
        </button>
        <AnimatePresence mode="wait" initial={false}>
          {active < last ? (
            <m.button
              key="next"
              type="button"
              onClick={() => goTo(active + 1)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-ink shadow-sm transition duration-200 hover:-translate-y-px hover:bg-sand-soft"
            >
              Next
              <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </m.button>
          ) : (
            <m.button
              key="again"
              type="button"
              onClick={() => goTo(0)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-sm font-semibold text-white/85 underline decoration-white/35 underline-offset-4 transition hover:text-white"
            >
              Back to the start
            </m.button>
          )}
        </AnimatePresence>
      </div>

      {/* For a reader who already knows the story. Hidden, not removed, on
          the last card, so nothing below it moves. */}
      <p className={clsx('mx-auto mt-3 max-w-[1000px] px-5 text-center text-sm sm:px-6', active === last && 'invisible')}>
        <button
          type="button"
          onClick={() => goTo(last)}
          tabIndex={active === last ? -1 : undefined}
          className="inline-flex min-h-[44px] items-center font-medium text-white/75 underline decoration-white/30 underline-offset-4 transition hover:text-white"
        >
          Skip to supporting
        </button>
      </p>
    </div>
  );
}
