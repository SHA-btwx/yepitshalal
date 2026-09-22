'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRightIcon, XIcon } from './icons';
import { LogoMark } from './Logo';
import { ctaPrimary } from './cta';
import type { IntroStage } from '@/lib/introStages';

// The introduction: four stages, ninety seconds, and a door that is never
// locked.
//
// An interstitial is the most intrusive thing a site can do to somebody who
// has just arrived, so every decision here is about making it cheap to leave:
//
//  - The close button is in the first tab stop and the first thing focused. It
//    is present at stage one, it never moves, and no animation can hide it.
//  - Escape closes. Clicking the scrim closes. The dismiss link at the bottom
//    of every stage closes, and says what closing gets you.
//  - It shows once per person, ever, not once per visit. Somebody who has read
//    it has read it.
//  - It mounts after hydration, so it is never in the server HTML: a crawler
//    sees the page, and the page is never blocked waiting for this.
//
// Two things it deliberately does not do. It does not autoplay through the
// stages, because taking the pace out of a reader's hands is the same rudeness
// as trapping them. And it does not count down, gate, or otherwise pretend the
// supporter tier is scarce: see the standing rule on invented urgency.

const SEEN_KEY = 'yih.intro.seen.v1';

/** Storage can throw in private mode or with cookies blocked. Never let it break the page. */
function hasSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // Cannot remember, so do not nag: treat an unreadable store as "seen".
    return true;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* Nothing to do, and nothing worth telling anybody. */
  }
}

export function IntroSequence({ stages }: { stages: IntroStage[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const closeRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  const total = stages.length;
  const stage = stages[index];
  const isLast = index === total - 1;

  const close = useCallback(() => {
    markSeen();
    setOpen(false);
    // Put focus back where the page would have had it.
    const el = returnFocusTo.current;
    if (el instanceof HTMLElement) el.focus({ preventScroll: true });
  }, []);

  // Mount only after hydration, and only for somebody who has not read it.
  useEffect(() => {
    if (hasSeen()) return;
    returnFocusTo.current = document.activeElement;
    setOpen(true);
  }, []);

  // While it is open: no background scroll, Escape closes, Tab stays inside.
  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    // The way out gets the focus, not the way on.
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      window.clearTimeout(t);
    };
  }, [open, close]);

  if (!open) return null;

  function go(to: number) {
    setDirection(to > index ? 'next' : 'back');
    setIndex(Math.max(0, Math.min(total - 1, to)));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-headline"
      aria-describedby="intro-body"
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
    >
      {/* The scrim is a button in everything but name: clicking away is the
          fastest exit there is, and people expect it to work. */}
      <button
        type="button"
        aria-label="Close the introduction"
        onClick={close}
        className="absolute inset-0 animate-scrim-in cursor-default bg-ink/70 backdrop-blur-[3px]"
      />

      <div
        ref={cardRef}
        className="relative flex max-h-[92dvh] w-full animate-modal-in flex-col overflow-hidden rounded-t-3xl bg-sand-soft shadow-[0_-8px_60px_rgba(0,0,0,0.35)] sm:max-h-[88dvh] sm:max-w-lg sm:rounded-3xl sm:shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        {/* Header: who this is, where you are, and the way out. Fixed height,
            so the close button is in exactly the same place at every stage. */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-sand-line px-5 pb-3 pt-4 sm:px-7">
          <span className="inline-flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
              Yep<span className="text-accent-ink">Its</span>Halal
            </span>
          </span>

          <span className="flex items-center gap-3">
            <span className="font-mono text-[11px] font-semibold tracking-widest text-subtle" aria-hidden="true">
              {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="-mr-1.5 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-black/[0.06] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink/40"
            >
              <XIcon className="h-5 w-5" />
              <span className="sr-only">Close the introduction</span>
            </button>
          </span>
        </div>

        {/* The rail. Four segments, so where you are is legible without
            reading the counter, and each one is a way back to a stage. */}
        <div className="flex shrink-0 gap-1.5 px-5 pt-3 sm:px-7">
          {stages.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => go(i)}
              aria-label={`Stage ${i + 1} of ${total}: ${s.name}`}
              aria-current={i === index ? 'step' : undefined}
              className="group flex-1 py-2 focus:outline-none"
            >
              <span
                className={clsx(
                  'block h-[3px] rounded-full transition-all duration-500 ease-out',
                  i < index && 'bg-accent-ink/45',
                  i === index && 'bg-accent-ink',
                  i > index && 'bg-ink/12 group-hover:bg-ink/25'
                )}
              />
            </button>
          ))}
        </div>

        {/* The stage itself. Keyed on the index so React remounts it and the
            entrance animation actually runs on every change. */}
        <div key={index} className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-4 sm:px-7 sm:pt-6">
          <div className={direction === 'next' ? 'animate-stage-next' : 'animate-stage-back'}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-spice-ink">{stage.name}</p>

            <h2
              id="intro-headline"
              className="mt-2.5 text-balance font-display text-[1.85rem] font-semibold leading-[1.1] tracking-[-0.015em] text-ink sm:text-[2.1rem]"
            >
              {stage.headline}
            </h2>

            <p id="intro-body" className="mt-3 text-pretty text-[15px] leading-relaxed text-muted">
              {stage.body}
            </p>

            {stage.facts && (
              <dl className="mt-5 grid grid-cols-3 gap-2.5">
                {stage.facts.map((f) => (
                  <div key={f.label} className="rounded-xl bg-white px-3 py-3 shadow-[0_1px_2px_rgba(20,24,26,0.04)]">
                    <dt className="sr-only">{f.label}</dt>
                    <dd>
                      <span className="block font-display text-xl font-semibold leading-none text-ink">{f.value}</span>
                      <span className="mt-1.5 block text-[11.5px] leading-snug text-subtle">{f.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {stage.cta && (
              <Link href={stage.cta.href} onClick={close} className={clsx(ctaPrimary, 'mt-6 w-full')}>
                {stage.cta.label}
                <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Footer: forward, back, and out. Out is a real link-sized target and
            it says what it does, never "no thanks, I hate saving money". */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-sand-line bg-white/60 px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:px-7 sm:pb-3.5">
          <button
            type="button"
            onClick={close}
            className="min-h-[44px] rounded-full px-1 text-[13.5px] font-medium text-muted underline decoration-black/15 underline-offset-4 transition hover:text-ink hover:decoration-ink/40"
          >
            {stage.dismiss}
          </button>

          <span className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-ink/70 transition hover:bg-black/[0.05] hover:text-ink"
              >
                Back
              </button>
            )}
            {!isLast && (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="group inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition duration-200 ease-out hover:bg-accent-ink active:scale-[0.985]"
              >
                Next
                <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
