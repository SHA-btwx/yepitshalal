import { createAdminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminSubscriptionsPage() {
  const supabase = createAdminSupabase();
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, status, plan, current_period_end, users(email)')
    .order('current_period_end', { ascending: false });

  const active = (subscriptions ?? []).filter((s) => s.status === 'active');

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Yep+ subscriptions</h1>
      <p className="text-sm text-ink/55">{active.length} active member{active.length === 1 ? '' : 's'}.</p>

      <div className="mt-5 divide-y divide-black/5 rounded-2xl border border-black/10 bg-white">
        {(subscriptions ?? []).map((s: any) => (
          <div key={s.id} className="flex items-center justify-between p-4 text-sm">
            <span className="text-ink">{s.users?.email ?? 'Unknown'}</span>
            <span className="text-ink/50">
              {s.plan ?? '—'} · {s.status}
              {s.current_period_end && ` · until ${new Date(s.current_period_end).toLocaleDateString('en-GB')}`}
            </span>
          </div>
        ))}
        {(subscriptions ?? []).length === 0 && <p className="p-4 text-sm text-ink/40">No subscriptions yet.</p>}
      </div>
    </div>
  );
}
