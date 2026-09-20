import Link from 'next/link';
import { GlobeIcon } from './icons';
import { LOCALES } from '@/lib/locales';

// Every language in its own script, never in English.
//
// A list that says "Arabic, Bengali, Urdu" is for somebody who already reads
// English; a reader who does not is scanning for the shape of their own
// writing. English is in the row too, because on a translated page it is the
// way back, and because the directory itself is English.

export function LanguageSwitcher({
  current = 'en',
  className,
}: {
  /** Locale code of the page this is on, so it is shown as current rather than as a link. */
  current?: string;
  className?: string;
}) {
  const options = [{ code: 'en', endonym: 'English', href: '/' }, ...LOCALES.map((l) => ({ code: l.code, endonym: l.endonym, href: `/${l.code}` }))];

  return (
    <nav aria-label="Language" className={className}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-subtle">
        <GlobeIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Language
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.code === current;
          return (
            <li key={o.code}>
              {active ? (
                <span
                  aria-current="page"
                  lang={o.code}
                  className="inline-flex min-h-[36px] items-center rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white"
                >
                  {o.endonym}
                </span>
              ) : (
                <Link
                  href={o.href}
                  hrefLang={o.code}
                  lang={o.code}
                  className="inline-flex min-h-[36px] items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-medium text-ink/75 transition hover:border-ink/30 hover:text-ink"
                >
                  {o.endonym}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
