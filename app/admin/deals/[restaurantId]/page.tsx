import Link from 'next/link';
import { randomUUID } from 'crypto';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/require-admin';
import { dealsDb } from '@/lib/deals/db';
import { statusFor } from '@/lib/halalPages';
import { adminDealStatus, creditBackFee } from '@/lib/deals/admin-actions';
import { ledgerKind, signed, stateTag, when } from '@/lib/deals/admin-labels';
import type { LedgerRow } from '@/lib/deals/admin-data';
import { DISPUTE_DAYS, money, moneyExact, type DealState } from '@/lib/deals/rules';
import { dealRules } from '@/lib/deals/terms';
import { ownerEmailFor } from '@/lib/deals/data';
import { AdminPage, BUTTON_SECONDARY, List, Panel, Row, Tag } from '@/components/admin/ui';
import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton';
import { AdjustCreditForm } from '@/components/admin/deals/AdjustCreditForm';
import { HalalBadge } from '@/components/HalalBadge';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Deal', robots: { index: false } };

// One restaurant's deal: its state, every money move, the last 50 codes, and
// the three things only an admin can do (start a deal again after reports,
// change credit with a note, give back a fee within 7 days).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ClaimRow {
  id: string;
  code: string;
  source: 'site' | 'qr';
  status: 'claimed' | 'redeemed' | 'expired' | 'void';
  created_at: string;
  redeemed_at: string | null;
  fee_pence: number | null;
  fee_kind: 'new' | 'repeat' | null;
  pin_failures: number;
  reported_at: string | null;
  report_note: string | null;
}

const CLAIM_TAG = {
  claimed: { label: 'Waiting', tone: 'accent' },
  redeemed: { label: 'Used', tone: 'good' },
  expired: { label: 'Ran out', tone: 'neutral' },
  void: { label: 'Stopped', tone: 'warn' },
} as const;

const quietButton =
  'inline-flex min-h-[40px] items-center rounded-full px-3 text-sm font-semibold text-halal-partialInk hover:bg-halal-partialSoft';

