import Image from 'next/image';
import Link from 'next/link';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { HalalBadge } from '@/components/HalalBadge';
import { MapPinIcon, SealCheckIcon, MapIcon, ArrowRightIcon, SparkleIcon, ForkKnifeIcon, HeartHandIcon } from '@/components/icons';
import { HomeReelStrip } from '@/components/HomeReelStrip';
import { getFeaturedReels } from '@/lib/reels';
import { ctaPrimary, ctaSecondary, linkCard } from '@/components/cta';

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
      {/* The hero used to lay copy over a full-bleed photo. Every image in the
          library is a tight food macro; stretched to a 1265×570 banner it read
          as texture, and the scrim needed to keep white text at 4.5:1 flattened
          it to grey. Photos now sit in square frames — the crop they were shot
          for — and text sits on a solid ground, so contrast is guaranteed. */}
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
              <MapPinIcon className="h-3.5 w-3.5" />
              London · Beta
            </span>
            <h1 className="mt-4 text-balance font-display text-[2.15rem] font-semibold leading-[1.08] text-white sm:text-5xl">
              Find halal food near you.
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-white/85 sm:text-lg lg:mx-0">
              We show you which restaurants are halal, and how we know. No guessing.
            </p>

            <div className="mt-7 flex justify-center lg:justify-start">
              <LocationSearchBar />
            </div>

            <div className="mt-7">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-white/60">
                Popular areas
              </h2>
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

      <HomeReelStrip reels={featuredReels} />

      {/* A key, not a taxonomy. Three equal cards presented the statuses as
          three kinds of restaurant to choose between; they are really one
          reading that every restaurant carries, so they belong in a single
          legend you scan top to bottom. */}
      <section className="mx-auto max-w-2xl px-5 pb-14 pt-12 sm:px-6 sm:py-20">
        <div className="text-center">
          <h2 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
            How to read the label
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-pretty text-[15px] leading-relaxed text-muted">
            Every restaurant carries one. It tells you what we know — not whether a place is any
            good.
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
          &ldquo;Unverified&rdquo; never means a place isn&apos;t halal — only that we
          haven&apos;t checked it yet.
        </p>
      </section>

      {/* Discover -> Check -> Eat. Replaces three paragraphs of feature copy:
          the same idea, but as the shape of the journey, which is what someone
          landing here actually needs to grasp. */}
      <section className="border-y border-line bg-white/60">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-14">
          {/* The steps are h3s; without this the outline jumped h1 -> h3. */}
          <h2 className="sr-only">How YepItsHalal works</h2>
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
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
                body: 'Directions, hours and the menu — then go.',
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

      {/* Yep+ gets a mention, not a pitch — the dedicated page does the selling.
          Halal information is never behind it, and the copy says so. */}
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-16">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-accent-ink p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-md">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                <SparkleIcon className="h-3.5 w-3.5" />
                Yep+
              </span>
              <h2 className="mt-3 text-balance font-display text-2xl font-semibold sm:text-3xl">
                Go further. Eat better. Give back.
              </h2>
              <p className="mt-2.5 text-pretty text-sm leading-relaxed text-white/85">
                Search anywhere in London instead of just nearby, plus member offers and vouchers.
                Halal information stays free for everyone, always.
              </p>
              <p className="mt-3 inline-flex items-start gap-2 text-sm leading-relaxed text-white/85">
                <HeartHandIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent-onDark" />
                Every month of membership funds a meal through ShareTheMeal.
              </p>
            </div>

            <div className="shrink-0 sm:text-right">
              <p className="font-display text-2xl font-semibold">
                £4.99<span className="text-base font-normal text-white/70">/month</span>
              </p>
              <p className="mt-0.5 text-sm text-white/75">or £39.99/year</p>
              <Link
                href="/yep-plus"
                className="group mt-4 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink shadow-sm transition duration-200 ease-out hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-[0.985]"
              >
                See what you get
                <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurants matter commercially but this is a consumer homepage, so
          they get one row near the bottom, not a second hero. */}
      <section className="mx-auto max-w-5xl px-5 pb-16 sm:px-6 sm:pb-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-ink">Run a halal restaurant?</h2>
            <p className="mt-1.5 max-w-md text-pretty text-sm leading-relaxed text-muted">
              Listing is free, and so is your first reel — a short clip of your food that shows on
              your page and can surface in Discover. Partners can publish more.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link href="/submit-restaurant" className={ctaPrimary}>
                Add your restaurant
              </Link>
              <Link href="/partners" className={ctaSecondary}>
                How partnerships work
              </Link>
            </div>
          </div>

          <Link href="/discover" className={`${linkCard} p-6`}>
            <div className="flex h-full items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">Just show me food</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Scroll Discover, one restaurant at a time.
                </p>
              </div>
              <ArrowRightIcon className="h-5 w-5 shrink-0 text-subtle transition duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
