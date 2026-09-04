import { createAdminSupabase } from '@/lib/supabase/admin';
import { AdminPage, Panel, List, Row, SubscriptionStatusTag } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Subscriptions' };

interface SubscriptionRow {
  id: string;
  status: string;
  plan: string | null;
  current_period_end: string | null;
  users: { email: string } | null;
}

export default async function AdminSubscriptionsPage() {
  const supabase = createAdminSupabase();
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, status, plan, current_period_end, users(email)')
    .order('current_period_end', { ascending: false });

  const rows = (subscriptions ?? []) as unknown as SubscriptionRow[];
  const active = rows.filter((s) => s.status === 'active');

  return (
    <AdminPage
      title="Yep+ subscriptions"
      description={`${active.length} active member${active.length === 1 ? '' : 's'} of ${rows.length} total.`}
    >
      <Panel>
        <List empty="No subscriptions yet.">
          {rows.map((s) => (
            <Row key={s.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {s.users?.email ?? 'Unknown user'}
                </p>
                <p className="truncate text-xs text-muted">
                  {s.plan === 'annual' ? 'Annual' : s.plan === 'monthly' ? 'Monthly' : '—'}
                  {s.current_period_end &&
                    ` · until ${new Date(s.current_period_end).toLocaleDateString('en-GB')}`}
                </p>
              </div>
              <SubscriptionStatusTag status={s.status} />
            </Row>
          ))}
        </List>
      </Panel>
    </AdminPage>
  );
}
