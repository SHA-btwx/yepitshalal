import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';
import { dealsDb } from '@/lib/deals/db';
import { HalalBadge } from '@/components/HalalBadge';
import { ArrowUpRightIcon } from '@/components/icons';
import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton';
import { ctaPrimarySm, ctaSecondarySm } from '@/components/cta';
import { ManageTabs } from '@/components/manage/ManageTabs';
import { DealForm } from '@/components/manage/DealForm';
import { CapForm, PinForm } from '@/components/manage/SmallForms';
import { managedRestaurant } from '@/lib/deals/manage-access';
import { getDealState } from '@/lib/deals/data';
import { readyTopups } from '@/lib/deals/topups';
import { ownerDealStatus, startTopUp } from '@/lib/deals/owner-actions';
import { dealRules } from '@/lib/deals/terms';
import {
  FEE_NEW_PENCE,
  FEE_REPEAT_PENCE,
  TOPUP_PACKS,
  money,
  moneyExact,
  type DealState,
} from '@/lib/deals/rules';
import { BLOCK_CLASS } from '@/lib/analytics/scrub';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your deal', robots: { index: false } };

const card = 'rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6';
const h2 = 'font-display text-lg font-semibold text-ink';

const TOPUP_NOTES: Record<string, { text: string; good: boolean }> = {
  done: { text: 'Thank you. Your credit shows here as soon as the card payment is confirmed, usually within a minute.', good: true },
  cancelled: { text: 'No payment was taken.', good: false },
  unavailable: { text: 'Card top ups are not open yet. Your free credit still works.', good: false },
};

function stateLine(s: DealState): { title: string; body: string; tone: 'live' | 'paused' | 'off' } {
  const cap = money(s.cap_pence);
  switch (s.state) {
    case 'live':
      return { title: 'Live', body: 'Diners can get a code now.', tone: 'live' };
    case 'paused':
      if (s.deal?.paused_reason === 'reports') {
        return {
          title: 'Paused',
          body: 'Three diners told us they did not get the deal. We will get in touch. Codes people already have still work.',
          tone: 'paused',
        };
      }
      if (s.deal?.paused_reason === 'admin') {
        return { title: 'Paused by YepItsHalal', body: 'Email info@yepitshalal.com to talk to us.', tone: 'paused' };
      }
      return { title: 'Paused by you', body: 'New diners cannot get a code. Codes people already have still work.', tone: 'paused' };
    case 'no_credit':
      return { title: 'Paused: out of credit', body: 'Top up and your deal starts again by itself.', tone: 'paused' };
    case 'cap_reached':
      return {
        title: 'Paused: monthly cap reached',
        body: `You hit your ${cap} cap for this month. It starts again on the 1st, or you can raise the cap below.`,
        tone: 'paused',
      };
    case 'no_pin':
      return { title: 'Not running', body: 'Set a staff PIN below to start.', tone: 'off' };
    case 'not_listed':
      return { title: 'Not running', body: 'Your restaurant is not listed or is marked closed right now.', tone: 'off' };
    default:
      return { title: 'No deal yet', body: '', tone: 'off' };
  }
}

