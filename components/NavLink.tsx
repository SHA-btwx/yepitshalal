'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname() ?? '/';
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'rounded-full px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-black/[0.06] text-ink' : 'text-muted hover:bg-black/[0.04] hover:text-ink',
        className
      )}
    >
      {children}
    </Link>
  );
}
