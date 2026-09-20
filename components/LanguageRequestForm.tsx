'use client';

import { useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CheckIcon } from './icons';
import { searchLanguages, type LanguageOption } from '@/lib/languages';

// "Can you do this in my language?"
//
// Sits under the switcher, which is where somebody looks the moment they fail
// to find their own language in it. That is the only place this form makes
// sense, and it is why it is not on the homepage.
//
// The suggestions come from a list held in the app rather than an API: there
// are only eighty languages worth offering and filtering them is a string
// comparison. Same reasoning as the city field though, that a vote for
// "farsi" and a vote for "Persian" have to end up as one row to be countable.
//
// The email is optional on purpose. Charging somebody an address to ask for
// their own language would be a strange toll.

export function LanguageRequestForm({ locale = 'en' }: { locale?: string }) {
  const pathname = usePathname() ?? '/';
  const inputId = useId();
  const emailId = useId();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = searchLanguages(query);
  const showList = open && matches.length > 0 && query.trim().length > 0;

  function choose(option: LanguageOption) {
    setQuery(option.name);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  async function submit(formData: FormData) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/language-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: formData.get('language'),
          email: formData.get('email'),
          company_website: formData.get('company_website'),
          source: `language switcher (${pathname})`,
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
      <p role="status" className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-halal-fullInk">
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-semibold">Noted, thank you.</span> The more people ask for a
          language, the sooner it happens.
        </span>
      </p>
    );
  }

  // Closed by default: a control most visitors never need should not take
  // space from the one most of them do.
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-2.5 text-[13px] font-medium text-accent-ink underline decoration-accent-ink/30 underline-offset-4 transition hover:decoration-accent-ink"
      >
        Not your language? Ask for it
      </button>
    );
  }

  const field =
    'w-full rounded-full border border-black/15 bg-white px-4 py-2.5 text-[16px] text-ink placeholder:text-subtle transition focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm';

  return (
    <form action={submit} className="mt-3 max-w-lg">
      <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <p className="text-[13px] leading-relaxed text-muted">
        Which language should we add? We will read every one of these.
      </p>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <div ref={boxRef} className="relative sm:flex-1">
          <label htmlFor={inputId} className="sr-only">
            Which language should we add?
          </label>
          <input
            id={inputId}
            name="language"
            required
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            placeholder="Language"
            maxLength={80}
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            className={field}
          />

          {showList && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Languages"
              className="absolute bottom-full z-40 mb-1.5 max-h-56 w-full overflow-auto rounded-2xl bg-white py-1.5 shadow-[0_8px_30px_rgba(20,24,26,0.18)] ring-1 ring-black/10"
            >
              {matches.map((l, i) => (
                <li
                  key={l.code}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    choose(l);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer px-4 py-2 text-[14px] leading-snug ${
                    i === active ? 'bg-black/[0.055] text-ink' : 'text-ink/80'
                  }`}
                >
                  <span className="font-semibold text-ink">{l.name}</span>
                  {l.endonym !== l.name && (
                    <span lang={l.code} className="text-subtle">
                      {' '}
                      {l.endonym}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sm:flex-1">
          <label htmlFor={emailId} className="sr-only">
            Your email, if you want telling when it is ready
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={200}
            placeholder="Email (optional)"
            className={field}
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink active:scale-[0.98] disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Ask'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-halal-partialInk">
          {error}
        </p>
      )}

      <p className="mt-2 text-[12px] leading-relaxed text-subtle">
        The email is optional, and only used to tell you when that language is ready.
      </p>
    </form>
  );
}
