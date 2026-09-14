import Link from 'next/link';
import { ctaPrimary, ctaSecondary } from '@/components/cta';
import { ArrowRightIcon } from '@/components/icons';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 pb-20 pt-16 text-center sm:pt-24">
      <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Page not found</p>
      <h1 className="mt-3 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mx-auto mt-3 max-w-md text-pretty text-base leading-relaxed text-muted">
        The link may be old, or the place may have been merged with another listing. Search for it
        by name or postcode instead.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={ctaPrimary}>
          Search
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
        <Link href="/halal-restaurants" className={ctaSecondary}>
          Browse by borough
        </Link>
      </div>
    </div>
  );
}
