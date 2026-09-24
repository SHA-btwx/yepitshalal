import Link from 'next/link';
import clsx from 'clsx';
import { forestFade, forestLights } from './grounds';
import { pageShell } from './prose';
import { SceneMedia, type SceneArt } from './media/SceneMedia';

// The top of every page that is not the homepage, in the homepage's language.
//
// One header, two grounds, both borrowed from the homepage:
//
//   forest  the hero's own ground: grain, the three lights, the soft edge.
//           For pages a visitor chooses to read.
//   sand    the "How it works" band. For utility and legal pages, where a dark
//           hero would be ceremony.
//
// Same left edge as the site header, and the same budget rule the homepage
// hero is held to: a headline, one line of lede, and at most one row of
// actions.
//
// A picture is part of the ground, never a framed photo beside the words
// (2026-09-24). On a phone it is a band across the top that fades down into
// the forest, and the title rises into the fade. From 1024px it fills the
// right-hand side of the header to the edge of the window and fades toward
// the words. It is never left out on a small screen: the band is short enough
// that the title still opens the first view.

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHero({
  tone = 'forest',
  label,
  title,
  lede,
  crumbs,
  art,
  children,
  titleId,
}: {
  tone?: 'forest' | 'sand';
  /** A small label above the title. Use sparingly: most titles need none. */
  label?: { text: string; icon?: React.ReactNode };
  title: React.ReactNode;
  lede?: React.ReactNode;
  crumbs?: Crumb[];
  /** Pictures only sit on the forest ground. */
  art?: SceneArt;
  /** Actions, or anything else that belongs in the header: one row. */
  children?: React.ReactNode;
  titleId?: string;
}) {
  const dark = tone === 'forest';
  const scene = dark ? art : undefined;

  return (
    <header
      className={clsx(
        'relative overflow-hidden',
        dark ? 'ground-dark grain bg-forest-deep text-white' : 'border-b border-sand-line bg-sand text-ink'
      )}
    >
      {dark && <div aria-hidden="true" className={`absolute inset-0 ${forestLights}`} />}

      {scene && (
        <SceneMedia
          art={scene}
          className="absolute inset-x-0 top-0 h-[min(64vw,420px)] sm:h-[min(52vw,440px)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[56%]"
          fade={{ bottom: '72%' }}
          fadeLg={{ left: '58%', bottom: '30%' }}
          sizes="(min-width: 1024px) 64vw, 180vw"
          control="top-right"
        >
          {/* A little more depth where the words rise into the picture. */}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-forest-deep/10 via-forest-deep/20 to-forest-deep/60 lg:bg-gradient-to-r lg:from-forest-deep/50 lg:via-forest-deep/10 lg:to-transparent" />
        </SceneMedia>
      )}

      {dark && <div aria-hidden="true" className={forestFade} />}

      <div
        className={clsx(
          pageShell,
          'relative',
          dark ? 'pb-14 sm:pb-16 lg:pb-20' : 'pb-10 pt-9 sm:pb-12 sm:pt-12',
          dark && (scene ? 'pt-[min(40vw,260px)] sm:pt-[min(34vw,300px)] lg:pt-16' : 'pt-9 sm:pt-14 lg:pt-16'),
          scene && 'lg:min-h-[26rem] lg:flex lg:flex-col lg:justify-center'
        )}
      >
        <div className={clsx('min-w-0', scene && 'lg:max-w-[46%]')}>
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className={clsx('flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]', dark ? 'text-white/65' : 'text-subtle')}>
                {crumbs.map((c, i) => (
                  <li key={c.label} className="inline-flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true">/</span>}
                    {c.href ? (
                      <Link
                        href={c.href}
                        className={clsx(
                          'inline-flex min-h-[32px] items-center underline-offset-2 transition hover:underline',
                          dark ? 'text-white/80 hover:text-white' : 'text-muted hover:text-ink'
                        )}
                      >
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current="page">{c.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {label && (
            <p
              className={clsx(
                'mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                dark ? 'bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm' : 'bg-white text-spice-ink ring-1 ring-sand-line'
              )}
            >
              {label.icon}
              {label.text}
            </p>
          )}

          <h1
            id={titleId}
            className={clsx(
              'max-w-3xl text-balance font-display font-semibold leading-[1.06] tracking-[-0.02em]',
              dark
                ? 'text-[2rem] min-[390px]:text-[2.2rem] sm:text-[2.7rem] lg:text-[3.1rem]'
                : 'text-[1.9rem] sm:text-[2.4rem]',
              scene && '[text-shadow:0_2px_24px_rgba(4,24,30,0.45)]'
            )}
          >
            {title}
          </h1>

          {lede && (
            <p
              className={clsx(
                'mt-4 max-w-xl text-pretty text-[15px] leading-relaxed sm:text-[17px]',
                dark ? 'text-white/80' : 'text-muted'
              )}
            >
              {lede}
            </p>
          )}

          {children && <div className="mt-6 sm:mt-8">{children}</div>}
        </div>
      </div>
    </header>
  );
}

/** Buttons on the forest ground: the hero's own pair, inverted for the dark. */
export const heroPrimary =
  'group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink shadow-sm transition duration-200 ease-out hover:-translate-y-px hover:bg-sand-soft hover:shadow-md active:translate-y-0 active:scale-[0.985]';
export const heroSecondary =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white/10 px-6 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition duration-200 ease-out hover:-translate-y-px hover:bg-white/15 active:translate-y-0 active:scale-[0.985]';
