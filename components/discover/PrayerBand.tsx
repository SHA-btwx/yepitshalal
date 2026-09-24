import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRightIcon, ClockIcon } from '@/components/icons';
import { NearestMosqueButton } from '@/components/NearestMosqueButton';
import { SceneMedia } from '@/components/media/SceneMedia';
import { Reveal } from '@/components/Reveal';
import { ctaSecondary } from '@/components/cta';
import { PRAYER_CARPET } from '@/lib/media';

// Somewhere to pray, near where you eat. On Discover since 2026-09-24.
//
// It used to be a band in the middle of the homepage, between the kinds of
// food and the search, where it broke the line from "what does a label mean"
// to "where are you eating". It belongs with the wider question Discover is
// for: where to eat, what is nearby, where to pray.
//
// Everything the homepage band did still works: the nearest-mosque button
// (location asked for, never stored), the borough list, and the way to the
// full page. Figures are read live, as before. It says nothing about any
// restaurant's food and never could; /prayer-spaces explains why the two are
// kept apart.

export function PrayerBand({
  total,
  boroughs,
}: {
  total: number;
  /** Busiest boroughs first. `href` is null where a borough has no page. */
  boroughs: { borough: string; spaces: number; href: string | null }[];
}) {
  return (
    <section aria-labelledby="pray-title" className="relative overflow-hidden bg-sand-soft">
      <SceneMedia
        art={PRAYER_CARPET}
        className="absolute inset-x-0 top-0 h-[min(62vw,380px)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[52%]"
        fade={{ top: '22%', bottom: '70%' }}
        fadeLg={{ left: '55%', top: '14%', bottom: '14%' }}
        position="60% 50%"
        positionLg="75% 50%"
        sizes="(min-width: 1024px) 50vw, 150vw"
        control="none"
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-[min(46vw,280px)] sm:px-6 lg:py-20">
        <Reveal className="lg:max-w-[46%]">
          <h2 className="text-balance font-display text-[1.8rem] font-semibold leading-[1.1] tracking-[-0.01em] text-ink sm:text-[2.4rem]" id="pray-title">
            Somewhere to pray, near where you eat
          </h2>
          <p className="mt-3 max-w-lg text-pretty text-[15px] leading-relaxed text-muted sm:text-[17px]">
            {total} mosques and prayer spaces across London, from OpenStreetMap. Every restaurant page says
            how far the nearest one is to walk.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <NearestMosqueButton className="min-h-[48px] px-6" />
            <Link href="/prayer-spaces" className={clsx(ctaSecondary, 'group')}>
              All prayer spaces
              <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-3 text-[13px] text-subtle">The nearest-mosque button uses your location. We never store it.</p>

          <p className="mt-6 flex items-start gap-2.5 text-sm leading-relaxed text-ink/80">
            <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-spice-ink" aria-hidden="true" />
            <span>
              <span className="font-semibold text-ink">Opening times are the weak part.</span> A mosque listed
              as open may still be locked, so ring ahead for a particular prayer.
            </span>
          </p>

          {boroughs.length > 0 && (
            <div className="mt-7">
              <p className="text-xs font-semibold text-subtle">
                Or pick a borough: its restaurant pages each say where the nearest prayer space is
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {boroughs.map((b) => (
                  <li key={b.borough}>
                    {b.href ? (
                      <Link
                        href={b.href}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line bg-white/80 px-3.5 text-[14px] font-medium text-ink/85 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent-soft hover:text-ink"
                      >
                        {b.borough}
                        <span className="text-[13px] tabular-nums text-subtle">{b.spaces}</span>
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 text-[14px] text-muted">
                        {b.borough}
                        <span className="text-[13px] tabular-nums text-subtle">{b.spaces}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
