import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRestaurantBySlug } from '@/lib/restaurants';
import { halalLabel, HalalBadge } from '@/components/HalalBadge';
import { HalalFactsPanel } from '@/components/HalalFactsPanel';
import { VerificationBadge } from '@/components/VerificationBadge';
import { OpenStatusBadge } from '@/components/OpenStatusBadge';
import { PhotoGallery } from '@/components/PhotoGallery';
import { VideoEmbed } from '@/components/VideoEmbed';
import { OpeningHoursList } from '@/components/OpeningHoursList';
import { OffersList } from '@/components/OffersList';
import {
  NavigationIcon,
  PhoneIcon,
  GlobeIcon,
  MapPinIcon,
  ArrowUpRightIcon,
  SealCheckIcon,
} from '@/components/icons';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) return { title: 'Restaurant not found' };

  const status = halalLabel(restaurant.halal_classification);
  return {
    title: restaurant.name,
    description:
      restaurant.description ??
      `${restaurant.name} — ${status}. ${restaurant.cuisines.join(', ') || 'Restaurant'} in ${restaurant.address}.`,
    alternates: { canonical: `/restaurant/${restaurant.slug}` },
  };
}

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) notFound();

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;
  const cuisines = restaurant.cuisines.join(' · ') || 'Restaurant';

  // Lets search engines surface the listing with its address and hours rather
  // than a bare title — the whole point of a discovery site being indexable.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    address: { '@type': 'PostalAddress', streetAddress: restaurant.address, addressCountry: 'GB' },
    geo: { '@type': 'GeoCoordinates', latitude: restaurant.lat, longitude: restaurant.lng },
    servesCuisine: restaurant.cuisines,
    ...(restaurant.phone ? { telephone: restaurant.phone } : {}),
    ...(restaurant.website_url ? { sameAs: [restaurant.website_url] } : {}),
    ...(restaurant.menu_url ? { hasMenu: restaurant.menu_url } : {}),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PhotoGallery photos={restaurant.photos} restaurantName={restaurant.name} />

      <header className="mt-5">
        <h1 className="text-balance font-display text-[1.7rem] font-semibold leading-tight text-ink sm:text-3xl">
          {restaurant.name}
        </h1>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted">
          <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <span>
            {cuisines}
            <span className="mx-1.5 text-subtle" aria-hidden="true">
              ·
            </span>
            {restaurant.address}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <HalalBadge classification={restaurant.halal_classification} size="lg" />
          <OpenStatusBadge hours={restaurant.openingHours} />
        </div>
      </header>

      {/* Primary actions sit directly under the heading rather than in a second
          sticky bar — the mobile tab bar already owns the bottom edge. */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-ink hover:shadow-md active:scale-[0.98] sm:flex-none"
        >
          <NavigationIcon className="h-4 w-4" />
          Get directions
        </a>
        {restaurant.phone && (
          <a
            href={`tel:${restaurant.phone}`}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-ink/30 active:scale-[0.98] sm:flex-none"
          >
            <PhoneIcon className="h-4 w-4" />
            Call
          </a>
        )}
        {restaurant.menu_url && (
          <a
            href={restaurant.menu_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-ink/30 active:scale-[0.98] sm:flex-none"
          >
            Menu
            <ArrowUpRightIcon className="h-4 w-4 text-subtle" />
          </a>
        )}
      </div>

      {restaurant.description && (
        <p className="mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-ink/80">
          {restaurant.description}
        </p>
      )}

      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-[1.4fr_1fr] sm:gap-6">
        <div className="space-y-5 sm:space-y-6">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <VerificationBadge facts={restaurant.halalFacts} />
          </div>

          <HalalFactsPanel facts={restaurant.halalFacts} />

          {restaurant.videos.length > 0 && (
            <section>
              <h2 className="mb-2.5 font-display text-lg font-semibold text-ink">See the food</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {restaurant.videos.map((v) => (
                  <VideoEmbed key={v.id} video={v} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold text-ink">Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-subtle">Address</dt>
                <dd className="mt-0.5 text-ink/80">{restaurant.address}</dd>
              </div>
              {restaurant.phone && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-subtle">Phone</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`tel:${restaurant.phone}`}
                      className="inline-flex items-center gap-1.5 font-medium text-accent-ink hover:underline"
                    >
                      <PhoneIcon className="h-4 w-4" />
                      {restaurant.phone}
                    </a>
                  </dd>
                </div>
              )}
              {restaurant.website_url && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-subtle">
                    Website
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={restaurant.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-accent-ink hover:underline"
                    >
                      <GlobeIcon className="h-4 w-4" />
                      Visit website
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-ink">Opening hours</h2>
              <OpenStatusBadge hours={restaurant.openingHours} showDetail={false} />
            </div>
            <div className="mt-3">
              <OpeningHoursList hours={restaurant.openingHours} />
            </div>
          </section>

          <OffersList offers={restaurant.offers} />

          {restaurant.halal_classification === 'unverified' && (
            <Link
              href={`/restaurant/${restaurant.slug}/verify`}
              className="flex items-start gap-3 rounded-2xl border border-dashed border-black/15 p-5 text-sm text-muted transition hover:border-ink/30 hover:bg-white"
            >
              <SealCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" />
              <span>
                Run this restaurant?{' '}
                <span className="font-semibold text-accent-ink">Request verification →</span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
