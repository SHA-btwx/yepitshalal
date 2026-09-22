'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

// A section arrives as you reach it, once.
//
// The restraint here is deliberate and matches the buttons: 18px and a fade,
// over about six tenths of a second, on a decelerating curve. Enough to give
// the page a sense of being assembled as you move down it, not enough to
// notice as an effect or to make somebody wait for their own content.
//
// What it will not do:
//
//  - It never hides anything permanently. Without JavaScript the <noscript>
//    rule in the layout shows everything; with reduced motion the CSS does;
//    without IntersectionObserver this reveals on mount. A decorative entrance
//    that can swallow the page is a bug, not a flourish.
//  - It never animates anything already on screen at load. Content above the
//    fold is revealed immediately, because animating what somebody is already
//    looking at reads as a glitch.
//  - It disconnects after firing. One observer per section for the life of one
//    scroll past it, then nothing.

export function Reveal({
  children,
  /** Nudges the start so a stagger reads as one movement, not a queue. */
  delay = 0,
  className,
  as: Tag = 'div',
  ...rest
}: {
  children: React.ReactNode;
  delay?: 0 | 60 | 120 | 180 | 240;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
  /** An id or aria-* passes straight through: a wrapper should not eat the
   *  anchor target or the label of the thing it wraps. */
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer, or motion is unwelcome: show it and stop.
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      setSettled(true);
      return;
    }

    // Already on screen when the page loaded: this is the first paint, not a
    // scroll, so it should simply be there.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight) {
      setVisible(true);
      const t = window.setTimeout(() => setSettled(true), 700);
      return () => window.clearTimeout(t);
    }

    let settleTimer = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setVisible(true);
          settleTimer = window.setTimeout(() => setSettled(true), 700);
          observer.disconnect();
        }
      },
      // Fires a little before the edge, so the movement finishes as the
      // section reaches comfortable reading height rather than starting there.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(settleTimer);
    };
  }, []);

  const DELAY: Record<number, string> = {
    0: '',
    60: '[transition-delay:60ms]',
    120: '[transition-delay:120ms]',
    180: '[transition-delay:180ms]',
    240: '[transition-delay:240ms]',
  };

  return (
    <Tag
      {...rest}
      ref={ref as React.Ref<never>}
      className={clsx('reveal', visible && 'is-visible', settled && 'is-settled', DELAY[delay], className)}
    >
      {children}
    </Tag>
  );
}
