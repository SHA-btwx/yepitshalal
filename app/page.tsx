import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { HalalBadge } from '@/components/HalalBadge';
import { MapPinIcon, SealCheckIcon, MapIcon, ArrowRightIcon, ForkKnifeIcon, HeartHandIcon } from '@/components/icons';
import { HomeReelStrip } from '@/components/HomeReelStrip';
import { getFeaturedReels } from '@/lib/reels';
import { getAreasWithPages } from '@/lib/areas';
import { getCuisines } from '@/lib/cuisines';
import { countPrayerSpaces } from '@/lib/prayerSpaces';
import { NearestMosqueButton } from '@/components/NearestMosqueButton';
import { NotifyMeForm } from '@/components/NotifyMeForm';
import { ctaPrimary, ctaSecondary, ctaGhost } from '@/components/cta';
import { jsonLdHtml } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/site';
import { hreflangAlternates } from '@/lib/locales';
import { Reveal } from '@/components/Reveal';

// The English homepage is the x-default and the canonical target every
// translated landing page points back to. See lib/locales.
export const metadata: Metadata = {
  alternates: { canonical: '/', languages: hreflangAlternates(SITE_URL) },
};

// Hand-picked London neighbourhoods with dense halal high streets. Linking
// straight to coordinates removes the "what do I even type?" beat for a first
// visit, the hardest moment in a location-first product.
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
    body: 'Strong evidence that all the meat is halal.',
  },
  {
    classification: 'halal_options' as const,
    body: 'Halal food served alongside food that is not.',
  },
  {
    classification: 'unverified' as const,
    body: "Signs of halal food, not confirmed. Never means not halal.",
  },
  {
    classification: 'unknown' as const,
    body: 'The kind of food that is usually halal. Nobody has checked this one.',
  },
];

// What the site is and how to search it, for the engines and assistants that
// build an entity out of a domain before they decide what any page means.
const SITE_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'YepItsHalal',
      description:
        'Halal restaurants in London, each with the evidence behind its label and the date it was checked.',
      inLanguage: 'en-GB',
      publisher: { '@id': `${SITE_URL}/#org` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?label={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: 'YepItsHalal',
      url: SITE_URL,
      logo: `${SITE_URL}/icon`,
      areaServed: { '@type': 'City', name: 'London' },
    },
  ],
};

