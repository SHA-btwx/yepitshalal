import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRestaurantBySlug } from '@/lib/restaurants';
import { getPublishedReels, isActivePartner } from '@/lib/reels';
import { halalLabel, HalalBadge } from '@/components/HalalBadge';
import { HalalFactsPanel } from '@/components/HalalFactsPanel';
import { HalalEvidencePanel } from '@/components/HalalEvidencePanel';
import { OpenStatusBadge } from '@/components/OpenStatusBadge';
import { PhotoGallery } from '@/components/PhotoGallery';
import { ReelShowcase } from '@/components/ReelShowcase';
import { OwnershipCta } from '@/components/OwnershipCta';
import { OpeningHoursList } from '@/components/OpeningHoursList';
import { OffersList } from '@/components/OffersList';
import { cleanRestaurantName } from '@/lib/restaurantName';
import { jsonLdHtml } from '@/lib/jsonLd';
import { formatUkPhone, splitPhones } from '@/lib/phone';
import { isStockPhoto, DAY_NAMES } from '@/lib/types';
import {
  NavigationIcon,
  PhoneIcon,
  GlobeIcon,
  MapPinIcon,
  ArrowUpRightIcon,
  SealCheckIcon,
  WarningIcon,
} from '@/components/icons';

const SOURCE_CREDIT: Record<string, string> = {
  fsa: 'Food Standards Agency food hygiene register (Open Government Licence)',
  osm: 'OpenStreetMap contributors (ODbL)',
  overture: 'Overture Maps Foundation',
  owner_submission: 'Submitted to YepItsHalal',
};

function displayTitle(r: { name: string; brandName: string | null; branchLabel: string | null }) {
  const base = cleanRestaurantName(r.brandName ?? r.name);
  return r.branchLabel ? `${base}, ${r.branchLabel}` : base;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) return { title: 'Restaurant not found', robots: { index: false } };

  const title = displayTitle(restaurant);
  const where = restaurant.borough ?? restaurant.postcode ?? 'London';
  const listed = restaurant.isListed;
  // Only a listed place makes a halal statement, and that statement is the
  // label plus the reason for it, never the label alone.
  const description = listed
    ? `${title} in ${where}. Halal status: ${halalLabel(restaurant.halal_classification)}. ${restaurant.halal_summary ?? ''}.`.replace(/\.\./g, '.')
    : `${title} in ${where}. We don't currently have evidence about whether this place serves halal food.`;

  return {
    title: listed ? `${title} (${halalLabel(restaurant.halal_classification)})` : title,
    description,
    alternates: { canonical: `/restaurant/${restaurant.slug}` },
    // A place we don't list, or that has closed, is not something to send
    // searchers to.
    robots: listed ? undefined : { index: false, follow: true },
  };
}

