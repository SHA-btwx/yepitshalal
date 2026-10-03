'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import {
  recordingChoice,
  setRecordingChoice,
  subscribeToRecordingChoice,
} from '@/lib/analytics/posthog';

// The pages recordings show as an empty box (scrub.ts), so asking there would
// be a question about nothing. And the privacy page, which asks the same
// question in its Recordings section, where it covers nothing a visitor came
// to read before answering.
const NOT_ASKED = ['/admin', '/account', '/manage', '/auth', '/privacy'];

// Both answers are the same size and the same colour, so no is exactly as
// easy as yes.
const ANSWER =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/15 active:scale-[0.98]';

// The site's one question: may PostHog record this visit. It shows until it
// is answered and never where PostHog does not run. It is not in the server's
// HTML, only added once the page is running, and it is fixed in place, so it
// moves nothing on the page. The answer can be changed at any time on
// /privacy#recordings, linked from the footer.
export function RecordingConsent() {
  const choice = useSyncExternalStore(subscribeToRecordingChoice, recordingChoice, () => null);
  const pathname = usePathname() ?? '';
  if (choice !== 'pending') return null;
  if (NOT_ASKED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;

  return (
    <section
      aria-labelledby="recording-consent-title"
      className="ground-dark fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl bg-forest-deep p-4 text-white shadow-[0_12px_40px_-12px_rgba(15,37,43,0.55)] ring-1 ring-white/10 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-full sm:max-w-sm sm:p-5"
    >
      <h2 id="recording-consent-title" className="font-display text-base font-semibold">
        Can we record your visit?
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-white/80">
        It helps us see where the site is hard to use. We never see what you type.{' '}
        <Link href="/privacy#recordings" className="font-medium text-white underline underline-offset-2">
          How it works
        </Link>
      </p>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setRecordingChoice(true)} className={ANSWER}>
          Yes, that&apos;s fine
        </button>
        <button type="button" onClick={() => setRecordingChoice(false)} className={ANSWER}>
          No thanks
        </button>
      </div>
    </section>
  );
}