export default async function HomePage() {
  const [featuredReels, areas, cuisines, prayerSpaceCount] = await Promise.all([
    getFeaturedReels(),
    getAreasWithPages(),
    getCuisines(),
    countPrayerSpaces(),
  ]);
  // The borough pages are the indexable half of this site. Every prominent link
  // on this page went to /search, which is noindexed and disallowed in
  // robots.txt, so a crawler arriving here had nowhere to go but the footer.
  const biggestAreas = [...areas].sort((a, b) => b.listed - a.listed).slice(0, 8);
  // Most people do not decide by postcode, they decide by what they fancy, so
  // the kind of food is an entry point rather than a filter buried in a box.
  const topCuisines = cuisines.slice(0, 10);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(SITE_LD) }} />
      {/* ATTENTION. A sign in a window is a claim; this page's entire pitch is
          that we don't stop there. The headline names the customer's actual
          state (guessing, whether they'd admit it or not) rather than
          describing the product: curiosity comes from being seen, not from
          being told what a directory does. The search bar is Action available
          immediately, for the visitor who already knows what they want; the
          rest of the page is for everyone else, who needs Interest and Desire
          first. Photos sit in square frames rather than a stretched banner
          crop, so contrast on the text never has to fight a scrim. */}
      <section className="grain relative overflow-hidden bg-forest-deep">
        {/* Three lights rather than one: green from the top right, a deeper
            green from the bottom left, and a warm ember between them. The old
            near-black ground with a single green wash read as careful and also
            as empty. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_82%_-10%,rgba(52,197,107,0.38),transparent_58%),radial-gradient(95%_85%_at_-5%_105%,rgba(11,61,34,0.95),transparent_62%),radial-gradient(70%_60%_at_15%_15%,rgba(194,84,43,0.22),transparent_60%)]"
        />
        {/* Softens the edge between the dark hero and the cream below, and
            nothing more. It used to be 64px tall with the area chips sitting
            42px inside it: those chips are 10% white, so the cream came
            straight through them and took the white label with it. Now it is
            40px, and the section's bottom padding keeps every element clear of
            it. A fade with content in it is not a fade, it is a smudge. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-sand-soft"
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-12 pt-7 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div className="text-center lg:text-left">
            {/* Two facts, not one hedge. "London, for now" as a grey whisper
                left people to work out for themselves whether the site was
                small or broken; saying it is a beta and that London is the
                first city makes the same limitation read as a plan. */}
            <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-white/12 py-1 pl-1 pr-3.5 text-xs text-white ring-1 ring-white/20">
              <span className="rounded-full bg-spice px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                Beta
              </span>
              <a href="#next-cities" className="inline-flex items-center gap-1.5 font-semibold underline decoration-white/35 underline-offset-2 transition hover:decoration-white">
                <MapPinIcon className="h-3.5 w-3.5" />
                London&apos;s the test run. More cities soon.
              </a>
            </span>

            {/* The whole pitch, and big enough to be the only thing read. The
                paragraph that used to sit under it said the same thing again
                in smaller type, and the section below the fold says it
                properly, so it went. */}
            {/* Two lines, on every width, because the break is a decision and
                not something to leave to the container. At 2.75rem the phrase
                wrapped to three on a phone and ate the screen the search box
                needs; the size below is the largest that keeps "wherever you
                are." on one line at 375px. */}
            <h1 className="mt-4 font-display text-[2rem] font-semibold leading-[1.06] min-[360px]:text-[2.2rem] tracking-[-0.02em] text-white min-[390px]:text-[2.35rem] sm:text-[3.1rem] lg:text-[3.6rem] xl:text-[4rem]">
              <span className="block">Find halal food,</span>
              <span className="block">wherever you are.</span>
            </h1>

            <div id="search" className="mt-5 flex justify-center sm:mt-8 lg:justify-start">
              <LocationSearchBar />
            </div>

            <div className="mt-4 sm:mt-7">
              <h2 className="text-xs font-semibold text-white/60">Popular areas</h2>
              <ul className="-mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 lg:justify-start">
                {POPULAR_AREAS.map((area) => (
                  <li key={area.label} className="shrink-0">
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
              status, a screen further down. Hidden below lg rather than shrunk:
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
      <Reveal as="section" className="mx-auto max-w-2xl px-5 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-20">
        <div className="text-center">
          <h2 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
            A &ldquo;halal&rdquo; sign only tells you so much
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-pretty text-[15px] leading-relaxed text-muted">
            It doesn&apos;t say who, or when. Every place here shows both.
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
          Neither &ldquo;Unverified&rdquo; nor &ldquo;Worth asking&rdquo; means a place isn&apos;t
          halal. If it matters to you, ask the restaurant.
        </p>

        {/* Said here, on the page that explains the labels, because this is
            where a reader decides how much to trust them. */}
        <p className="mx-auto mt-4 max-w-lg text-pretty text-center text-sm leading-relaxed text-muted">
          <span className="font-semibold text-ink">We haven&apos;t visited any of them yet.</span>{' '}
          Every label comes from what a place publishes, or from open data. Ours will carry a badge.{' '}
          <Link href="/how-we-check" className="font-semibold text-accent-ink underline underline-offset-2">
            How we label places
          </Link>
        </p>
      </Reveal>

      {/* DESIRE, beat one: proof, not a promise. Deliberately still rather
          than autoplaying: the brief rules that out, and it would fight the
          search field for attention if it sat any higher on the page. */}
      <HomeReelStrip reels={featuredReels} />

      {/* DESIRE, beat two: the journey is short, which is itself part of the
          pitch. Genuinely a sequence, so it earns the step markers. */}
      <Reveal as="section" className="border-y border-sand-line bg-sand">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-14">
          <h2 className="text-sm font-semibold text-spice-ink">How it works</h2>
          <ol className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {[
              {
                Icon: MapIcon,
                step: 'Say where you are',
                body: 'A postcode, an area, a street, or just use your location. Anywhere in London.',
              },
              {
                Icon: SealCheckIcon,
                step: 'See how we know',
                body: 'Each place shows its halal label, the evidence behind it and the date we checked, so you can judge it yourself.',
              },
              {
                Icon: ForkKnifeIcon,
                step: 'Go and eat',
                body: 'Opening hours, the menu and directions, on one page.',
              },
            ].map(({ Icon, step, body }, i) => (
              <li key={step} className="flex gap-3.5 sm:flex-col sm:gap-0">
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    i === 1 ? 'bg-spice-soft text-spice-ink' : 'bg-accent-soft text-accent-ink'
                  }`}
                >
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
      </Reveal>

      {/* For the visitor who has not decided anything yet. A directory is only
          useful if it offers the question a reader is actually asking, and that
          question is usually a kind of food rather than a postcode. */}
      {topCuisines.length > 0 && (
        <Reveal as="section" className="border-b border-sand-line bg-sand-soft">
          <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-14">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-display text-2xl font-semibold text-ink">What do you fancy?</h2>
              <Link href="/halal-restaurants/cuisine" className="text-sm font-semibold text-accent-ink hover:underline">
                All kinds of food
              </Link>
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
              Each one shows what its label rests on, and when.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {topCuisines.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/halal-restaurants/cuisine/${c.slug}`}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-spice/20 bg-white px-4 text-[15px] font-medium text-ink transition hover:-translate-y-0.5 hover:border-spice/45 hover:bg-spice-soft hover:shadow-sm"
                  >
                    Halal {c.cuisine}
                    <span className="text-[13px] text-subtle">{c.listed}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}

      {/* The other half of eating out. Its own band rather than a line in the
          footer, because it is a thing people leave the site to go and look up,
          and one tap is faster than typing "mosque near me" somewhere else.
          It says nothing about any restaurant's food and never could. */}
      <Reveal as="section" className="border-b border-sand-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-11 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
              Praying while you&apos;re out?
            </h2>
            <p className="mt-1.5 max-w-lg text-pretty text-[15px] leading-relaxed text-muted">
              {prayerSpaceCount} across London, with the walk from wherever you are eating.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <NearestMosqueButton />
            <Link href="/prayer-spaces" className={ctaSecondary}>
              Browse by borough
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ACTION. One dominant, unambiguous ask. There is nothing to buy on
          this page, so the ask is the thing this site actually runs on:
          keep looking. The headline deliberately echoes the hero's, closing
          the loop it opened rather than introducing a new one. */}
      <Reveal as="section" className="mx-auto max-w-2xl px-5 pb-14 pt-14 text-center sm:px-6 sm:pb-16 sm:pt-16">
        <h2 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
          So, where are you eating?
        </h2>
        <p className="mx-auto mt-2.5 max-w-md text-pretty text-[15px] leading-relaxed text-muted">
          Every place shows its label, and what it rests on.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href="#search" className={ctaPrimary}>
            Search your area
            <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
          </a>
          <Link href="/how-we-check" className={ctaSecondary}>
            How we label places
          </Link>
        </div>

        {biggestAreas.length > 0 && (
          <p className="mx-auto mt-7 max-w-xl text-pretty text-[13.5px] leading-relaxed text-subtle">
            Or by borough:{' '}
            {biggestAreas.map((a, i) => (
              <span key={a.slug}>
                {i > 0 && ', '}
                <Link href={`/halal-restaurants/${a.slug}`} className="font-medium text-ink/70 underline decoration-black/15 underline-offset-2 transition hover:text-ink hover:decoration-ink/40">
                  {a.borough}
                </Link>
              </span>
            ))}
            {', '}
            <Link href="/halal-restaurants" className="font-semibold text-accent-ink underline underline-offset-2">
              and the rest of London
            </Link>
          </p>
        )}
      </Reveal>

      {/* P.S. There is nothing to buy on this site, so the support ask and the
          restaurant-owner path do not get a second hero. A postscript is the
          most-read line in a direct-response letter, which is exactly the job
          here: seen by everyone, pushed on no one. */}
      <Reveal as="section" className="border-t border-line">
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-14">
          <p className="font-display text-sm font-semibold text-ink">P.S.</p>
          <div className="mt-3 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
            <div>
              <p className="text-pretty text-sm leading-relaxed text-muted">
                <span className="font-semibold text-ink">Checking places costs money.</span>{' '}
                Knowing what is halal never will. Support pays for the checking, from £2.99 a month.
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-pretty text-sm leading-relaxed text-muted">
                <HeartHandIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent-ink" />
                We donate a meal through ShareTheMeal for every month of support.
              </p>
              <Link href="/yep-plus" className={`${ctaGhost} -ml-4 mt-1`}>
                What support pays for
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div>
              <p className="text-pretty text-sm leading-relaxed text-muted">
                <span className="font-semibold text-ink">Run a halal restaurant?</span>{' '}
                Listing is free, and so is your first reel.
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
      </Reveal>

      {/* Last thing on the page, and deliberately so. It is for the visitor who
          read everything and found no city of their own, which is the only
          person it was ever for, and keeping the email fields down here means
          the first screen is a search box rather than a form.

          No Reveal on this one. Everything else on the page can afford to
          arrive; the one section a reader reaches by scrolling to the very
          bottom should never be caught mid-fade, so it is simply there. */}
      <section id="next-cities" className="scroll-mt-24 border-t border-sand-line bg-sand">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-12">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-relaxed text-ink/75">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <MapPinIcon className="h-4 w-4 text-spice-ink" aria-hidden="true" />
              London only, for now.
            </span>
            <span>Tell us where you&apos;re looking and we&apos;ll email you when we get there.</span>
          </p>
          <div className="mt-4 max-w-xl">
            <NotifyMeForm source="homepage expansion footer" />
          </div>
        </div>
      </section>
    </div>
  );
}
