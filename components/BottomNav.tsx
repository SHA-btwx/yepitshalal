'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { SearchIcon, MapIcon, PlusIcon, UserIcon } from './icons';

// Mobile-only tab bar. The header hides "Add your restaurant" and "Sign in"
// below sm, which previously left those routes unreachable on a phone — this is
// where they live now. Four destinations, under the five-item ceiling that
// keeps a tab bar scannable.
const TABS = [
  { href: '/', label: 'Search', Icon: SearchIcon, match: (p: string) => p === '/' || p.startsWith('/search') },
  { href: '/discover', label: 'Discover', Icon: MapIcon, match: (p: string) => p.startsWith('/discover') },
  { href: '/submit-restaurant', label: 'Add', Icon: PlusIcon, match: (p: string) => p.startsWith('/submit-restaurant') },
  { href: '/account', label: 'Account', Icon: UserIcon, match: (p: string) => p.startsWith('/account') || p.startsWith('/sign-in') },
];

export function BottomNav() {
  const pathname = usePathname() ?? '/';

  // Admin runs its own chrome and is desktop-oriented.
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-safe backdrop-blur sm:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors',
                  active ? 'text-accent-ink' : 'text-subtle'
                )}
              >
                <Icon className={clsx('h-[22px] w-[22px]', active && 'stroke-[2]')} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
