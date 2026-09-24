'use client';

import { LazyMotion, MotionConfig } from 'motion/react';

// Motion (the library formerly Framer Motion) is used in exactly two shapes on
// this site, both about state rather than decoration: a form turning into its
// answer, and a section opening. Everything else stays CSS.
//
// LazyMotion with the features loaded on demand keeps the first load to the
// small `m` renderer; the animation code arrives after the page is usable.
// reducedMotion="user" drops every transform for anybody who has asked the
// operating system for less movement, leaving plain fades, which is also what
// the global CSS rule in app/globals.css does for everything else.

const loadFeatures = () => import('./features').then((mod) => mod.default);

export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
