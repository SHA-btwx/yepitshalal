import type { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { SubmitRestaurantForm } from '@/components/SubmitRestaurantForm';
import { HalalBadge } from '@/components/HalalBadge';

export const metadata: Metadata = {
  title: 'Add your restaurant',
  description:
    'List your halal restaurant on YepItsHalal. Free, and you can request verification once it is live.',
};

export default async function SubmitRestaurantPage() {
  const supabase = createServerSupabase();
  const { data: cuisines } = await supabase.from('cuisines').select('id, name').order('name');

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <h1 className="text-balance font-display text-2xl font-semibold text-ink sm:text-3xl">
        Add your restaurant
      </h1>
      <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-relaxed text-muted">
        <span>Every new listing starts as</span>
        <HalalBadge classification="unverified" size="sm" variant="solid" />
        <span>— that&apos;s not a judgement, just our starting point.</span>
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        You can request verification once it&apos;s live.
      </p>
      <div className="mt-8">
        <SubmitRestaurantForm cuisines={cuisines ?? []} />
      </div>
    </div>
  );
}
