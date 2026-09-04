import { createServerSupabase } from '@/lib/supabase/server';
import { SubmitRestaurantForm } from '@/components/SubmitRestaurantForm';

export default async function SubmitRestaurantPage() {
  const supabase = createServerSupabase();
  const { data: cuisines } = await supabase.from('cuisines').select('id, name').order('name');

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Add your restaurant</h1>
      <p className="mt-2 text-sm text-ink/60">
        Every new listing starts as <strong className="text-ink/80">⚪ Unverified</strong> — that&apos;s
        not a judgement, just our starting point. You can request verification once it&apos;s live.
      </p>
      <div className="mt-8">
        <SubmitRestaurantForm cuisines={cuisines ?? []} />
      </div>
    </div>
  );
}
