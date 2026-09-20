import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import { getAreas, MIN_AREA_LISTINGS } from '@/lib/areas';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const areas = await getAreas();
  const total = areas.reduce((n, a) => n + a.listed, 0);
  return {
    title: 'Halal restaurants in London, by borough',
    description: `${total.toLocaleString('en-GB')} places across London with evidence of halal food, borough by borough. Every label shows what it is based on and when it was checked.`,
    alternates: { canonical: '/halal-restaurants' },
  };
}

export default async function LondonAreasPage() {
  const areas = await getAreas();
  const withPages = areas.filter((a) => a.listed >= MIN_AREA_LISTINGS).sort((a, b) => a.borough.localeCompare(b.borough));
  const thin = areas.filter((a) => a.listed < MIN_AREA_LISTINGS).sort((a, b) => a.borough.localeCompare(b.borough));
  const total = areas.reduce((n, a) => n + a.listed, 0);
  const fully = areas.reduce((n, a) => n + a.fully_halal, 0);
  const options = areas.reduce((n, a) => n + a.halal_options, 0);
  const notChecked = areas.reduce((n, a) => n + a.not_checked, 0);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
        Halal restaurants in London
      </h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted">
        {total.toLocaleString('en-GB')} places with evidence of halal food, including{' '}
        {fully.toLocaleString('en-GB')} Fully Halal and {options.toLocaleString('en-GB')} with Halal
        Options, plus {notChecked.toLocaleString('en-GB')} more that are worth asking about. Pick a
        borough, or{' '}
        <Link href="/" className="font-semibold text-accent-ink hover:underline">
          search by postcode
        </Link>
        .
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {withPages.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/halal-restaurants/${a.slug}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-sm transition hover:border-ink/20 hover:shadow-md"
            >
              <span className="min-w-0">
                <span className="block truncate font-display text-[15px] font-semibold text-ink">{a.borough}</span>
                <span className="block text-xs text-muted">
                  {a.listed} places · {a.fully_halal} Fully Halal
                </span>
              </span>
              <ArrowRightIcon className="h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>

      {thin.length > 0 && (
        <p className="mt-6 text-sm leading-relaxed text-muted">
          We don&apos;t know of many places yet in {thin.map((a) => a.borough).join(', ')}. They can
          still be searched, and if you know a halal place there,{' '}
          <Link href="/submit-restaurant" className="font-semibold text-accent-ink hover:underline">
            tell us about it
          </Link>
          .
        </p>
      )}
    </div>
  );
}
