'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark } from './Logo';
import { HeartHandIcon } from './icons';

// Hidden on the two routes that own the full viewport: the Discover feed is a
// snap-scrolling column, and admin has its own chrome.
const HIDDEN_ON = ['/discover', '/admin'];

export function SiteFooter() {
  const pathname = usePathname() ?? '/';
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <footer className="mt-16 border-t border-line bg-white/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <span className="inline-flex items-center gap-1.5">
              <LogoMark />
              <span className="font-display text-base font-semibold tracking-tight text-ink">
                Yep<span className="text-accent-ink">Its</span>Halal
              </span>
            </span>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Clear halal information for London — what we know, how we know it, and what we
              haven&apos;t checked yet.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-6 text-sm sm:gap-x-14">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle">Explore</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Search
                  </Link>
                </li>
                <li>
                  <Link href="/discover" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Discover
                  </Link>
                </li>
                <li>
                  <Link href="/yep-plus" className="inline-flex min-h-[32px] items-center text-muted hover:text-ink">
                    Yep+
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
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} YepItsHalal · Made in London</p>
          <p className="inline-flex items-center gap-1.5">
            <HeartHandIcon className="h-4 w-4 text-accent-ink" />
            Every Yep+ subscription funds a meal through{' '}
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
