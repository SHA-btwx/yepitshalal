import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import { getCuisines } from '@/lib/cuisines';
import { jsonLdHtml } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Halal food in London, by kind of food',
  description:
    'Halal kebab, biryani, fried chicken, burgers and more across London, each with the evidence behind its label and the date it was checked.',
  alternates: { canonical: '/halal-restaurants/cuisine' },
};

export default async function CuisineIndexPage() {
  const cuisines = await getCuisines();
  const total = cuisines.reduce((n, c) => n + c.listed, 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Halal restaurants in London', item: `${SITE_URL}/halal-restaurants` },
      { '@type': 'ListItem', position: 2, name: 'By kind of food', item: `${SITE_URL}/halal-restaurants/cuisine` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-6 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="text-xs text-subtle">
        <Link href="/halal-restaurants" className="hover:text-ink hover:underline">
          London
        </Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <span className="text-muted">By kind of food</span>
      </nav>

      <h1 className="mt-3 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
        Halal food in London, by what you fancy
      </h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted">
        Most people do not decide by postcode. {total.toLocaleString('en-GB')} places with evidence of
        halal food, sorted by what they actually serve.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {cuisines.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/halal-restaurants/cuisine/${c.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 transition hover:border-ink/25 hover:shadow-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base font-semibold text-ink">Halal {c.cuisine}</span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {c.listed} with evidence
                  {c.fully_halal > 0 && <> · {c.fully_halal} Fully Halal</>}
                </span>
              </span>
              <ArrowRightIcon className="h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm leading-relaxed text-muted">
        Looking for somewhere specific instead?{' '}
        <Link href="/halal-restaurants" className="font-semibold text-accent-ink hover:underline">
          Browse by borough
        </Link>
        .
      </p>
    </div>
  );
}
