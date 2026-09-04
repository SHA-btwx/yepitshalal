'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { SealCheckIcon, ForkKnifeIcon, SparkleIcon, UserIcon } from '../icons';

// There was no way to move between admin sections — every hop went back through
// /admin. This is that missing layer, and it doubles as the "you are in the
// admin" signal the public header alone doesn't give.
const SECTIONS = [
  { href: '/admin/queue', label: 'Queue', Icon: SealCheckIcon },
  { href: '/admin/restaurants', label: 'Restaurants', Icon: ForkKnifeIcon },
  { href: '/admin/offers', label: 'Offers', Icon: SparkleIcon },
  { href: '/admin/subscriptions', label: 'Subscriptions', Icon: UserIcon },
];

export function AdminNav() {
  const pathname = usePathname() ?? '';

  return (
    <div className="border-b border-line bg-white/70">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/admin"
          aria-current={pathname === '/admin' ? 'page' : undefined}
          className="my-2 inline-flex min-h-[36px] shrink-0 items-center rounded-full bg-ink px-3 text-xs font-semibold uppercase tracking-wide text-white"
        >
          Admin
        </Link>

        <nav aria-label="Admin sections" className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
          {SECTIONS.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-accent-ink text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
