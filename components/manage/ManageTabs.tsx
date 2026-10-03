import Link from 'next/link';
import clsx from 'clsx';

const TABS = [
  { id: 'deals', label: 'Deal', path: '/deals' },
  { id: 'reels', label: 'Reels', path: '' },
  { id: 'poster', label: 'Poster', path: '/poster' },
] as const;

/** The three things an owner can do, one row of pills under the name. */
export function ManageTabs({ slug, active }: { slug: string; active: (typeof TABS)[number]['id'] }) {
  return (
    <nav aria-label="Manage your restaurant" className="mt-5 flex gap-2 overflow-x-auto pb-1">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={`/manage/${slug}${t.path}`}
          aria-current={t.id === active ? 'page' : undefined}
          className={clsx(
            'inline-flex min-h-[40px] shrink-0 items-center rounded-full px-4 text-sm font-semibold transition',
            t.id === active ? 'bg-ink text-white' : 'border border-line bg-white text-ink hover:border-ink/30'
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
