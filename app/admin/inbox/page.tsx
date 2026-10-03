import { requireAdmin } from '@/lib/require-admin';
import Link from 'next/link';
import clsx from 'clsx';
import { AdminPage } from '@/components/admin/ui';
import { EmptyNote, SetupCard } from '@/components/admin/dashboard';
import { MessageDetail, MessageRow } from '@/components/admin/inbox/parts';
import { loadInbox, statusOf, SOURCES, SOURCE_KEYS, type InboxItem, type InboxStatus, type Source } from '@/lib/admin/inbox';
import { emailConfigured } from '@/lib/notify';
import { SearchIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inbox' };

// One list for every form on the site. The address bar holds the whole state
// (which tab, which kind, the search, the open message), so a view can be
// bookmarked, the back button works, and the page needs no JavaScript to use.

const VIEWS: { id: 'to_answer' | 'all' | 'answered' | 'archived'; label: string }[] = [
  { id: 'to_answer', label: 'To answer' },
  { id: 'all', label: 'All' },
  { id: 'answered', label: 'Answered' },
  { id: 'archived', label: 'Archived' },
];
type View = (typeof VIEWS)[number]['id'];

function inView(item: InboxItem, view: View): boolean {
  const status: InboxStatus = statusOf(item);
  if (view === 'all') return status !== 'archived';
  return status === view;
}

function matches(item: InboxItem, q: string): boolean {
  if (!q) return true;
  const hay = [item.title, item.message, item.name, item.email, item.instagram, ...item.fields.map(([, v]) => v)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((word) => hay.includes(word));
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { view?: string; type?: string; q?: string; open?: string };
}) {
  // The layout checks too, but a layout is not always re-run when moving
  // between admin pages, and this page shows people's messages and addresses.
  await requireAdmin();
  const view: View = VIEWS.some((v) => v.id === searchParams.view) ? (searchParams.view as View) : 'to_answer';
  const type: Source | 'all' = SOURCE_KEYS.includes(searchParams.type as Source) ? (searchParams.type as Source) : 'all';
  const q = (searchParams.q ?? '').trim().slice(0, 100);

  const { items, stateReady } = await loadInbox();
  const emailReady = emailConfigured();

  const ofType = items.filter((i) => type === 'all' || i.source === type);
  const shown = ofType.filter((i) => inView(i, view) && matches(i, q));
  const open = searchParams.open ? items.find((i) => i.key === searchParams.open) ?? null : null;

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const next = { view, type, q, open: open?.key ?? null, ...patch };
    if (next.view && next.view !== 'to_answer') p.set('view', next.view);
    if (next.type && next.type !== 'all') p.set('type', next.type);
    if (next.q) p.set('q', next.q);
    if (next.open) p.set('open', next.open);
    const s = p.toString();
    return `/admin/inbox${s ? `?${s}` : ''}`;
  };

  const countFor = (v: View) => ofType.filter((i) => inView(i, v)).length;
  const typeCount = (s: Source) => items.filter((i) => i.source === s && inView(i, view)).length;

  return (
    <AdminPage
      title="Inbox"
      width="xl"
      description="Everything people send through the site, in one place. Replies go out from the same yepitshalal.com address the message came to, and their answers come back there."
    >
      {!stateReady && (
        <div className="mb-4">
          <SetupCard
            title="One database update is waiting"
            body="Messages show below, but opening, archiving and replying need two small new tables (migration 0051). Until then, replying is switched off, so no email goes out without a record."
          />
        </div>
      )}
      {stateReady && !emailReady && (
        <div className="mb-4">
          <SetupCard
            title="Replies by email are off"
            body="Everything else here works. To send replies, add a Resend key in Vercel."
            steps={[
              <>Open resend.com, then API Keys, then Create API Key. Choose “Sending access”.</>,
              <>In Vercel, open the yepitshalal project, then Settings, then Environment Variables.</>,
              <>Add RESEND_API_KEY with the key, for Production. Then redeploy.</>,
            ]}
          />
        </div>
      )}

      {/* Filters: one row above everything they scope. */}
      <div className="flex flex-col gap-3">
        <nav aria-label="Which messages" className="flex flex-wrap gap-1.5">
          {VIEWS.map((v) => {
            const active = v.id === view;
            const n = countFor(v.id);
            return (
              <Link
                key={v.id}
                href={href({ view: v.id, open: null })}
                scroll={false}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                  active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/75 hover:text-ink'
                )}
              >
                {v.label}
                <span
                  className={clsx(
                    'rounded-full px-1.5 text-[11px] leading-5 tabular-nums',
                    active ? 'bg-white/15 text-white' : 'bg-black/[0.05] text-ink/70'
                  )}
                >
                  {n}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <nav aria-label="Kind of message" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {(['all', ...SOURCE_KEYS] as const).map((s) => {
              const active = s === type;
              return (
                <Link
                  key={s}
                  href={href({ type: s, open: null })}
                  scroll={false}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                    active ? 'bg-spice text-white' : 'bg-white text-ink/70 ring-1 ring-line hover:text-ink'
                  )}
                >
                  {s === 'all' ? 'Every kind' : SOURCES[s].label}
                  {s !== 'all' && typeCount(s) > 0 && <span className="tabular-nums opacity-80">{typeCount(s)}</span>}
                </Link>
              );
            })}
          </nav>
          <form action="/admin/inbox" className="relative sm:ml-auto sm:w-64">
            {view !== 'to_answer' && <input type="hidden" name="view" value={view} />}
            {type !== 'all' && <input type="hidden" name="type" value={type} />}
            <label htmlFor="inbox-search" className="sr-only">
              Search messages
            </label>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              id="inbox-search"
              name="q"
              defaultValue={q}
              placeholder="Search names, emails, words"
              className="min-h-[40px] w-full rounded-full border border-black/15 bg-white pl-9 pr-3 text-[16px] text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm"
            />
          </form>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
        <section
          aria-label="Messages"
          className={clsx('min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-sm', open && 'hidden lg:block')}
        >
          {shown.length === 0 ? (
            <div className="p-4">
              <EmptyNote>
                {items.length === 0
                  ? 'Nothing has come in through the forms yet. When it does, it lands here, and in your email too.'
                  : q
                    ? `Nothing matches “${q}”.`
                    : view === 'to_answer'
                      ? 'Nothing is waiting for an answer. Well done.'
                      : 'Nothing here.'}
              </EmptyNote>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((item) => (
                <MessageRow key={item.key} item={item} href={href({ open: item.key })} selected={item.key === open?.key} />
              ))}
            </ul>
          )}
        </section>

        <div className={clsx('min-w-0 lg:sticky lg:top-20', !open && 'hidden lg:block')}>
          {open ? (
            <MessageDetail item={open} backHref={href({ open: null })} emailReady={emailReady} stateReady={stateReady} />
          ) : (
            <div className="rounded-2xl border border-dashed border-sand-line bg-white/60 px-6 py-16 text-center">
              <p className="font-display text-lg font-semibold text-ink">Pick a message</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
                Its details, any answers already sent, and the reply box open here.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
