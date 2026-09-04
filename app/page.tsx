import Image from 'next/image';
import Link from 'next/link';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { HalalBadge } from '@/components/HalalBadge';
import { MapPinIcon, SealCheckIcon, MapIcon, ArrowRightIcon } from '@/components/icons';

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

export default function HomePage() {
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

      <section className="mx-auto max-w-5xl px-5 pb-14 pt-12 sm:px-6 sm:py-20">
        <div className="text-center">
          <h2 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
            Three simple labels
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-pretty text-[15px] leading-relaxed text-muted">
            Every restaurant gets exactly one. And “Unverified” never means a place isn&apos;t
            halal — it just means we haven&apos;t checked it yet.
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {LABELS.map(({ classification, body }) => (
            <li
              key={classification}
              className="rounded-2xl border border-line bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <HalalBadge classification={classification} size="lg" />
              <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-white/60">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-5 py-14 sm:grid-cols-3 sm:px-6 sm:py-16">
          {[
            {
              Icon: SealCheckIcon,
              title: 'Checked, not guessed',
              body: 'We record what we actually verified — alcohol, pork, certification — and when we last looked.',
            },
            {
              Icon: MapPinIcon,
              title: 'Sorted by how far',
              body: 'Search a postcode or use your location, then see every place on a map with walking distance.',
            },
            {
              Icon: MapIcon,
              title: 'Something new tonight',
              body: 'Swipe the Discover feed when you already know you want halal but not what kind.',
            },
          ].map(({ Icon, title, body }) => (
            <div key={title}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/discover"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Just show me food</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Scroll the Discover feed, one restaurant at a time.
              </p>
            </div>
            <ArrowRightIcon className="h-5 w-5 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
          </Link>

          <Link
            href="/submit-restaurant"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Run a halal place?</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Add your restaurant and tell people exactly what you serve.
              </p>
            </div>
            <ArrowRightIcon className="h-5 w-5 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
          </Link>
        </div>
      </section>
    </div>
  );
}
