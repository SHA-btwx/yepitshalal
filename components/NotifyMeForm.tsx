'use client';

import { useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRightIcon, CheckIcon } from './icons';

// "When are you coming to my city?"
//
// The site says London on every page, which is honest and also leaves a
// visitor from Manchester or Toronto with nowhere to go. This is where they
// go. The city field is free text and optional: the point is to find out where
// the demand actually is, and a dropdown of cities we have not researched
// would be us answering our own question.
//
// It promises only what we can do. No "weekly newsletter", because there isn't
// one, and no count of how many people are waiting, because a number like that
// is theatre unless it is real.

export function NotifyMeForm({
  source,
  locale = 'en',
  tone = 'light',
  cityField = true,
  buttonLabel = 'Keep me posted',
  placeholder = 'you@example.com',
  cityPlaceholder = 'Which city? (optional)',
  emailLabel = 'Your email address',
  cityLabel = 'Which city should we cover next?',
  sendingLabel = 'Sending…',
  doneTitle = "You're on the list",
  doneBody = "We'll email you when we reach a new city or ship something worth knowing about. Nothing else, and never to anybody else.",
  privacyLine = 'One address, kept for this and nothing else. Never sold, unsubscribe in a click.',
}: {
  /** Where the sign-up came from, so the expansion order can be argued from something real. */
  source: string;
  locale?: string;
  /** 'dark' for the forest hero, 'light' for a page band. */
  tone?: 'light' | 'dark';
  cityField?: boolean;
  buttonLabel?: string;
  placeholder?: string;
  cityPlaceholder?: string;
  /** Read out by a screen reader, so it is translated with everything else. */
  emailLabel?: string;
  cityLabel?: string;
  sendingLabel?: string;
  doneTitle?: string;
  doneBody?: string;
  privacyLine?: string;
}) {
  const pathname = usePathname() ?? '/';
  const emailId = useId();
  const cityId = useId();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dark = tone === 'dark';

  async function submit(formData: FormData) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          wanted_city: formData.get('wanted_city'),
          company_website: formData.get('company_website'),
          source: `${source} (${pathname})`,
          locale,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "That didn't send. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("That didn't send. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className={
          dark
            ? 'flex items-start gap-2.5 rounded-2xl bg-white/10 p-4 text-sm leading-relaxed text-white ring-1 ring-white/20'
            : 'flex items-start gap-2.5 rounded-2xl bg-halal-fullSoft p-4 text-sm leading-relaxed text-halal-fullInk'
        }
      >
        <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-semibold">{doneTitle}.</span> {doneBody}
        </span>
      </div>
    );
  }

  const field = dark
    ? 'w-full rounded-full border border-white/25 bg-white/10 px-4 py-3 text-[16px] text-white placeholder:text-white/55 transition focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 sm:text-sm'
    : 'w-full rounded-full border border-black/15 bg-white px-4 py-3 text-[16px] text-ink placeholder:text-subtle transition focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm';

  return (
    <form action={submit} className="w-full">
      <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className={cityField ? 'sm:flex-[1.3]' : 'flex-1'}>
          <label htmlFor={emailId} className="sr-only">
            {emailLabel}
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={200}
            placeholder={placeholder}
            className={field}
          />
        </div>

        {cityField && (
          <div className="sm:flex-1">
            <label htmlFor={cityId} className="sr-only">
              {cityLabel}
            </label>
            <input id={cityId} name="wanted_city" maxLength={120} placeholder={cityPlaceholder} className={field} />
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className={
            dark
              ? 'group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink transition hover:bg-white/90 active:scale-[0.98] disabled:opacity-60'
              : 'group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink active:scale-[0.98] disabled:opacity-60'
          }
        >
          {sending ? sendingLabel : buttonLabel}
          {!sending && (
            <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {error && (
        <p role="alert" className={`mt-2 text-sm font-medium ${dark ? 'text-white' : 'text-halal-partialInk'}`}>
          {error}
        </p>
      )}

      <p className={`mt-2.5 text-[12.5px] leading-relaxed ${dark ? 'text-white/60' : 'text-subtle'}`}>{privacyLine}</p>
    </form>
  );
}
