import { createAdminSupabase } from '@/lib/supabase/admin';
import { AdminPage, Panel, Tag } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Feedback' };

interface Row {
  id: string;
  email: string;
  message: string;
  page_url: string | null;
  status: string;
  created_at: string;
}

function when(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function AdminFeedbackPage() {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('site_feedback')
    .select('id, email, message, page_url, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Row[];
  const unread = rows.filter((r) => r.status === 'new').length;

  return (
    <AdminPage
      title="Feedback"
      width="lg"
      description={`What people say about the site itself, newest first. ${unread} not yet marked read.`}
    >
      <Panel title="Messages" action={<Tag>{rows.length}</Tag>}>
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            Nothing yet. The box sits at the bottom of every page.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <a href={`mailto:${r.email}`} className="font-semibold text-accent-ink hover:underline">
                    {r.email}
                  </a>
                  <span className="text-xs text-subtle">{when(r.created_at)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{r.message}</p>
                {r.page_url && (
                  <p className="mt-1.5 truncate text-xs text-subtle">
                    from{' '}
                    <a href={r.page_url} className="hover:underline" target="_blank" rel="noopener noreferrer">
                      {r.page_url.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}
