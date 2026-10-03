import { requireAdmin } from '@/lib/require-admin';
import Link from 'next/link';
import { AdminPage } from '@/components/admin/ui';
import {
  ActionCard,
  BarList,
  Card,
  CardLink,
  EmptyNote,
  Meter,
  SetupCard,
  StatTile,
} from '@/components/admin/dashboard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { StackedColumns } from '@/components/admin/charts/StackedColumns';
import { SERIES } from '@/components/admin/charts/theme';
import { MessageRow } from '@/components/admin/inbox/parts';
import { InboxIcon, PlusIcon, SealCheckIcon, UserIcon } from '@/components/icons';
import { INBOX_LABEL, loadInbox } from '@/lib/admin/inbox';
import { catalogue, messagesByDay, waitingCounts } from '@/lib/admin/stats';
import { posthogConfigured, topPages, totals, trafficByDay } from '@/lib/admin/posthog';

export const dynamic = 'force-dynamic';
// The layout's "%s | Admin" template only reaches pages below it, not this one.
export const metadata = { title: { absolute: 'Overview | Admin' } };

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(now));
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const LABEL_COLOURS = {
  fullyHalal: '#1F7A45',
  halalOptions: '#A8720F',
  unverified: '#6D766F',
  worthAsking: '#C3D0D2',
};

