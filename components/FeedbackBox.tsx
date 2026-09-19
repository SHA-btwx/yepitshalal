'use client';

import { useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRightIcon, CheckIcon } from './icons';

// Feedback about the site, on every page, because the moment somebody notices
// something wrong is the moment they will say so, and a form two clicks away
// collects nothing.
//
// The email is required. Feedback we cannot reply to is a dead end for both
// sides: we cannot ask what they meant, and they never hear that it got fixed.
// It also happens to be the cheapest spam filter there is.
//
// Closed by default so it never competes with the page it sits under.

export function FeedbackBox() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();
  const messageId = useId();
  const pathname = usePathname() ?? '/';

  if (pathname.startsWith('/admin')) return null;

  async function submit(formData: FormData) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          message: formData.get('message'),
          company_website: formData.get('company_website'),
          page_url: typeof window !== 'undefined' ? window.location.href : pathname,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "That didn't send. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("That didn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-halal-full/25 bg-halal-fullSoft p-5">
        <p className="flex items-center gap-2 font-display text-base font-semibold text-halal-fullInk">
          <CheckIcon className="h-5 w-5" aria-hidden="true" />
          Thank you, that reached us
        </p>
        <p className="mt-1 text-sm leading-relaxed text-halal-fullInk/85">
          A person reads every one of these. If it needs an answer, you will get one.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-semibold text-ink">Tell us what we got wrong</h2>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-[36px] items-center gap-1.5 text-sm font-semibold text-accent-ink hover:underline"
          >
            Leave feedback
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Something confusing, something missing, a label you disagree with. It all helps, and it is
        the only way this gets better.
      </p>

      {open && (
        <form action={submit} className="mt-4 space-y-3">
          {/* A person never sees this. A bot fills everything. */}
          <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <div>
            <label htmlFor={emailId} className="block text-sm font-medium text-ink">
              Your email
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              placeholder="so we can reply"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-white px-3.5 text-[16px] text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor={messageId} className="block text-sm font-medium text-ink">
              What would you change?
            </label>
            <textarea
              id={messageId}
              name="message"
              required
              rows={4}
              minLength={4}
              maxLength={4000}
              className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[16px] text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-halal-partialInk">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={sending}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink active:scale-[0.98] disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send feedback'}
            </button>
            <p className="text-xs text-subtle">
              Used to reply to you about this, and nothing else. Never published, never sold.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