export default async function RestaurantPage({ params }: { params: { slug: string } }) {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) notFound();

  const [reels, partner] = await Promise.all([
    getPublishedReels(restaurant.id),
    isActivePartner(restaurant.id),
  ]);

  const title = displayTitle(restaurant);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;
  const cuisine = restaurant.cuisines.join(' · ') || restaurant.cuisineLabel || null;
  const closed = restaurant.catalogueStatus === 'permanently_closed' || restaurant.catalogueStatus === 'temporarily_closed';
  const realPhotos = restaurant.photos.filter((p) => !isStockPhoto(p.storage_path));
  const hasGenuineCheck = restaurant.evidence.some((e) => e.kind === 'yepitshalal_check');
  const phones = splitPhones(restaurant.phone);

  // Facts about the place only. Schema.org has no halal property, and a
  // structured claim a search engine would repeat without our caveats is the
  // last place to overstate one.
  const hoursSpec = DAY_NAMES.flatMap((day, i) =>
    restaurant.openingHours
      .filter((h) => h.day_of_week === i && !h.is_closed && h.open_time && h.close_time)
      .map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${day}`,
        opens: h.open_time!.slice(0, 5),
        closes: h.close_time!.slice(0, 5),
      }))
  );
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: title,
    url: `https://yepitshalal.com/restaurant/${restaurant.slug}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address,
      ...(restaurant.postcode ? { postalCode: restaurant.postcode } : {}),
      addressLocality: 'London',
      addressCountry: 'GB',
    },
    geo: { '@type': 'GeoCoordinates', latitude: restaurant.lat, longitude: restaurant.lng },
    ...(restaurant.cuisines.length ? { servesCuisine: restaurant.cuisines } : {}),
    ...(phones.length ? { telephone: phones[0] } : {}),
    ...(restaurant.website_url || restaurant.socials.length
      ? { sameAs: [restaurant.website_url, ...restaurant.socials].filter(Boolean) }
      : {}),
    ...(restaurant.menu_url ? { hasMenu: restaurant.menu_url } : {}),
    ...(realPhotos.length ? { image: realPhotos.map((p) => p.storage_path) } : {}),
    ...(hoursSpec.length ? { openingHoursSpecification: hoursSpec } : {}),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-8">
      {restaurant.isListed && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      )}

      {closed && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-halal-partialSoft px-4 py-3 text-sm font-medium text-halal-partialInk ring-1 ring-halal-partial/20">
          <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {restaurant.catalogueStatus === 'permanently_closed'
            ? 'This restaurant appears to have closed permanently.'
            : 'This restaurant appears to be temporarily closed.'}
        </p>
      )}

      <header>
        <h1 className="text-balance font-display text-[1.7rem] font-semibold leading-tight text-ink sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted">
          <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <span>
            {cuisine && (
              <>
                {cuisine}
                <span className="mx-1.5 text-subtle" aria-hidden="true">·</span>
              </>
            )}
            {restaurant.address}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {restaurant.isListed && (
            <HalalBadge classification={restaurant.halal_classification} size="lg" variant="solid" />
          )}
          {!closed && <OpenStatusBadge hours={restaurant.openingHours} />}
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-ink hover:shadow-md active:scale-[0.98] sm:flex-none"
        >
          <NavigationIcon className="h-4 w-4" />
          Directions
        </a>
        {phones.length > 0 && (
          <a
            href={`tel:${phones[0]}`}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-ink/30 active:scale-[0.98] sm:flex-none"
          >
            <PhoneIcon className="h-4 w-4" />
            Call
          </a>
        )}
        {(restaurant.menu_url || restaurant.website_url) && (
          <a
            href={restaurant.menu_url ?? restaurant.website_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-ink/30 active:scale-[0.98] sm:flex-none"
          >
            {restaurant.menu_url ? 'Menu' : 'Website'}
            <ArrowUpRightIcon className="h-4 w-4 text-subtle" />
          </a>
        )}
      </div>

      {/* Halal status comes before everything else below the name, because it
          is the question the page exists to answer. */}
      <div className="mt-5">
        <HalalEvidencePanel
          classification={restaurant.halal_classification}
          strength={restaurant.halal_evidence_strength}
          summary={restaurant.halal_summary}
          evidence={restaurant.evidence}
          isListed={restaurant.isListed}
          slug={restaurant.slug}
        />
      </div>

      {restaurant.description && (
        <p className="mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-ink/80">{restaurant.description}</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-[1.4fr_1fr] sm:gap-6">
        <div className="space-y-5 sm:space-y-6">
          {realPhotos.length > 0 && <PhotoGallery photos={realPhotos} restaurantName={title} />}

          {/* Detailed facts only exist when we checked the place ourselves. */}
          {hasGenuineCheck && restaurant.halalFacts && <HalalFactsPanel facts={restaurant.halalFacts} />}

          <ReelShowcase
            reels={reels}
            restaurantName={restaurant.name}
            classification={restaurant.halal_classification}
            isPartner={partner}
          />
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-ink">Opening hours</h2>
              {!closed && <OpenStatusBadge hours={restaurant.openingHours} showDetail={false} />}
            </div>
            <div className="mt-3">
              <OpeningHoursList hours={restaurant.openingHours} />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold text-ink">Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-subtle">Address</dt>
                <dd className="mt-0.5 text-ink/80">{restaurant.address}</dd>
              </div>
              {restaurant.borough && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-subtle">Borough</dt>
                  <dd className="mt-0.5 text-ink/80">{restaurant.borough}</dd>
                </div>
              )}
              {phones.length > 0 && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-subtle">Phone</dt>
                  <dd className="mt-0.5 flex flex-col gap-1">
                    {phones.map((p) => (
                      <a key={p} href={`tel:${p}`} className="inline-flex items-center gap-1.5 font-medium text-accent-ink hover:underline">
                        <PhoneIcon className="h-4 w-4" />
                        {formatUkPhone(p)}
                      </a>
                    ))}
                  </dd>
                </div>
              )}
              {restaurant.website_url && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-subtle">Website</dt>
                  <dd className="mt-0.5">
                    <a
                      href={restaurant.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-accent-ink hover:underline"
                    >
                      <GlobeIcon className="h-4 w-4" />
                      {new URL(restaurant.website_url).hostname.replace(/^www\./, '')}
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              )}
              {restaurant.socials.length > 0 && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-subtle">Social</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    {restaurant.socials.slice(0, 3).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-accent-ink hover:underline">
                        {/instagram/.test(url) ? 'Instagram' : /facebook/.test(url) ? 'Facebook' : /tiktok/.test(url) ? 'TikTok' : /twitter|x\.com/.test(url) ? 'X' : 'Link'}
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <OffersList offers={restaurant.offers} />

          <OwnershipCta restaurantId={restaurant.id} slug={restaurant.slug} />

          {restaurant.isListed && !hasGenuineCheck && (
            <Link
              href={`/restaurant/${restaurant.slug}/verify`}
              className="flex items-start gap-3 rounded-2xl border border-dashed border-black/15 p-5 text-sm text-muted transition hover:border-ink/30 hover:bg-white"
            >
              <SealCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" />
              <span>
                Run this restaurant?{' '}
                <span className="font-semibold text-accent-ink">Ask us to check your halal information</span>
              </span>
            </Link>
          )}

          {restaurant.sources.length > 0 && (
            <p className="px-1 text-xs leading-relaxed text-subtle">
              Listing details from{' '}
              {[...new Set(restaurant.sources.map((s) => SOURCE_CREDIT[s.source] ?? s.source))].join('; ')}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