export default async function DealAdminPage({ params }: { params: { restaurantId: string } }) {
  await requireAdmin();
  if (!UUID.test(params.restaurantId)) notFound();
  const db = dealsDb();
  const id = params.restaurantId;

  const [{ data: r }, { data: stateData, error: stateError }, { data: ledger }, { data: claims }, { data: pin }, { data: owner }] =
    await Promise.all([
      db
        .from('restaurants')
        .select('id, name, slug, branch_label, owner_id, halal_classification, is_listed, is_searchable')
        .eq('id', id)
        .maybeSingle(),
      db.rpc('deal_state', { p_restaurant_id: id }),
      db.from('deal_ledger').select('*').eq('restaurant_id', id).order('id', { ascending: false }).limit(500),
      db
        .from('deal_claims')
        .select('id, code, source, status, created_at, redeemed_at, fee_pence, fee_kind, pin_failures, reported_at, report_note')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('restaurant_staff_pin').select('rotated_at, failed_attempts, locked_until').eq('restaurant_id', id).maybeSingle(),
      ownerEmailFor(id).then((data) => ({ data })),
    ]);
  if (!r || stateError) notFound();

  const state = stateData as DealState;
  const rows = (ledger ?? []) as LedgerRow[];
  const recent = (claims ?? []) as ClaimRow[];
  const name = r.branch_label ? `${r.name}, ${r.branch_label}` : r.name;
  const label = statusFor({ isListed: !!r.is_listed, isSearchable: !!r.is_searchable, halal_classification: r.halal_classification });
  const tag = stateTag(state);
  const deal = state.deal;
  const givenBack = new Set(rows.filter((l) => l.kind === 'adjustment' && l.claim_id).map((l) => l.claim_id));
  const disputeCutoff = Date.now() - DISPUTE_DAYS * 86_400_000;
  const locked = pin?.locked_until && new Date(pin.locked_until).getTime() > Date.now();

  const statusForm = (action: 'pause' | 'resume' | 'end') => (
    <form action={adminDealStatus}>
      <input type="hidden" name="restaurant_id" value={id} />
      <input type="hidden" name="action" value={action} />
      {action === 'end' ? (
        <ConfirmSubmitButton message={`End the deal at ${name}? Codes people already have keep working for 48 hours.`} className={quietButton}>
          End deal
        </ConfirmSubmitButton>
      ) : (
        <button type="submit" className={BUTTON_SECONDARY}>
          {action === 'pause' ? 'Pause deal' : 'Start it again'}
        </button>
      )}
    </form>
  );

  return (
    <AdminPage
      title={name}
      width="lg"
      description={
        <>
          <Link href="/admin/deals" className="font-semibold text-accent-ink hover:underline">
            All deals
          </Link>
          {' · '}
          <Link href={`/restaurant/${r.slug}`} className="font-semibold text-accent-ink hover:underline">
            Restaurant page
          </Link>
          {' · '}
          <Link href={`/manage/${r.slug}/deals`} className="font-semibold text-accent-ink hover:underline">
            Owner view
          </Link>
        </>
      }
    >
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={tag.tone}>{tag.label}</Tag>
              {label && <HalalBadge classification={label} size="sm" />}
            </div>
            {deal ? (
              <>
                <p className="mt-2 font-display text-lg font-semibold text-ink">{deal.title}</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted">
                  {dealRules(deal).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                  <li>
                    Terms {deal.terms_version}, agreed {when(deal.accepted_at)}
                  </li>
                  {deal.paused_at && <li>Paused {when(deal.paused_at)}</li>}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">This restaurant has never started a deal.</p>
            )}
            {owner ? (
              <p className="mt-2 text-xs text-muted">
                Owner:{' '}
                <a href={`mailto:${owner.email}`} className="font-semibold text-accent-ink hover:underline">
                  {owner.email}
                </a>
              </p>
            ) : (
              <p className="mt-2 text-xs font-medium text-halal-partialInk">No owner on this listing any more.</p>
            )}
          </div>
          {deal && deal.status !== 'ended' && (
            <div className="flex flex-wrap items-center gap-2">
              {deal.status === 'live' ? statusForm('pause') : statusForm('resume')}
              {statusForm('end')}
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-4 sm:divide-x sm:divide-line">
          <Stat label="Credit" value={moneyExact(state.balance_pence)} />
          <Stat label="Held by open codes" value={moneyExact(state.held_pence)} />
          <Stat label="Fees this month" value={`${moneyExact(state.month_fees_pence)}`} hint={`Cap ${money(state.cap_pence)}`} />
          <Stat
            label="Staff PIN"
            value={!state.has_pin ? 'Not set' : locked ? 'Locked' : 'Set'}
            hint={
              pin
                ? locked
                  ? `Until ${when(pin.locked_until!)}`
                  : `Changed ${when(pin.rotated_at)}, ${pin.failed_attempts} wrong tries`
                : undefined
            }
          />
        </dl>
      </Panel>

      <Panel title="Change credit" className="mt-6">
        <div className="px-5 py-4">
          <p className="mb-3 text-sm text-muted">
            A plus amount adds credit, a minus amount takes it away. The note shows in the owner&rsquo;s activity. To give
            back one fee, use the button on that code below instead.
          </p>
          <AdjustCreditForm restaurantId={id} token={randomUUID()} />
        </div>
      </Panel>

      <Panel title="Last 50 codes" className="mt-6">
        <List empty="No codes yet.">
          {recent.map((c) => {
            const t = CLAIM_TAG[c.status];
            const canGiveBack =
              c.status === 'redeemed' &&
              (c.fee_pence ?? 0) > 0 &&
              !givenBack.has(c.id) &&
              c.redeemed_at !== null &&
              new Date(c.redeemed_at).getTime() > disputeCutoff;
            return (
              <Row key={c.id} className="flex-wrap items-start">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-ink">{c.code}</span>
                    <Tag tone={t.tone}>{t.label}</Tag>
                    {c.source === 'qr' && <Tag>Poster</Tag>}
                    {c.reported_at && <Tag tone="warn">Reported</Tag>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Got {when(c.created_at)}
                    {c.redeemed_at && `, used ${when(c.redeemed_at)}`}
                    {c.fee_pence ? `, fee ${money(c.fee_pence)} (${c.fee_kind === 'new' ? 'new diner' : 'return or poster'})` : ''}
                    {givenBack.has(c.id) && ', fee given back'}
                    {c.pin_failures > 0 && `, ${c.pin_failures} wrong PIN${c.pin_failures === 1 ? '' : 's'}`}
                  </p>
                  {c.report_note && <p className="mt-1 text-sm text-ink/80">&ldquo;{c.report_note}&rdquo;</p>}
                </div>
                {canGiveBack && (
                  <form action={creditBackFee}>
                    <input type="hidden" name="claim_id" value={c.id} />
                    <input type="hidden" name="restaurant_id" value={id} />
                    <ConfirmSubmitButton
                      message={`Give back the ${money(c.fee_pence!)} fee for code ${c.code}?`}
                      className={BUTTON_SECONDARY}
                    >
                      Give fee back
                    </ConfirmSubmitButton>
                  </form>
                )}
              </Row>
            );
          })}
        </List>
      </Panel>

      <Panel title="Every money move" className="mt-6">
        <List empty="Nothing yet.">
          {rows.map((l) => (
            <Row key={l.id} className="items-start">
              <div className="min-w-0">
                <p className="text-sm text-ink">{ledgerKind(l)}</p>
                <p className="text-xs text-muted">
                  {when(l.created_at)}
                  {l.note ? `, ${l.note}` : ''}
                </p>
                <p className="truncate font-mono text-[11px] text-subtle">{l.reference}</p>
              </div>
              <span className={`shrink-0 text-sm font-semibold tabular-nums ${l.amount_pence > 0 ? 'text-halal-fullInk' : 'text-ink'}`}>
                {signed(l.amount_pence, moneyExact)}
              </span>
            </Row>
          ))}
        </List>
      </Panel>
    </AdminPage>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-subtle">{hint}</dd>}
    </div>
  );
}
