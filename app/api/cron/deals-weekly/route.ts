import { NextResponse } from 'next/server';
import { dealsDb } from '@/lib/deals/db';
import { cronRefusal, isoWeek } from '@/lib/deals/cron';
import { sendOwnerEmail } from '@/lib/deals/emails';
import { money } from '@/lib/deals/rules';

// Mondays, from vercel.json. One short email to each owner with a deal:
// claims, uses, fees and credit for the last 7 days. Sent once per ISO week.

export const dynamic = 'force-dynamic';
// A GET-only route: without this, Next 14 caches every fetch in it, the
// emails to Resend included (see lib/deals/db.ts).
export const fetchCache = 'force-no-store';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const refused = cronRefusal(request);
  if (refused) return refused;

  const db = dealsDb();
  const now = new Date();
  const since = new Date(now.getTime() - WEEK_MS).toISOString();
  const period = isoWeek(now);

  const [{ data: open }, { data: recentlyEnded }] = await Promise.all([
    db.from('deals').select('restaurant_id').neq('status', 'ended'),
    db.from('deals').select('restaurant_id').eq('status', 'ended').gte('ended_at', since),
  ]);
  const ids = [...new Set([...(open ?? []), ...(recentlyEnded ?? [])].map((d) => d.restaurant_id))];
  const emails: Record<string, number> = {};

  for (const id of ids) {
    const [{ count: claims }, { count: uses }, { data: fees }, { data: balance }, { data: r }] = await Promise.all([
      db.from('deal_claims').select('id', { count: 'exact', head: true }).eq('restaurant_id', id).gte('created_at', since),
      db
        .from('deal_claims')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', id)
        .eq('status', 'redeemed')
        .gte('redeemed_at', since),
      db.from('deal_ledger').select('amount_pence').eq('restaurant_id', id).eq('kind', 'fee').gte('created_at', since),
      db.rpc('deal_balance', { p_restaurant_id: id }),
      db.from('restaurants').select('slug').eq('id', id).maybeSingle(),
    ]);
    const feeTotal = -(fees ?? []).reduce((a, f) => a + (f.amount_pence as number), 0);
    const quiet = !claims && !uses;

    const outcome = await sendOwnerEmail({
      restaurantId: id,
      kind: 'weekly',
      period,
      subject: quiet ? 'Your deal this week: no claims yet' : `Your deal this week: ${uses ?? 0} used`,
      lines: [
        `In the last 7 days, ${claims ?? 0} people got a code and ${uses ?? 0} used it at your till.`,
        `Fees this week: ${money(feeTotal)}. Credit left: ${money(Number(balance ?? 0))}.`,
        quiet
          ? 'Tip: print your poster and put it by the till, so people see the deal while they wait.'
          : 'Thank you for running a deal on YepItsHalal.',
      ],
      action: r ? { label: 'See your deal', path: `/manage/${r.slug}/deals` } : undefined,
    });
    emails[outcome] = (emails[outcome] ?? 0) + 1;
  }

  return NextResponse.json({ ok: true, period, restaurants: ids.length, emails });
}
