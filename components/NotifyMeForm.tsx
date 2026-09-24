'use client';

import { useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRightIcon, CheckIcon } from './icons';
import { PlaceAutocomplete, type ChosenPlace } from './PlaceAutocomplete';
import { fieldInput, fieldInputDark } from './form';
import { Appear, Swap } from './motion/Swap';

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
  cityNoResults = "We don't know that one, but type it anyway and we'll read it.",
  sendingLabel = 'Sending…',
  doneTitle = "You're on the list",
  doneBody = "We'll email you when we reach a new city or ship something worth knowing about. Nothing else, and never to anybody else.",
  doneWithPlace,
  placeFirst = false,
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
  cityNoResults?: string;
  sendingLabel?: string;
  doneTitle?: string;
  doneBody?: string;
  /** Said instead of doneBody when a place was given. "{place}" is replaced with it. */
  doneWithPlace?: string;
  /** Ask where before asking who: for a section that is about the place. */
  placeFirst?: boolean;
  privacyLine?: string;
}) {
  const pathname = usePathname() ?? '/';
  const emailId = useId();
  // What they picked from the suggestions, if they picked. Null means the
  // text in the box is their own, which is still a perfectly good answer.
  const [place, setPlace] = useState<ChosenPlace | null>(null);
  const [sent, setSent] = useState(false);
  const [sentPlace, setSentPlace] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dark = tone === 'dark';

  async function submit(formData: FormData) {
    setSending(true);
    setError(null);
    const typed = String(formData.get('wanted_city') ?? '').trim();
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          wanted_city: place?.name ?? formData.get('wanted_city'),
          place,
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
      setSentPlace((place?.name ?? typed).slice(0, 80) || null);
      setSent(true);
    } catch {
      setError("That didn't send. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const field = dark ? fieldInputDark : fieldInput;
  // Labels are visible now, on every language page too: a placeholder is an
  // example of an answer, and it vanishes the moment somebody starts typing.
  const label = dark ? 'mb-1.5 block text-sm font-medium text-white/85' : 'mb-1.5 block text-sm font-medium text-ink';

  const submitButton = (
    <button
      type="submit"
      disabled={sending}
      className={
        dark
          ? 'group inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink transition duration-200 hover:-translate-y-px hover:bg-white/90 active:translate-y-0 active:scale-[0.985] disabled:opacity-60 sm:w-auto'
          : 'group inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-px hover:bg-accent-ink hover:shadow-md active:translate-y-0 active:scale-[0.985] disabled:opacity-60 sm:w-auto'
      }
    >
      {sending ? sendingLabel : buttonLabel}
      {!sending && (
        <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      )}
    </button>
  );

  const placeBlock = (
    <div>
      <PlaceAutocomplete
        name="wanted_city"
        label={cityLabel}
        labelClassName={label}
        placeholder={cityPlaceholder}
        className={field}
        onChoose={setPlace}
        noResultsHint={cityNoResults}
      />
    </div>
  );

  return (
    <Swap id={sent ? 'sent' : 'form'}>
      {sent ? (
        <div
          role="status"
          className={
            dark
              ? 'flex items-start gap-2.5 rounded-2xl bg-white/10 p-4 text-sm leading-relaxed text-white ring-1 ring-white/20'
              : 'flex items-start gap-2.5 rounded-2xl bg-halal-fullSoft p-4 text-sm leading-relaxed text-halal-fullInk ring-1 ring-halal-full/20'
          }
        >
          <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">{doneTitle}.</span>{' '}
            {sentPlace && doneWithPlace ? doneWithPlace.replace('{place}', sentPlace) : doneBody}
          </span>
        </div>
      ) : (
        <form action={submit} className="w-full">
          <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          {/* With a city field: the two fields side by side and the button
              under them, because three across squeezed the labels into three
              lines. Without one: the field and its button in a single row. */}
          <div className={cityField ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end' : 'flex flex-col gap-3 sm:flex-row sm:items-end'}>
            {/* Swapped in the markup, not with CSS order, so the tab order and
                a screen reader meet the fields in the order they are seen. */}
            {placeFirst && cityField && placeBlock}
            <div className={cityField ? undefined : 'flex-1'}>
              <label htmlFor={emailId} className={label}>
                {emailLabel}
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                required
                autoComplete="email"
                spellCheck={false}
                maxLength={200}
                placeholder={placeholder}
                className={field}
              />
            </div>
            {cityField ? !placeFirst && placeBlock : submitButton}
          </div>

          {cityField && <div className="mt-3">{submitButton}</div>}

          <Appear show={!!error}>
            <p role="alert" className={`pt-2 text-sm font-medium ${dark ? 'text-white' : 'text-halal-partialInk'}`}>
              {error}
            </p>
          </Appear>

          <p className={`mt-2.5 text-[12.5px] leading-relaxed ${dark ? 'text-white/60' : 'text-subtle'}`}>{privacyLine}</p>
        </form>
      )}
    </Swap>
  );
}
