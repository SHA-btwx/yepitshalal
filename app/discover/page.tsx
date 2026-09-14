import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon, MapPinIcon, SealCheckIcon, SearchIcon } from '@/components/icons';
import { ctaPrimary, ctaSecondary } from '@/components/cta';

// Discover is deliberately not live yet. Search, then evidence, then discovery:
// a feed is only worth scrolling once the places in it can be trusted, so this
// page says what is coming without pretending any of it exists.
//
// The route, header link and bottom tab stay as they are. When Discover is
// ready, this file's body is the only thing that changes. (The earlier feed
// components, DiscoverFeed and lib/discover.ts, are kept for that.)

export const metadata: Metadata = {
  title: 'Discover',
  description: 'A better way to discover halal places across London is on its way.',
  // A holding page is not something to send searchers to.
  robots: { index: false, follow: true },
};

const NOW = [
  {
    Icon: MapPinIcon,
    title: 'More of London',
    body: 'Finding halal places borough by borough, including the ones that are hard to find online.',
  },
  {
    Icon: SealCheckIcon,
    title: 'Evidence behind every label',
    body: 'Showing where each halal label came from and when it was checked, and saying so when we are not sure.',
  },
  {
    Icon: SearchIcon,
    title: 'Search you can rely on',
    body: 'Postcodes, streets, areas and restaurant names, with results that match the map.',
  },
];

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-12 sm:px-6 sm:pt-20">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">Discover</p>
      <h1 className="mt-3 text-balance font-display text-[2.1rem] font-semibold leading-[1.1] text-ink sm:text-5xl">
        Something better is coming.
      </h1>
      <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
        We&apos;re building a better way to discover halal places across London. First we&apos;re
        making sure the places, and the halal information about them, are right.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={ctaPrimary}>
          Search near you
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
        <Link href="/submit-restaurant" className={ctaSecondary}>
          Tell us about a place
        </Link>
      </div>

      <section aria-labelledby="working-on" className="mt-14">
        <h2 id="working-on" className="text-sm font-semibold text-subtle">
          What we&apos;re working on first
        </h2>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          {NOW.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3.5 px-5 py-4">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
