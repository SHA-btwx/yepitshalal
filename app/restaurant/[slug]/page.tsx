import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRestaurantBySlug } from '@/lib/restaurants';
import { HalalBadge } from '@/components/HalalBadge';
import { HalalFactsPanel } from '@/components/HalalFactsPanel';
import { VerificationBadge } from '@/components/VerificationBadge';
import { PhotoGallery } from '@/components/PhotoGallery';
import { VideoEmbed } from '@/components/VideoEmbed';
import { OpeningHoursList } from '@/components/OpeningHoursList';
import { OffersList } from '@/components/OffersList';

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) notFound();

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <PhotoGallery photos={restaurant.photos} restaurantName={restaurant.name} />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{restaurant.name}</h1>
          <p className="mt-1 text-sm text-ink/55">
            {restaurant.cuisines.join(' · ') || 'Restaurant'} · {restaurant.address}
          </p>
          <div className="mt-3">
            <HalalBadge classification={restaurant.halal_classification} size="lg" />
          </div>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-ink hover:shadow-md active:scale-[0.98]"
        >
          Get directions
        </a>
      </div>

      {restaurant.description && (
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink/70">{restaurant.description}</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <VerificationBadge facts={restaurant.halalFacts} />
          </div>

          <HalalFactsPanel facts={restaurant.halalFacts} />

          {restaurant.videos.length > 0 && (
            <div>
              <h2 className="mb-2 font-display text-base font-semibold text-ink">See the food</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {restaurant.videos.map((v) => (
                  <VideoEmbed key={v.id} video={v} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold text-ink">Details</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="text-ink/40">Address</dt>
                <dd className="text-ink/80">{restaurant.address}</dd>
              </div>
              {restaurant.phone && (
                <div>
                  <dt className="text-ink/40">Phone</dt>
                  <dd>
                    <a href={`tel:${restaurant.phone}`} className="text-accent-ink hover:underline">
                      {restaurant.phone}
                    </a>
                  </dd>
                </div>
              )}
              {restaurant.website_url && (
                <div>
                  <dt className="text-ink/40">Website</dt>
                  <dd>
                    <a href={restaurant.website_url} target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline">
                      Visit website
                    </a>
                  </dd>
                </div>
              )}
              {restaurant.menu_url && (
                <div>
                  <dt className="text-ink/40">Menu</dt>
                  <dd>
                    <a href={restaurant.menu_url} target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline">
                      View menu
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold text-ink">Opening hours</h2>
            <div className="mt-3">
              <OpeningHoursList hours={restaurant.openingHours} />
            </div>
          </div>

          <OffersList offers={restaurant.offers} />

          {restaurant.halal_classification === 'unverified' && (
            <Link
              href={`/restaurant/${restaurant.slug}/verify`}
              className="block rounded-2xl border border-dashed border-black/15 p-5 text-center text-sm text-ink/60 transition hover:border-ink/30 hover:text-ink"
            >
              Run this restaurant? <span className="font-semibold text-accent-ink">Request verification →</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