export default async function AdminOverview() {
  // The layout checks too, but a layout is not always re-run when moving
  // between admin pages, and this page reads people's messages.
  await requireAdmin();
  const now = new Date();
  const [waiting, inbox, messages, cat, traffic, week, pages] = await Promise.all([
    waitingCounts(),
    loadInbox(),
    messagesByDay(30),
    catalogue(),
    trafficByDay(30),
    totals(7),
    topPages(7, 6),
  ]);

  // The messages tile compares the last 7 days with the 7 before, from the
  // same 30 days the chart draws.
  const dayTotals = messages.counts.map((c) => c.hello + c.info + c.help);
  const msgWeek = dayTotals.slice(-7).reduce((a, b) => a + b, 0);
  const msgPrevWeek = dayTotals.slice(-14, -7).reduce((a, b) => a + b, 0);

  const labels = cat.labels;
  const listed = labels.fullyHalal + labels.halalOptions + labels.unverified + labels.worthAsking;
  const segments = [
    { key: 'fullyHalal', name: 'Fully Halal', value: labels.fullyHalal },
    { key: 'halalOptions', name: 'Halal Options', value: labels.halalOptions },
    { key: 'unverified', name: 'Unverified', value: labels.unverified },
    { key: 'worthAsking', name: 'Worth asking', value: labels.worthAsking },
  ] as const;

  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' });

  return (
    <AdminPage
      title={greeting(now)}
      width="xl"
      description={`${date}. What is waiting for you, then how the site is doing.`}
    >
      <section aria-labelledby="waiting">
        <h2 id="waiting" className="sr-only">
          Waiting for you
        </h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <ActionCard href="/admin/inbox" count={waiting.messages} label="messages to answer" clear="No messages to answer" Icon={InboxIcon} />
          <ActionCard href="/admin/submissions" count={waiting.submissions} label="restaurants to review" clear="No restaurants to review" Icon={PlusIcon} />
          <ActionCard href="/admin/queue" count={waiting.checks} label="checks in the queue" clear="No checks waiting" Icon={SealCheckIcon} />
          <ActionCard href="/admin/claims" count={waiting.claims} label="ownership claims" clear="No ownership claims" Icon={UserIcon} />
        </div>
      </section>

      <h2 className="mb-3 mt-10 font-display text-lg font-semibold text-ink">The last 7 days</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Visitors"
          value={week?.visitors ?? null}
          previous={week?.previous.visitors}
          versus="on the week before"
          trend={traffic?.slice(-14).map((d) => d.visitors)}
          hint="Connect PostHog to see this"
        />
        <StatTile
          label="Pages viewed"
          value={week?.pageviews ?? null}
          previous={week?.previous.pageviews}
          versus="on the week before"
          trend={traffic?.slice(-14).map((d) => d.pageviews)}
          hint="Connect PostHog to see this"
        />
        <StatTile
          label="Searches"
          value={week?.searches ?? null}
          previous={week?.previous.searches}
          versus="on the week before"
          hint="Connect PostHog to see this"
        />
        <StatTile
          label="Messages in"
          value={msgWeek}
          previous={msgPrevWeek}
          versus="on the week before"
          trend={dayTotals.slice(-14)}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Card
          title="Visitors"
          note="Each day, the last 30 days"
          className="xl:col-span-3"
          action={<CardLink href="/admin/analytics">Analytics</CardLink>}
        >
          {traffic ? (
            <LineChart
              days={traffic.map((d) => d.day)}
              series={[
                { name: 'Visitors', color: SERIES.one, values: traffic.map((d) => d.visitors) },
                { name: 'Pages viewed', color: SERIES.two, values: traffic.map((d) => d.pageviews) },
              ]}
              label="Visitors and pages viewed each day, last 30 days"
            />
          ) : (
            <SetupCard
              title={posthogConfigured ? 'PostHog did not answer' : 'See your visitors here'}
              body={
                posthogConfigured
                  ? 'The key is set, but the last request failed. It tries again in a few minutes.'
                  : 'PostHog already counts visits. This page needs one read-only key to show them.'
              }
              footer={!posthogConfigured && <Link href="/admin/analytics#connect" className="font-semibold text-accent-ink hover:underline">How to connect it</Link>}
            />
          )}
        </Card>

        <Card
          title="Messages"
          note="Each day, by the address they came to"
          className="xl:col-span-2"
          action={<CardLink href="/admin/inbox">Inbox</CardLink>}
        >
          {messages.total > 0 ? (
            <StackedColumns
              days={messages.days}
              series={[
                { name: `${INBOX_LABEL.hello} (hello@)`, color: SERIES.one },
                { name: `${INBOX_LABEL.info} (info@)`, color: SERIES.two },
                { name: `${INBOX_LABEL.help} (help@)`, color: SERIES.three },
              ]}
              values={messages.counts.map((c) => [c.hello, c.info, c.help])}
              label="Messages each day for the last 30 days, by inbox"
            />
          ) : (
            <EmptyNote>Nothing has come in through the forms in the last 30 days.</EmptyNote>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Card
          title="Latest messages"
          className="xl:col-span-3"
          action={<CardLink href="/admin/inbox?view=all">See all</CardLink>}
        >
          {inbox.items.length === 0 ? (
            <EmptyNote>Nothing yet. Feedback, restaurants and requests will show here as they arrive.</EmptyNote>
          ) : (
            <ul className="-mx-5 -mb-5 divide-y divide-line border-t border-line">
              {inbox.items.slice(0, 6).map((item) => (
                <MessageRow key={item.key} item={item} href={`/admin/inbox?view=all&open=${encodeURIComponent(item.key)}`} />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Most viewed pages"
          note="The last 7 days"
          className="xl:col-span-2"
          action={pages && <CardLink href="/admin/analytics">More</CardLink>}
        >
          {pages ? (
            <BarList
              rows={pages.map((p) => ({ key: p.label, label: p.label, value: p.value }))}
              empty="No page views in the last 7 days."
              valueLabel="Views"
            />
          ) : (
            <EmptyNote>Shows once PostHog is connected.</EmptyNote>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="The catalogue" note="Listed restaurants, by the label a visitor sees">
          <p className="text-[28px] font-semibold leading-none text-ink">
            {listed.toLocaleString('en-GB')} <span className="text-base font-normal text-muted">places</span>
          </p>
          <div className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Listings by label">
            {segments.map((s) =>
              s.value > 0 ? (
                <div key={s.key} style={{ flexGrow: s.value, background: LABEL_COLOURS[s.key] }} className="h-full first:rounded-l-full last:rounded-r-full" />
              ) : null
            )}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {segments.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: LABEL_COLOURS[s.key] }} />
                <span className="min-w-0 flex-1 truncate text-ink/85">{s.name}</span>
                <span className="font-semibold tabular-nums text-ink">{s.value.toLocaleString('en-GB')}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
            <span className="font-semibold text-ink">{cat.checkedByUs.toLocaleString('en-GB')}</span> checked by us in
            person or on the phone.{' '}
            <Link href="/admin/verify" className="font-semibold text-accent-ink hover:underline">
              What to check next
            </Link>
          </p>
        </Card>

        <Card title="People and restaurants" note="Everyone who has signed up for something">
          <div className="space-y-5">
            <Meter value={cat.founders.claimed} max={cat.founders.cap} label="Founders Club spots taken" />
            <ul className="grid grid-cols-3 gap-3">
              {(
                [
                  ['Supporters', cat.supporters, '/admin/subscriptions'],
                  ['Waiting for their area', cat.whereNext, '/admin/demand'],
                  ['Language requests', cat.languageRequests, '/admin/demand'],
                ] as const
              ).map(([label, value, href]) => (
                <li key={label}>
                  <Link href={href} className="block h-full rounded-xl bg-sand-soft p-3 transition hover:bg-sand">
                    <span className="block text-xl font-semibold text-ink">{value.toLocaleString('en-GB')}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
