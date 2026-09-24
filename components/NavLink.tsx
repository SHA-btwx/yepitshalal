'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export function NavLink({
  href,
  children,
  className,
  tone = 'light',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** 'dark' for the teal header. */
  tone?: 'light' | 'dark';
}) {
  const pathname = usePathname() ?? '/';
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'rounded-full px-3 py-2 text-sm font-medium transition-colors',
        tone === 'dark'
          ? active
            ? 'bg-white/15 text-white'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
          : active
            ? 'bg-black/[0.06] text-ink'
            : 'text-muted hover:bg-black/[0.04] hover:text-ink',
        className
      )}
    >
      {children}
    </Link>
  );
}
