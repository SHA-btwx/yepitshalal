import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { SubmitRestaurantForm, type ExistingPlace } from '@/components/SubmitRestaurantForm';
import { cleanRestaurantName } from '@/lib/restaurantName';
import { formatUkPhone, splitPhones } from '@/lib/phone';

export function generateMetadata({ searchParams }: { searchParams: { update?: string } }): Metadata {
  return {
    title: searchParams.update ? 'Suggest an edit' : 'Add a restaurant',
    description:
      'Tell us about a halal restaurant in London, or suggest an edit to one we list. We check every submission before it appears.',
    alternates: { canonical: '/submit-restaurant' },
    // One page per listing would be a thousand copies of the same form.
    robots: searchParams.update ? { index: false, follow: true } : undefined,
  };
}

function streetPart(address: string, postcode: string | null): string {
  // Our placeholder for a missing street address is not an address to prefill.
  if (/street address not known/i.test(address)) return '';
  if (!postcode) return address;
  const i = address.toUpperCase().lastIndexOf(postcode.toUpperCase());
  return (i > 0 ? address.slice(0, i) : address).replace(/[,\s]+$/, '');
}

export default async function SubmitRestaurantPage({ searchParams }: { searchParams: { update?: string } }) {
  const supabase = createServerSupabase();
  const [{ data: cuisines }, { data: place }] = await Promise.all([
    supabase.from('cuisines').select('id, name').order('name'),
    searchParams.update
      ? supabase
          .from('restaurants')
          .select('slug, name, address, postcode, phone, website_url, cuisine_label')
          .eq('slug', searchParams.update)
          .is('merged_into', null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const existing: ExistingPlace | null = place
    ? {
        slug: place.slug,
        name: cleanRestaurantName(place.name),
        address: streetPart(place.address, place.postcode),
        postcode: place.postcode ?? '',
        phone: splitPhones(place.phone).map(formatUkPhone).join(', '),
        website: place.website_url ?? '',
        cuisine: place.cuisine_label ?? '',
      }
    : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <h1 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
        {existing ? `Suggest an edit for ${existing.name}` : 'Add a restaurant'}
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-muted">
        {existing ? (
          <>
            Correct or add anything you know, including whether it serves halal food. We check every
            suggestion before it changes the{' '}
            <Link href={`/restaurant/${existing.slug}`} className="font-semibold text-accent-ink hover:underline">
              listing
            </Link>
            .
          </>
        ) : (
          <>
            Know a halal place we&apos;re missing, or run one? Send it in. We check every submission
            before it goes live, and we&apos;ll show where its halal information came from.
          </>
        )}
      </p>
      <div className="mt-8">
        <SubmitRestaurantForm cuisines={cuisines ?? []} existing={existing} />
      </div>
    </div>
  );
}
