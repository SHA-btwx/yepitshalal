import { notFound } from 'next/navigation';
import { getRestaurantBySlug } from '@/lib/restaurants';
import { VerificationRequestForm } from '@/components/VerificationRequestForm';

export default async function VerifyRequestPage({ params }: { params: { slug: string } }) {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-2xl font-semibold text-ink">Request verification</h1>
      <div className="mt-6">
        <VerificationRequestForm restaurantId={restaurant.id} restaurantName={restaurant.name} />
      </div>
    </div>
  );
}
