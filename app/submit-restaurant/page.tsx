import type { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { SubmitRestaurantForm } from '@/components/SubmitRestaurantForm';

export const metadata: Metadata = {
  title: 'Add a restaurant',
  description:
    'Tell us about a halal restaurant in London. We check every submission before it appears.',
  alternates: { canonical: '/submit-restaurant' },
};

export default async function SubmitRestaurantPage() {
  const supabase = createServerSupabase();
  const { data: cuisines } = await supabase.from('cuisines').select('id, name').order('name');

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <h1 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
        Add a restaurant
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-muted">
        Know a halal place we&apos;re missing, or run one? Send it in. We check every submission
        before it goes live, and we&apos;ll show where its halal information came from.
      </p>
      <div className="mt-8">
        <SubmitRestaurantForm cuisines={cuisines ?? []} />
      </div>
    </div>
  );
}
