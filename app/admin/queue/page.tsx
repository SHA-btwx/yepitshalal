import Link from 'next/link';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminQueuePage() {
  const supabase = createAdminSupabase();
  const { data: requests } = await supabase
    .from('verification_requests')
    .select('id, queue_type, status, entered_queue_at, contact_email, restaurants(name, slug)')
    .in('status', ['awaiting_slot', 'queued', 'in_review', 'pending_qc'])
    .order('queue_type', { ascending: false })
    .order('entered_queue_at', { ascending: true });

  const priority = (requests ?? []).filter((r) => r.queue_type === 'priority');
  const free = (requests ?? []).filter((r) => r.queue_type === 'free');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Verification queue</h1>

      <Section title={`Priority (${priority.length})`} requests={priority} />
      <Section title={`Free (${free.length})`} requests={free} />
    </div>
  );
}

function Section({ title, requests }: { title: string; requests: any[] }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">{title}</h2>
      <div className="mt-2 divide-y divide-black/5 rounded-2xl border border-black/10 bg-white">
        {requests.length === 0 && <p className="p-4 text-sm text-ink/40">Nothing here right now.</p>}
        {requests.map((r) => (
          <Link
            key={r.id}
            href={`/admin/queue/${r.id}`}
            className="flex items-center justify-between p-4 text-sm hover:bg-black/[0.02]"
          >
            <div>
              <p className="font-medium text-ink">{r.restaurants?.name ?? 'Unknown restaurant'}</p>
              <p className="text-xs text-ink/45">
                {r.status} · entered {new Date(r.entered_queue_at).toLocaleDateString('en-GB')}
              </p>
            </div>
            <span className="text-accent-ink">Review →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
