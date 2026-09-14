import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HalalBadge } from '@/components/HalalBadge';
import { ArrowRightIcon, MapPinIcon } from '@/components/icons';
import { ctaPrimary } from '@/components/cta';
import { getAreaBySlug, getAreasWithPages, type AreaListing } from '@/lib/areas';
import { cleanRestaurantName } from '@/lib/restaurantName';
import { jsonLdHtml } from '@/lib/jsonLd';
import type { HalalClassification } from '@/lib/types';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getAreasWithPages()).map((a) => ({ borough: a.slug }));
}

export async function generateMetadata({ params }: { params: { borough: string } }): Promise<Metadata> {
  const found = await getAreaBySlug(params.borough);
  if (!found) return { title: 'Area not found', robots: { index: false } };
  const { area } = found;
  return {
    title: `Halal restaurants in ${area.borough}`,
    description: `${area.listed} places in ${area.borough} with evidence of halal food: ${area.fully_halal} Fully Halal, ${area.halal_options} with Halal Options and ${area.unverified} Unverified. See where each label comes from.`,
    alternates: { canonical: `/halal-restaurants/${area.slug}` },
  };
}

const GROUPS: { classification: HalalClassification; heading: string; blurb: string }[] = [
  {
    classification: 'fully_halal',
    heading: 'Fully Halal',
    blurb: 'Strong evidence that all the meat is halal.',
  },
  {
    classification: 'halal_options',
    heading: 'Halal Options',
    blurb: 'Halal food is served, alongside food that is not halal.',
  },
  {
    classification: 'unverified',
    heading: 'Unverified',
    blurb: "Signs of halal food that haven't been confirmed. It never means not halal.",
  },
];

function title(r: AreaListing) {
  const base = cleanRestaurantName(r.brand_name ?? r.name);
  return r.branch_label ? `${base}, ${r.branch_label}` : base;
}

function shortAddress(r: AreaListing) {
  const first = r.address.split(',')[0]?.trim();
  if (!first || /street address not known/i.test(r.address)) return r.postcode ?? null;
  return r.postcode && !first.includes(r.postcode) ? `${first}, ${r.postcode}` : first;
}

export default async function AreaPage({ params }: { params: { borough: string } }) {
  const found = await getAreaBySlug(params.borough);
  if (!found) notFound();
  const { area, listings } = found;

  const searchHref = `/search?lat=${area.anchor_lat.toFixed(5)}&lng=${area.anchor_lng.toFixed(5)}&mode=searched_location&label=${encodeURIComponent(area.borough)}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Halal restaurants in London', item: 'https://yepitshalal.com/halal-restaurants' },
        { '@type': 'ListItem', position: 2, name: area.borough, item: `https://yepitshalal.com/halal-restaurants/${area.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Halal restaurants in ${area.borough}`,
      numberOfItems: listings.length,
      itemListElement: listings.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://yepitshalal.com/restaurant/${r.slug}`,
        name: title(r),
      })),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-6 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="text-xs text-subtle">
        <Link href="/halal-restaurants" className="hover:text-ink hover:underline">
          London
        </Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <span className="text-muted">{area.borough}</span>
      </nav>

      <h1 className="mt-3 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
        Halal restaurants in {area.borough}
      </h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted">
        {area.listed} places in {area.borough} with evidence that they serve halal food. Each one
        shows its label, what the label is based on, and when it was checked.
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        {GROUPS.map((g) => (
          <div key={g.classification} className="rounded-xl border border-line bg-white px-3 py-3 sm:px-4">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle sm:text-xs">{g.heading}</dt>
            <dd className="mt-0.5 font-display text-xl font-semibold text-ink sm:text-2xl">
              {area[g.classification]}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={searchHref} className={ctaPrimary}>
          <MapPinIcon className="h-4 w-4" />
          See them on the map
        </Link>
        <Link href="/how-we-check" className="text-sm font-semibold text-accent-ink hover:underline">
          How we label places
        </Link>
      </div>

      {GROUPS.map((g) => {
        const rows = listings.filter((r) => r.halal_classification === g.classification);
        if (!rows.length) return null;
        return (
          <section key={g.classification} aria-labelledby={`group-${g.classification}`} className="mt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`group-${g.classification}`} className="font-display text-xl font-semibold text-ink">
                {g.heading} <span className="text-base font-medium text-subtle">({rows.length})</span>
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted">{g.blurb}</p>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              {rows.map((r) => {
                const where = shortAddress(r);
                return (
                  <li key={r.id}>
                    <Link
                      href={`/restaurant/${r.slug}`}
                      className="group flex items-center gap-3 px-4 py-3 transition hover:bg-black/[0.02]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[15px] font-semibold text-ink">{title(r)}</p>
                        <p className="truncate text-[13px] text-muted">
                          {[where, r.cuisine_label].filter(Boolean).join(' · ')}
                        </p>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span className="shrink-0">
                            <HalalBadge classification={r.halal_classification} size="sm" />
                          </span>
                          {r.halal_summary && <span className="truncate text-xs text-muted">{r.halal_summary}</span>}
                        </div>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="mt-10 text-sm leading-relaxed text-muted">
        Missing a place, or think a label is wrong?{' '}
        <Link href="/submit-restaurant" className="font-semibold text-accent-ink hover:underline">
          Tell us
        </Link>
        . Locations come from the Food Standards Agency food hygiene register, OpenStreetMap
        contributors and the Overture Maps Foundation.
      </p>
    </div>
  );
}
