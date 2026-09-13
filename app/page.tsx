import Image from 'next/image';
import Link from 'next/link';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { HalalBadge } from '@/components/HalalBadge';
import { MapPinIcon, SealCheckIcon, MapIcon, ArrowRightIcon, ForkKnifeIcon, HeartHandIcon } from '@/components/icons';
import { HomeReelStrip } from '@/components/HomeReelStrip';
import { getFeaturedReels } from '@/lib/reels';
import { ctaPrimary, ctaSecondary, ctaGhost } from '@/components/cta';

// Hand-picked London neighbourhoods with dense halal high streets. Linking
// straight to coordinates removes the "what do I even type?" beat for a first
// visit — the hardest moment in a location-first product.
const POPULAR_AREAS = [
  { label: 'Whitechapel', lat: 51.5195, lng: -0.0596 },
  { label: 'Edgware Road', lat: 51.5203, lng: -0.167 },
  { label: 'Green Street', lat: 51.5385, lng: 0.027 },
  { label: 'Shoreditch', lat: 51.5265, lng: -0.0784 },
  { label: 'Tooting', lat: 51.4275, lng: -0.168 },
  { label: 'Wembley', lat: 51.5528, lng: -0.2963 },
];

// Drawn from the same licensed pool the restaurant cards use (see
// scripts/assign-stock-photos.mjs), picked for how they hold up in a square.
const HERO_PHOTOS = [
  { src: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=900' },
  { src: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600' },
  { src: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600' },
];

const LABELS = [
  {
    classification: 'fully_halal' as const,
    body: 'We checked it ourselves. Everything on the menu is halal.',
  },
  {
    classification: 'halal_options' as const,
    body: 'Halal food is on the menu, but the kitchen also serves other things.',
  },
  {
    classification: 'unverified' as const,
    body: "We haven't checked this one yet. That's all it means.",
  },
];

export default async function HomePage() {
  const featuredReels = await getFeaturedReels();

  return (
    <div>
      {/* ATTENTION. A sign in a window is a claim; this page's entire pitch is
          that we don't stop there. The headline names the customer's actual
          state (guessing, whether they'd admit it or not) rather than
          describing the product — curiosity comes from being seen, not from
          being told what a directory does. The search bar is Action available
          immediately, for the visitor who already knows what they want; the
          rest of the page is for everyone else, who needs Interest and Desire
          first. Photos sit in square frames rather than a stretched banner
          crop, so contrast on the text never has to fight a scrim. */}
      <section className="relative overflow-hidden bg-ink">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_0%,rgba(28,154,75,0.35),transparent_60%),radial-gradient(90%_80%_at_0%_100%,rgba(15,94,46,0.45),transparent_65%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-paper"
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-12 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
              <MapPinIcon className="h-3.5 w-3.5" />
              London, for now
            </span>
            <h1 className="mt-4 text-balance font-display text-[2.15rem] font-semibold leading-[1.08] text-white sm:text-5xl">
              Stop guessing if it&apos;s halal.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-white/85 sm:text-lg lg:mx-0">
              Search your area. See what&apos;s halal, and how we know.
            </p>

            <div id="search" className="mt-7 flex justify-center lg:justify-start">
              <LocationSearchBar />
            </div>

            <div className="mt-7">
              <h2 className="text-xs font-semibold text-white/60">Popular areas</h2>
              <ul className="mt-2.5 flex flex-wrap justify-center gap-2 lg:justify-start">
                {POPULAR_AREAS.map((area) => (
                  <li key={area.label}>
                    <Link
                      href={`/search?lat=${area.lat}&lng=${area.lng}&mode=searched_location&label=${encodeURIComponent(area.label)}`}
                      className="inline-flex min-h-[38px] items-center rounded-full bg-white/10 px-3.5 text-sm font-medium text-white ring-1 ring-white/20 transition hover:bg-white/20"
                    >
                      {area.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Decorative: the same dishes are shown for real, with names and halal
              status, a screen further down. Hidden below lg rather than shrunk —
              on a phone the search field should own the first screen. */}
          <ul aria-hidden="true" className="hidden gap-3 lg:grid lg:grid-cols-2">
            {HERO_PHOTOS.map((photo, i) => (
              <li
                key={photo.src}
                className={
                  i === 0
                    ? 'relative col-span-2 aspect-[16/9] overflow-hidden rounded-2xl ring-1 ring-white/15'
                    : 'relative aspect-square overflow-hidden rounded-2xl ring-1 ring-white/15'
                }
              >
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 300px, 1px"
                  priority={i === 0}
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* INTEREST. Before any proof of food or ease of use, the visitor needs
          the one idea the rest of the site leans on: a label isn't a rating,
          it's an answer to three specific questions. This used to sit after
          the reel strip, as a dry legend; it belongs here, because Desire
          (the reels, the three-step journey) only lands once someone has a
          reason to trust the label under the food. */}
      <section className="mx-auto max-w-2xl px-5 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-20">
        <div className="text-center">
          <h2 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
            A &ldquo;halal&rdquo; sign only tells you so much
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-pretty text-[15px] leading-relaxed text-muted">
            It doesn&apos;t say who checked, what they checked, or when. So every
            restaurant here carries a different kind of label, one that answers all
            three.
          </p>
        </div>

        <dl className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          {LABELS.map(({ classification, body }) => (
            <div
              key={classification}
              className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-5"
            >
              <dt className="sm:w-40 sm:shrink-0">
                <HalalBadge classification={classification} size="md" />
              </dt>
              <dd className="text-sm leading-relaxed text-muted">{body}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-center text-sm leading-relaxed text-muted">
          &ldquo;Unverified&rdquo; never means a place isn&apos;t halal. It only means we
          haven&apos;t checked it yet.
        </p>
      </section>

      {/* DESIRE, beat one: proof, not a promise. Deliberately still rather
          than autoplaying — the brief rules that out, and it would fight the
          search field for attention if it sat any higher on the page. */}
      <HomeReelStrip reels={featuredReels} />

      {/* DESIRE, beat two: the journey is short, which is itself part of the
          pitch. Genuinely a sequence, so it earns the step markers. */}
      <section className="border-b border-line bg-white/60">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-14">
          <h2 className="text-sm font-semibold text-subtle">How it works</h2>
          <ol className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {[
              {
                Icon: MapIcon,
                step: 'Discover',
                body: 'Search your area, or scroll the feed until something looks good.',
              },
              {
                Icon: SealCheckIcon,
                step: 'Check',
                body: 'See the halal status, what we verified, and when we last looked.',
              },
              {
                Icon: ForkKnifeIcon,
                step: 'Eat',
                body: 'Directions, hours and the menu, then go.',
              },
            ].map(({ Icon, step, body }, i) => (
              <li key={step} className="flex gap-3.5 sm:flex-col sm:gap-0">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="sm:mt-3">
                  <h3 className="flex items-baseline gap-2 font-display text-lg font-semibold text-ink">
                    {step}
                    <span className="text-xs font-medium text-subtle" aria-hidden="true">
                      {i + 1} of 3
                    </span>
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ACTION. One dominant, unambiguous ask. There is nothing to buy on
          this page, so the ask is the thing this site actually runs on:
          keep looking. The headline deliberately echoes the hero's, closing
          the loop it opened rather than introducing a new one. */}
      <section className="mx-auto max-w-2xl px-5 pb-14 pt-14 text-center sm:px-6 sm:pb-16 sm:pt-16">
        <h2 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
          Ready to stop guessing?
        </h2>
        <p className="mx-auto mt-2.5 max-w-md text-pretty text-[15px] leading-relaxed text-muted">
          Open Discover and scroll through real kitchens, real labels, real answers, one
          at a time. Or head back up and search your street directly.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/discover" className={ctaPrimary}>
            Open Discover
            <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a href="#search" className={ctaSecondary}>
            Search your street
          </a>
        </div>
      </section>

      {/* P.S. Yep+ and the restaurant-owner path are real, but this is a free
          discovery site with nothing to sell on this page, so neither gets a
          second hero. A postscript is the most-read line in a direct-response
          letter, which is exactly the job here: seen by everyone, pushed on
          no one. Halal information is never behind either of these. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-14">
          <p className="font-display text-sm font-semibold text-ink">P.S.</p>
          <div className="mt-3 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
            <div>
              <p className="text-pretty text-sm leading-relaxed text-muted">
                <span className="font-semibold text-ink">Yep+</span> opens search across
                all of London instead of just nearby, plus member offers, from £4.99 a
                month. Halal information itself stays free, always.
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-pretty text-sm leading-relaxed text-muted">
                <HeartHandIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent-ink" />
                Every month of membership also funds a meal through ShareTheMeal.
              </p>
              <Link href="/yep-plus" className={`${ctaGhost} -ml-4 mt-1`}>
                See what you get
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div>
              <p className="text-pretty text-sm leading-relaxed text-muted">
                <span className="font-semibold text-ink">Run a halal restaurant?</span>{' '}
                Listing is free. So is your first reel: a short clip of your food that
                shows on your page and can surface in Discover.
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <Link href="/submit-restaurant" className={`${ctaGhost} -ml-4`}>
                  Add your restaurant
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link href="/partners" className={ctaGhost}>
                  How partnerships work
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