function ledgerLabel(row: { kind: string; amount_pence: number; claim_id: string | null; note: string | null }): string {
  switch (row.kind) {
    case 'grant':
      return 'Free welcome credit';
    case 'topup':
      return 'Card top up';
    case 'refund':
      return 'Card payment refunded';
    case 'fee':
      return row.amount_pence === -FEE_NEW_PENCE
        ? 'New diner from YepItsHalal'
        : row.amount_pence === -FEE_REPEAT_PENCE
          ? 'Return visit or poster scan'
          : 'Deal fee, cut to your cap';
    default:
      return row.claim_id ? 'Fee given back' : row.note ?? 'Change by YepItsHalal';
  }
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' });
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' });

export default async function ManageDealsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { topup?: string };
}) {
  const { restaurant } = await managedRestaurant(params.slug, 'deals');
  const state = await getDealState(restaurant.id);
  const db = dealsDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: ledger }, { data: pin }, { data: claims }, ready] = await Promise.all([
    db
      .from('deal_ledger')
      .select('id, kind, amount_pence, claim_id, note, created_at')
      .eq('restaurant_id', restaurant.id)
      .order('id', { ascending: false })
      .limit(15),
    db.from('restaurant_staff_pin').select('rotated_at, locked_until').eq('restaurant_id', restaurant.id).maybeSingle(),
    db.from('deal_claims').select('status, fee_kind, fee_pence').eq('restaurant_id', restaurant.id).gte('created_at', since),
    readyTopups(),
  ]);

  const deal = state?.deal && state.deal.status !== 'ended' ? state.deal : null;
  const firstDeal = !(ledger ?? []).some((l) => l.kind === 'grant');
  const used = (claims ?? []).filter((c) => c.status === 'redeemed');
  const newDiners = used.filter((c) => c.fee_kind === 'new').length;
  const fees30 = used.reduce((a, c) => a + (c.fee_pence ?? 0), 0);
  const note = searchParams.topup ? TOPUP_NOTES[searchParams.topup] : null;
  const locked = pin?.locked_until && new Date(pin.locked_until).getTime() > Date.now() ? pin.locked_until : null;

  return (
    <div className={`${BLOCK_CLASS} mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Managing</p>
          <h1 className="font-display text-2xl font-semibold text-ink">{restaurant.name}</h1>
          {restaurant.label && (
            <div className="mt-2 flex items-center gap-2">
              <HalalBadge classification={restaurant.label} size="sm" />
              <span className="text-xs text-muted">Set by our checks. A deal never changes it.</span>
            </div>
          )}
        </div>
        <Link
          href={`/restaurant/${restaurant.slug}`}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
        >
          View page
          <ArrowUpRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <ManageTabs slug={restaurant.slug} active="deals" />

      {note && (
        <p
          role="status"
          className={clsx(
            'mt-5 rounded-2xl p-4 text-sm font-medium ring-1',
            note.good ? 'bg-accent-soft text-accent-ink ring-accent/30' : 'bg-sand text-ink ring-sand-line'
          )}
        >
          {note.text}
        </p>
      )}

      {!state ? (
        <section className={`${card} mt-6`}>
          <h2 className={h2}>Deals are not switched on yet</h2>
          <p className="mt-1 text-sm text-muted">We are getting deals ready. Check back soon.</p>
        </section>
      ) : !deal ? (
        <section className={`${card} mt-6`}>
          <h2 className={h2}>Bring in new diners with one simple deal</h2>
          <ol className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-ink/85">
            <li>1. Pick a deal. It shows on your page here.</li>
            <li>2. A diner taps it and gets a code on their phone. Free for them, no sign up.</li>
            <li>3. At the till, your staff type your PIN on the diner&apos;s phone. That is when we charge.</li>
          </ol>
          <p className="mt-3 text-sm text-muted">
            {money(FEE_NEW_PENCE)} for a new diner who found you on YepItsHalal, {money(FEE_REPEAT_PENCE)} for everyone
            else. {firstDeal ? 'Your first £10 is on us. ' : ''}No contract. Stop any time.
          </p>
          <div className="mt-6 border-t border-line pt-6">
            <DealForm
              restaurantId={restaurant.id}
              hasPin={state.has_pin}
              firstDeal={firstDeal}
              submitLabel="Start my deal"
            />
          </div>
        </section>
      ) : (
        <>
          <DealStatus restaurantId={restaurant.id} state={state} />

          <section className={`${card} mt-4`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className={h2}>Credit</h2>
              <p className="text-xs text-muted">
                {money(FEE_NEW_PENCE)} a new diner, {money(FEE_REPEAT_PENCE)} a return visit
              </p>
            </div>
            <p className="mt-2 font-display text-4xl font-semibold tabular-nums text-ink">{moneyExact(state.balance_pence)}</p>
            <p className="mt-1 text-sm text-muted">
              About {Math.max(Math.floor(state.available_pence / FEE_NEW_PENCE), 0)} new diners or{' '}
              {Math.max(Math.floor(state.available_pence / FEE_REPEAT_PENCE), 0)} return visits.
              {state.held_pence > 0 && ` ${money(state.held_pence)} is kept for codes people have now.`}
            </p>
            {ready.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {TOPUP_PACKS.filter((p) => ready.includes(p.pence)).map((p, i) => (
                  <form key={p.pence} action={startTopUp}>
                    <input type="hidden" name="restaurant_id" value={restaurant.id} />
                    <input type="hidden" name="pack" value={p.pence} />
                    <button type="submit" className={i === 0 ? ctaPrimarySm : ctaSecondarySm}>
                      Add {money(p.pence)}
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">Card top ups open soon. Your free credit works now.</p>
            )}
            <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
              Fees this month: <span className="font-semibold text-ink">{money(state.month_fees_pence)}</span> of your{' '}
              {money(state.cap_pence)} cap.
            </p>
          </section>

          <section className={`${card} mt-4`}>
            <h2 className={h2}>Last 30 days</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ['Codes given', String((claims ?? []).length)],
                ['Used at your till', String(used.length)],
                ['New diners', String(newDiners)],
                ['Fees', money(fees30)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

      {/* Not before the first deal: the form above already asks for the PIN. */}
      {state && (deal || state.has_pin) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className={card}>
            <h2 className={h2}>Staff PIN</h2>
            <p className="mt-1 text-sm text-muted">
              {state.has_pin && pin
                ? `Set ${shortDate(pin.rotated_at)}. Change it when staff leave.`
                : 'You set it when you start your deal.'}
            </p>
            {locked && (
              <p className="mt-2 rounded-xl bg-halal-partialSoft px-3 py-2 text-sm font-medium text-halal-partialInk">
                Locked until {timeOf(locked)} after 10 wrong tries. A new PIN unlocks it now.
              </p>
            )}
            {state.has_pin && (
              <div className="mt-3">
                <PinForm restaurantId={restaurant.id} />
              </div>
            )}
          </section>
          <section className={card}>
            <h2 className={h2}>Monthly cap</h2>
            <p className="mt-1 text-sm text-muted">The most you pay in fees in a month. We never go over it.</p>
            <div className="mt-3">
              <CapForm restaurantId={restaurant.id} capPounds={state.cap_pence / 100} />
            </div>
          </section>
        </div>
      )}

      {deal && state && (
        <details className={`${card} group mt-4`}>
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2">
            <span className={h2}>Change your deal</span>
            <span className="text-sm font-semibold text-accent-ink group-open:hidden">Open</span>
          </summary>
          <p className="mt-2 text-sm text-muted">This starts a new deal. Codes people already have still work.</p>
          <div className="mt-5">
            <DealForm restaurantId={restaurant.id} hasPin={state.has_pin} firstDeal={false} submitLabel="Save new deal" />
          </div>
        </details>
      )}

      {(ledger ?? []).length > 0 && (
        <section className={`${card} mt-4`}>
          <h2 className={h2}>Activity</h2>
          <ul className="mt-2 divide-y divide-line">
            {(ledger ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-ink">{ledgerLabel(l)}</span>
                  <span className="text-xs text-subtle">
                    {shortDate(l.created_at)}, {timeOf(l.created_at)}
                  </span>
                </span>
                <span className={clsx('shrink-0 font-semibold tabular-nums', l.amount_pence > 0 ? 'text-accent-ink' : 'text-ink')}>
                  {l.amount_pence > 0 ? '+' : ''}
                  {moneyExact(l.amount_pence)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 px-1 text-xs leading-relaxed text-subtle">
        <Link href="/deals/terms" className="font-semibold text-accent-ink hover:underline">
          Deal terms
        </Link>
        . Questions? Email info@yepitshalal.com.
      </p>
    </div>
  );
}

function DealStatus({ restaurantId, state }: { restaurantId: string; state: DealState }) {
  const deal = state.deal!;
  const line = stateLine(state);
  const ownerPaused = deal.status === 'paused' && deal.paused_reason === 'owner';
  return (
    <section className={`${card} mt-6`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={clsx(
            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
            line.tone === 'live' && 'bg-accent text-ink',
            line.tone === 'paused' && 'bg-halal-partialSoft text-halal-partialInk',
            line.tone === 'off' && 'bg-halal-unverifiedSoft text-halal-unverifiedInk'
          )}
        >
          {line.title}
        </span>
      </div>
      <h2 className="mt-3 font-display text-xl font-semibold leading-snug text-ink">{deal.title}</h2>
      <ul className="mt-1 space-y-0.5 text-sm text-muted">
        {dealRules(deal).slice(0, 2).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {line.body && <p className="mt-3 text-sm text-ink/85">{line.body}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {deal.status === 'live' && (
          <form action={ownerDealStatus}>
            <input type="hidden" name="restaurant_id" value={restaurantId} />
            <input type="hidden" name="action" value="pause" />
            <button type="submit" className={ctaSecondarySm}>
              Pause
            </button>
          </form>
        )}
        {ownerPaused && (
          <form action={ownerDealStatus}>
            <input type="hidden" name="restaurant_id" value={restaurantId} />
            <input type="hidden" name="action" value="resume" />
            <button type="submit" className={ctaPrimarySm}>
              Start again
            </button>
          </form>
        )}
        <form action={ownerDealStatus}>
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <input type="hidden" name="action" value="end" />
          <ConfirmSubmitButton
            message="End your deal? New diners will not see it. Codes people already have still work."
            className={ctaSecondarySm}
          >
            End deal
          </ConfirmSubmitButton>
        </form>
      </div>
    </section>
  );
}
