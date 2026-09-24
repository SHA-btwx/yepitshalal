'use client';

import { AnimatePresence, m } from 'motion/react';

// One state giving way to the next: a form becoming "Thank you, that reached
// us", or an error arriving under a button. The old state leaves quickly and
// the new one settles in on the site's `arrive` curve, so the eye follows the
// change instead of being cut to it.
//
// Keyed by `id`: change the id and the content swaps. The height follows the
// content, so nothing below the form jumps.

const ARRIVE = [0.22, 1.12, 0.36, 1] as const;

export function Swap({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={id}
        className={className}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: ARRIVE } }}
        exit={{ opacity: 0, y: -4, transition: { duration: 0.14, ease: 'easeIn' } }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

/** A message that appears and disappears in place, such as a form error. */
export function Appear({ show, children, className }: { show: boolean; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <m.div
          className={className}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', transition: { duration: 0.26, ease: ARRIVE } }}
          exit={{ opacity: 0, height: 0, transition: { duration: 0.16 } }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
