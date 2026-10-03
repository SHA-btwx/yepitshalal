'use client';

import { useSyncExternalStore } from 'react';
import {
  type RecordingChoice as Choice,
  recordingChoice,
  setRecordingChoice,
  subscribeToRecordingChoice,
} from '@/lib/analytics/posthog';

const BUTTON =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-sand-soft disabled:cursor-default disabled:opacity-50';

// With Do Not Track or Global Privacy Control on, PostHog treats every visit
// as a no, and a yes here could not change that.
function browserSaysNo(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === '1' || nav.globalPrivacyControl === true;
}

// undefined until the page is running in the browser, where the answer is
// kept; null where PostHog does not run.
function statusFor(choice: Choice | null | undefined): string {
  if (choice === undefined) return '';
  if (choice === null) return 'Recordings only run on the live site.';
  if (choice === 'granted') return 'You said yes. Your visit is being recorded.';
  if (choice === 'pending') return 'You have not answered yet, so nothing is recorded.';
  return browserSaysNo()
    ? 'Your browser asks sites not to track you, so nothing is recorded.'
    : 'You said no, so nothing is recorded.';
}

// The same choice as the question at the bottom of the screen, here so a
// visitor can change it at any time. Withdrawing is as easy as agreeing.
export function RecordingChoice() {
  const choice = useSyncExternalStore<Choice | null | undefined>(
    subscribeToRecordingChoice,
    recordingChoice,
    () => undefined,
  );
  const locked = choice == null || (choice === 'denied' && browserSaysNo());

  return (
    <div className="mt-4 rounded-2xl bg-sand p-5 ring-1 ring-sand-line">
      <p role="status" className="text-sm font-medium text-ink">
        {statusFor(choice)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRecordingChoice(true)}
          disabled={locked || choice === 'granted'}
          className={BUTTON}
        >
          Yes, record my visit
        </button>
        <button
          type="button"
          onClick={() => setRecordingChoice(false)}
          disabled={locked || choice === 'denied'}
          className={BUTTON}
        >
          No, don&apos;t record
        </button>
      </div>
    </div>
  );
}
