import Link from 'next/link';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { HalalBadge } from '@/components/HalalBadge';
import { DeleteRestaurantButton } from '@/components/DeleteRestaurantButton';

export const dynamic = 'force-dynamic';

export default async function AdminRestaurantsPage() {
  const supabase = createAdminSupabase();
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, halal_classification, address')
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Restaurants</h1>
        <Link href="/submit-restaurant" className="text-sm font-semibold text-accent-ink">
          + Add restaurant
        </Link>
      </div>
      <div className="mt-5 divide-y divide-black/5 rounded-2xl border border-black/10 bg-white">
        {(restaurants ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{r.name}</p>
              <p className="truncate text-xs text-ink/45">{r.address}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <HalalBadge classification={r.halal_classification} size="sm" />
              <Link href={`/admin/restaurants/${r.id}`} className="text-xs font-medium text-accent-ink">
                Edit
              </Link>
              <Link href={`/restaurant/${r.slug}`} className="text-xs font-medium text-accent-ink">
                View
              </Link>
              <DeleteRestaurantButton restaurantId={r.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
