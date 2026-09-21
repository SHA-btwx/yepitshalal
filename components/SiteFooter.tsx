'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark } from './Logo';
import { HeartHandIcon } from './icons';
import { FeedbackBox } from './FeedbackBox';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LOCALE_CODES } from '@/lib/locales';

// Hidden on the two routes that own the full viewport: the Discover feed is a
// snap-scrolling column, and admin has its own chrome.
const HIDDEN_ON = ['/admin'];

export function SiteFooter() {
  const pathname = usePathname() ?? '/';
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <footer className="mt-16 border-t border-sand-line bg-sand-soft">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Before the sitemap, not after it: the moment somebody notices
            something wrong is the moment they will say so. */}
        <div className="mb-10">
          <FeedbackBox />
        </div>

        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <span className="inline-flex items-center gap-1.5">
              <LogoMark />
              <span className="font-display text-base font-semibold tracking-tight text-ink">
                Yep<span className="text-accent-ink">Its</span>Halal
              </span>
            </span>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Clear halal information for London: what we know, how we know it, and what we
              haven&apos;t checked yet.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-6 text-sm sm:grid-cols-3 sm:gap-x-12">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle">Explore</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Search
                  </Link>
                </li>
                <li>
                  <Link href="/halal-restaurants" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Browse by borough
                  </Link>
                </li>
                <li>
                  <Link href="/how-we-check" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    How we label places
                  </Link>
                </li>
                <li>
                  <Link href="/halal-restaurants/cuisine" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    By kind of food
                  </Link>
                </li>
                <li>
                  <Link href="/prayer-spaces" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Prayer spaces
                  </Link>
                </li>
                <li>
                  <Link href="/image-credits" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Image credits
                  </Link>
                </li>
                <li>
                  <Link href="/discover" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Discover
                  </Link>
                </li>
                <li>
                  <Link href="/yep-plus" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Support us
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle">
                For restaurants
              </h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/submit-restaurant" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Add your restaurant
                  </Link>
                </li>
                <li>
                  <Link href="/account" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    My account
                  </Link>
                </li>
                {/* Owners look here first when something about their own place
                    is wrong, so the route out of a bad label sits with them. */}
                <li>
                  <Link href="/corrections" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Something wrong?
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle">Legal</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/privacy" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/corrections" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Corrections
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* In the footer rather than the header: a reader who needs it will
            look for it, and a control most visitors never touch does not earn
            space beside the search box. */}
        <div className="mt-8 border-t border-line pt-6">
          <LanguageSwitcher current={LOCALE_CODES.find((c) => pathname === `/${c}`) ?? 'en'} />
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} YepItsHalal · Made in London</p>
          <p className="inline-flex items-center gap-1.5">
            <HeartHandIcon className="h-4 w-4 text-accent-ink" />
            We donate a meal for every month of support, through{' '}
            <a
              href="https://sharethemeal.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent-ink underline underline-offset-2"
            >
              ShareTheMeal
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
