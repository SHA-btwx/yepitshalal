import { NextResponse } from 'next/server';
import { dealsDb } from '@/lib/deals/db';
import { cronRefusal } from '@/lib/deals/cron';
import { sendOwnerEmail } from '@/lib/deals/emails';
import { FEE_NEW_PENCE, FEE_REPEAT_PENCE, LOW_BALANCE_PENCE, money, type DealState } from '@/lib/deals/rules';

// Daily, from vercel.json. Marks old codes expired, clears phone hashes past
// 400 days, and emails owners whose credit is low or gone. Each email is sent
// once per refill: the period is the latest credit row, so a top up resets it.

export const dynamic = 'force-dynamic';
// A GET-only route: without this, Next 14 caches every fetch in it, the
// emails to Resend included (see lib/deals/db.ts).
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  const refused = cronRefusal(request);
  if (refused) return refused;

  const db = dealsDb();
  const [{ data: expired }, { data: purged }] = await Promise.all([
    db.rpc('expire_deal_claims'),
    db.rpc('purge_old_deal_devices'),
  ]);

  const { data: open } = await db.from('deals').select('restaurant_id').neq('status', 'ended');
  const emails: Record<string, number> = {};

  for (const { restaurant_id } of open ?? []) {
    const { data: stateData } = await db.rpc('deal_state', { p_restaurant_id: restaurant_id });
    const state = stateData as DealState | null;
    // Only a deal the owner has switched on. A paused one (by them, or after
    // reports) gets no "credit ran out" email on top of why it is paused.
    if (!state?.deal || state.deal.status !== 'live') continue;

    const { data: lastCredit } = await db
      .from('deal_ledger')
      .select('id')
      .eq('restaurant_id', restaurant_id)
      .or('kind.eq.grant,kind.eq.topup,and(kind.eq.adjustment,amount_pence.gt.0)')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    const period = `after-${lastCredit?.id ?? 0}`;

    const { data: r } = await db.from('restaurants').select('slug').eq('id', restaurant_id).maybeSingle();
    const path = r ? `/manage/${r.slug}/deals` : '/manage';

    let outcome: string | null = null;
    if (state.available_pence < FEE_NEW_PENCE) {
      outcome = await sendOwnerEmail({
        restaurantId: restaurant_id,
        kind: 'no_credit',
        period,
        subject: 'Your deal is paused: credit ran out',
        lines: [
          'Your credit is under £1, so new diners cannot claim your deal right now. Codes people already have still work.',
          'Top up and your deal starts again by itself.',
        ],
        action: { label: 'Top up', path },
      });
    } else if (state.balance_pence < LOW_BALANCE_PENCE) {
      const newDiners = Math.floor(state.available_pence / FEE_NEW_PENCE);
      const visits = Math.floor(state.available_pence / FEE_REPEAT_PENCE);
      outcome = await sendOwnerEmail({
        restaurantId: restaurant_id,
        kind: 'low_balance',
        period,
        subject: 'Your deal credit is running low',
        lines: [
          `You have ${money(state.balance_pence)} of credit left. That covers about ${newDiners} new diners, or ${visits} return visits.`,
          'Top up so your deal keeps running. When credit runs out, the deal pauses until you top up.',
        ],
        action: { label: 'Top up', path },
      });
    }
    if (outcome) emails[outcome] = (emails[outcome] ?? 0) + 1;
  }

  return NextResponse.json({ ok: true, expired: expired ?? 0, purged: purged ?? 0, emails });
}
