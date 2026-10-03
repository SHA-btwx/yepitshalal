import { NextResponse } from 'next/server';
import { dealsDb } from '@/lib/deals/db';
import { notifyInbox } from '@/lib/notify';
import { SITE_URL } from '@/lib/site';
import { readDeviceHash } from '@/lib/deals/device';
import { REPORT_ERRORS } from '@/lib/deals/messages';
import { sendOwnerEmail } from '@/lib/deals/emails';
import { REPORTS_TO_PAUSE } from '@/lib/deals/rules';

// "They didn't honour this." Only the phone holding the code can report it,
// once. Three reports from different phones in 30 days pause the deal
// (report_deal_problem, 0052). Every report emails the business inbox, and a
// pause emails the owner too.

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function fail(error: string, status = 200) {
  return NextResponse.json(
    { ok: false, error, message: REPORT_ERRORS[error] ?? REPORT_ERRORS.failed },
    { status, headers: NO_STORE }
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string; note?: string } | null;
  const code = String(body?.code ?? '').toUpperCase();
  const note = String(body?.note ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!/^[2-9A-HJ-NP-Z]{6}$/.test(code)) return fail('not_found', 400);

  const device = readDeviceHash();
  if (!device) return fail('wrong_phone');

  let db;
  try {
    db = dealsDb();
  } catch {
    return fail('failed', 503);
  }

  const { data, error } = await db.rpc('report_deal_problem', { p_code: code, p_device_hash: device, p_note: note || null });
  if (error || !data) {
    console.error('[deals] report', error?.message);
    return fail('failed', 500);
  }
  const answer = data as {
    ok: boolean;
    error?: string;
    already?: boolean;
    reports?: number;
    paused_now?: boolean;
    restaurant_id?: string;
  };
  if (!answer.ok) return fail(answer.error ?? 'failed');

  if (!answer.already && answer.restaurant_id) {
    const { data: r } = await db.from('restaurants').select('name, slug').eq('id', answer.restaurant_id).maybeSingle();
    await notifyInbox({
      inbox: 'info',
      subject: answer.paused_now
        ? `Deal paused after ${REPORTS_TO_PAUSE} reports: ${r?.name ?? 'a restaurant'}`
        : `A diner says a deal was not given: ${r?.name ?? 'a restaurant'}`,
      fields: [
        ['Restaurant', r?.name],
        ['Code', code],
        ['What they said', note || '(nothing written)'],
        ['Reports in 30 days', answer.reports],
        ['Deal paused', answer.paused_now ? 'Yes, until an admin looks' : 'No'],
      ],
      action: { label: 'Open the deal in admin', href: `${SITE_URL}/admin/deals/${answer.restaurant_id}` },
    });
    if (answer.paused_now && r) {
      await sendOwnerEmail({
        restaurantId: answer.restaurant_id,
        kind: 'paused_reports',
        period: new Date().toISOString().slice(0, 10),
        subject: 'Your deal is paused',
        lines: [
          `${REPORTS_TO_PAUSE} diners told us they did not get your deal, so we paused it. New diners cannot claim it for now.`,
          'Codes people already have still work. We will look at what happened and get in touch. Reply to this email to tell us your side.',
        ],
        action: { label: 'See your deal', path: `/manage/${r.slug}/deals` },
      });
    }
  }

  return NextResponse.json({ ok: true, already: !!answer.already }, { headers: NO_STORE });
}
