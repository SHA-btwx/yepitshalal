import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRestaurantBySlug } from '@/lib/restaurants';
import { VerificationRequestForm } from '@/components/VerificationRequestForm';

export const metadata: Metadata = { title: 'Ask us to check a place', robots: { index: false, follow: false } };

export default async function VerifyRequestPage({ params }: { params: { slug: string } }) {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-2xl font-semibold text-ink">Ask us to check this place</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Someone from our team checks with the restaurant, by phone, a visit, its documents or a
        certifier&apos;s register, then publishes what they found and how. A check can confirm,
        change or remove a label.{' '}
        <Link href="/how-we-check" className="font-medium text-accent-ink hover:underline">
          How we label places
        </Link>
      </p>
      <div className="mt-6">
        <VerificationRequestForm restaurantId={restaurant.id} restaurantName={restaurant.name} />
      </div>
    </div>
  );
}
