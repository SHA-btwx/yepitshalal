import Link from 'next/link';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { ArrowRightIcon } from '@/components/icons';
import { AdminPage, Panel, List, Row, Tag, QueueStatusTag } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

interface QueueRequest {
  id: string;
  queue_type: string;
  status: string;
  entered_queue_at: string;
  contact_email: string | null;
  restaurants: { name: string; slug: string } | null;
}

function daysWaiting(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export default async function AdminQueuePage() {
  const supabase = createAdminSupabase();
  const { data: requests } = await supabase
    .from('verification_requests')
    .select('id, queue_type, status, entered_queue_at, contact_email, restaurants(name, slug)')
    .in('status', ['awaiting_slot', 'queued', 'in_review', 'pending_qc'])
    .order('queue_type', { ascending: false })
    .order('entered_queue_at', { ascending: true });

  const all = (requests ?? []) as unknown as QueueRequest[];
  const priority = all.filter((r) => r.queue_type === 'priority');
  const free = all.filter((r) => r.queue_type === 'free');

  return (
    <AdminPage
      title="Verification queue"
      description={`${all.length} open request${all.length === 1 ? '' : 's'} — priority first, then oldest.`}
      width="lg"
    >
      <div className="space-y-5">
        <Section
          title="Priority"
          tone="ink"
          count={priority.length}
          requests={priority}
          empty="No priority requests waiting."
        />
        <Section
          title="Free"
          count={free.length}
          requests={free}
          empty="No free requests waiting."
        />
      </div>
    </AdminPage>
  );
}

function Section({
  title,
  count,
  requests,
  empty,
  tone = 'neutral',
}: {
  title: string;
  count: number;
  requests: QueueRequest[];
  empty: string;
  tone?: 'ink' | 'neutral';
}) {
  return (
    <Panel title={title} action={<Tag tone={tone}>{count}</Tag>}>
      <List empty={empty}>
        {requests.map((r) => (
          <Row key={r.id} padded={false}>
            <Link
              href={`/admin/queue/${r.id}`}
              className="group flex min-h-[64px] flex-1 items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-black/[0.02]"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">
                  {r.restaurants?.name ?? 'Unknown restaurant'}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  Waiting {daysWaiting(r.entered_queue_at)}
                  {r.contact_email ? ` · ${r.contact_email}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                <QueueStatusTag status={r.status} />
                <ArrowRightIcon className="h-4 w-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </span>
            </Link>
          </Row>
        ))}
      </List>
    </Panel>
  );
}
