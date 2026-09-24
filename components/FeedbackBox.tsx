'use client';

import { useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRightIcon, CheckIcon } from './icons';
import { fieldInput, fieldLabel, formError, formSuccess } from './form';
import { ctaPrimary } from './cta';
import { panel } from './prose';
import { Appear, Swap } from './motion/Swap';

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
  const panelId = useId();
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

  return (
    <Swap id={sent ? 'sent' : 'form'}>
      {sent ? (
        <div role="status" className={formSuccess}>
          <p className="flex items-center gap-2 font-display text-base font-semibold text-halal-fullInk">
            <CheckIcon className="h-5 w-5" aria-hidden="true" />
            Thank you, that reached us
          </p>
          <p className="mt-1 text-sm leading-relaxed text-halal-fullInk/85">
            A person reads every one of these. If it needs an answer, you will get one.
          </p>
        </div>
      ) : (
        <div className={`${panel} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-lg font-semibold text-ink">Spotted something wrong?</h2>
            {!open && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={open}
                aria-controls={panelId}
                className="group inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-accent-ink hover:underline"
              >
                Leave feedback
                <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            A label you disagree with, a place that has closed, something that didn&apos;t make sense. A person
            reads every message, and it&apos;s how we find the mistakes and gaps we can&apos;t see from here.
          </p>

          {/* Opens in place rather than jumping: the form grows out of the
              card, so it is obvious where it came from. */}
          <Appear show={open}>
            <form id={panelId} action={submit} className="space-y-3 pt-4">
              {/* A person never sees this. A bot fills everything. */}
              <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

              <div>
                <label htmlFor={emailId} className={fieldLabel}>
                  Your email
                </label>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="so we can reply"
                  className={fieldInput}
                />
              </div>

              <div>
                <label htmlFor={messageId} className={fieldLabel}>
                  What would you change?
                </label>
                <textarea
                  id={messageId}
                  name="message"
                  required
                  rows={4}
                  minLength={4}
                  maxLength={4000}
                  className={fieldInput}
                />
              </div>

              <Appear show={!!error}>
                <p role="alert" className={formError}>
                  {error}
                </p>
              </Appear>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={sending} className={ctaPrimary}>
                  {sending ? 'Sending…' : 'Send feedback'}
                </button>
                <p className="text-xs text-subtle">
                  Used to reply to you about this, and nothing else. Never published, never sold.
                </p>
              </div>
            </form>
          </Appear>
        </div>
      )}
    </Swap>
  );
}
