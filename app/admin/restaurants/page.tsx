import Link from 'next/link';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { HalalBadge } from '@/components/HalalBadge';
import { DeleteRestaurantButton } from '@/components/DeleteRestaurantButton';
import { PlusIcon, ArrowUpRightIcon } from '@/components/icons';
import { AdminPage, Panel, List, Row, BUTTON_SECONDARY } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Restaurants' };

export default async function AdminRestaurantsPage() {
  const supabase = createAdminSupabase();
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, halal_classification, address')
    .order('created_at', { ascending: false });

  const rows = restaurants ?? [];

  return (
    <AdminPage
      title="Restaurants"
      description={`${rows.length} in the database, newest first.`}
      width="lg"
      action={
        <Link href="/submit-restaurant" className={BUTTON_SECONDARY}>
          <PlusIcon className="h-4 w-4" />
          Add restaurant
        </Link>
      }
    >
      <Panel>
        <List empty="No restaurants yet.">
          {rows.map((r) => (
            <Row key={r.id} className="flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{r.name}</p>
                <p className="truncate text-xs text-muted">{r.address}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <HalalBadge classification={r.halal_classification} size="sm" />
                {/* Was three 12px text links in a row, well inside each other's
                    8px spacing — these are now real 36px targets. */}
                <Link
                  href={`/admin/restaurants/${r.id}`}
                  className="inline-flex min-h-[36px] items-center rounded-full border border-line px-3 text-xs font-semibold text-ink transition hover:border-ink/30"
                >
                  Edit
                </Link>
                <Link
                  href={`/restaurant/${r.slug}`}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-accent-ink transition hover:bg-accent-soft"
                >
                  View
                  <ArrowUpRightIcon className="h-3.5 w-3.5" />
                </Link>
                <DeleteRestaurantButton restaurantId={r.id} />
              </div>
            </Row>
          ))}
        </List>
      </Panel>
    </AdminPage>
  );
}
