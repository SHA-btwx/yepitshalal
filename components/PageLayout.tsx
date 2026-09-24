import clsx from 'clsx';
import { Reveal } from './Reveal';
import { pageShell, sectionLede, sectionStack, sectionTitle } from './prose';

// Everything under a PageHero.
//
// One reading column at about 65 characters, on the same left edge as the
// header above it. On wide screens a page can put one thing beside it, in a
// column that stays in view: the supporter card on /yep-plus, the email on
// /corrections, a short "on this page" list on a long explainer. Below lg that
// column either follows the text or is left out, and each page says which.

export function PageBody({
  children,
  aside,
  asideOnPhone = 'after',
  wide = false,
  className,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  /** 'after' puts the aside under the text on a phone; 'hide' leaves it out. */
  asideOnPhone?: 'after' | 'hide';
  /** For a page built around a grid rather than running text. */
  wide?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        pageShell,
        'pb-4 pt-10 sm:pt-14',
        aside && 'lg:grid lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)] lg:gap-16 xl:gap-24',
        className
      )}
    >
      <div className={clsx('min-w-0', wide ? 'max-w-4xl' : 'max-w-2xl', sectionStack)}>{children}</div>
      {aside && (
        <aside className={clsx('mt-14 lg:mt-0', asideOnPhone === 'hide' && 'hidden lg:block')}>
          <div className="space-y-4 lg:sticky lg:top-24">{aside}</div>
        </aside>
      )}
    </div>
  );
}

export function PageSection({
  id,
  title,
  lede,
  children,
  reveal = true,
  className,
}: {
  id: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children?: React.ReactNode;
  /** Off for anything a reader might land on directly and should not see mid-fade. */
  reveal?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <h2 id={`${id}-title`} className={sectionTitle}>
        {title}
      </h2>
      {lede && <p className={sectionLede}>{lede}</p>}
      {children && <div className="mt-5">{children}</div>}
    </>
  );
  return reveal ? (
    <Reveal as="section" id={id} aria-labelledby={`${id}-title`} className={clsx('scroll-mt-24', className)}>
      {inner}
    </Reveal>
  ) : (
    <section id={id} aria-labelledby={`${id}-title`} className={clsx('scroll-mt-24', className)}>
      {inner}
    </section>
  );
}

/** A short list of jump links for a long page. Plain anchors, no scroll spy. */
export function OnThisPage({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav aria-label="On this page" className="border-l border-line pl-5">
      <p className="text-xs font-semibold text-subtle">On this page</p>
      <ul className="mt-2 space-y-0.5">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className="-ml-5 inline-flex min-h-[36px] items-center border-l-2 border-transparent pl-[18px] text-sm text-muted transition hover:border-accent hover:text-ink"
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
