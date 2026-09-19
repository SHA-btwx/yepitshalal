import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRightIcon, MapPinIcon, NavigationIcon } from '@/components/icons';
import { boroughSlug } from '@/lib/areas';
import {
  countPrayerSpaces,
  formatMetres,
  getNearestPrayerSpaces,
  getPrayerSpaceBoroughs,
  walkingMinutes,
} from '@/lib/prayerSpaces';
import { jsonLdHtml } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Mosques and prayer spaces in London',
  description:
    'Mosques and prayer rooms across London, from OpenStreetMap, with how far each one is to walk. Separate from the halal listings: a place to pray, not a claim about food.',
  alternates: { canonical: '/prayer-spaces' },
};

// A separate function from the restaurant search, deliberately. Somewhere to
// pray is a different question from what is safe to eat, and mixing them would
// let one imply the other. The only crossing point is a restaurant page saying
// how far the nearest one is to walk.
//
// It takes a location the same way the restaurant search does: from a link you
// arrived on, or from a borough you pick here.

interface Props {
  searchParams: { lat?: string; lng?: string; label?: string };
}

export default async function PrayerSpacesPage({ searchParams }: Props) {
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const label = searchParams.label?.slice(0, 80);

  const [total, boroughs, nearby] = await Promise.all([
    countPrayerSpaces(),
    getPrayerSpaceBoroughs(),
    hasPoint ? getNearestPrayerSpaces(lat, lng, 20, 8000) : Promise.resolve([]),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'YepItsHalal', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Prayer spaces', item: `${SITE_URL}/prayer-spaces` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-6 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      <h1 className="text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
        Mosques and prayer spaces in London
      </h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted">
        {total} places to pray across London, from OpenStreetMap. Every restaurant page also says how
        far the nearest one is to walk.
      </p>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">
        This is separate from the halal listings on purpose. A mosque being near a restaurant says
        nothing about that restaurant&apos;s food, and a halal label says nothing about the mosque.
      </p>

      {hasPoint && (
        <section aria-labelledby="near" className="mt-8">
          <h2 id="near" className="font-display text-xl font-semibold text-ink">
            {nearby.length ? `Nearest to ${label ?? 'you'}` : `Nothing found near ${label ?? 'there'}`}
          </h2>
          {nearby.length === 0 && (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              We don&apos;t know of a prayer space within five miles of there. That does not mean
              there isn&apos;t one.
            </p>
          )}
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            {nearby.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="font-display text-[15px] font-semibold text-ink">{s.name}</p>
                  <p className="text-[13px] font-semibold text-accent-ink">
                    about {walkingMinutes(s.distance_meters)} min walk
                  </p>
                </div>
                <p className="mt-0.5 text-[13px] text-muted">
                  {formatMetres(s.distance_meters)}
                  {s.address ? ` · ${s.address}` : s.postcode ? ` · ${s.postcode}` : ''}
                  {s.borough ? ` · ${s.borough}` : ''}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-accent-ink hover:underline"
                  >
                    <NavigationIcon className="h-4 w-4" aria-hidden="true" />
                    Directions
                  </a>
                  {s.website_url && (
                    <a
                      href={s.website_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 font-medium text-muted hover:text-ink hover:underline"
                    >
                      Website
                      <ArrowUpRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="by-borough" className="mt-10">
        <h2 id="by-borough" className="font-display text-xl font-semibold text-ink">
          By borough
        </h2>
        <p className="mt-1 text-sm text-muted">
          Pick a borough to see its halal places; each restaurant page carries the nearest prayer
          space.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {boroughs.map((b) => (
            <li key={b.borough}>
              <Link
                href={`/halal-restaurants/${boroughSlug(b.borough)}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[13px] font-medium text-ink/80 transition hover:border-ink/30 hover:text-ink"
              >
                {b.borough}
                <span className="text-subtle">{b.spaces}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 flex items-start gap-2 text-sm leading-relaxed text-muted">
        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
        <span>
          Prayer space data from{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent-ink hover:underline"
          >
            OpenStreetMap contributors
          </a>
          , under the Open Database Licence. We haven&apos;t visited any of them, and opening times
          vary, so ring ahead for a particular prayer. Know one we&apos;re missing, or something
          that&apos;s wrong?{' '}
          <Link href="/submit-restaurant" className="font-semibold text-accent-ink hover:underline">
            Tell us
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
