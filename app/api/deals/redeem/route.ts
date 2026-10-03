import { NextResponse } from 'next/server';
import { dealsDb } from '@/lib/deals/db';
import { ipHashFor, overIpLimit } from '@/lib/rateLimit';
import { readDeviceHash } from '@/lib/deals/device';
import { REDEEM_ERRORS } from '@/lib/deals/messages';
import { sendOwnerEmail } from '@/lib/deals/emails';

// The till. Staff type the restaurant's PIN on the diner's phone and tap
// "Bill is at least £X". redeem_deal() (0052) checks the code, the phone, the
// day, the hours and the PIN, works out the fee, and posts it, all in one
// transaction. This is the only way a fee is ever taken.

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const HOUR = 60 * 60 * 1000;

type Answer = {
  ok: boolean;
  error?: string;
  already?: boolean;
  fee_pence?: number;
  redeemed_at?: string;
  tries_left?: number;
  voided?: boolean;
  locked_now?: boolean;
  locked_until?: string;
};

function fail(error: string, extra: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json(
    { ok: false, error, message: REDEEM_ERRORS[error] ?? REDEEM_ERRORS.failed, ...extra },
    { status, headers: NO_STORE }
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string; pin?: string; confirmed?: boolean } | null;
  const code = String(body?.code ?? '').toUpperCase();
  const pin = String(body?.pin ?? '').replace(/\D/g, '');
  if (!/^[2-9A-HJ-NP-Z]{6}$/.test(code)) return fail('not_found', {}, 400);
  if (body?.confirmed !== true) return fail('not_confirmed', {}, 400);

  const device = readDeviceHash();
  if (!device) return fail('wrong_phone');

  let db;
  try {
    db = dealsDb();
  } catch {
    return fail('failed', {}, 503);
  }

  const ipHash = ipHashFor(request);
  if (await overIpLimit(db, 'deal_pin_attempts', ipHash, { max: 30, windowMs: HOUR })) {
    return fail('rate_limited', {}, 429);
  }

  const { data, error } = await db.rpc('redeem_deal', {
    p_code: code,
    p_device_hash: device,
    p_pin: pin,
    p_ip_hash: ipHash,
  });
  if (error || !data) {
    console.error('[deals] redeem', error?.message);
    return fail('failed', {}, 500);
  }
  const answer = data as Answer;

  if (!answer.ok) {
    if (answer.error === 'wrong_pin' && answer.locked_now) await tellOwnerPinLocked(db, code);
    return fail(answer.error ?? 'failed', {
      triesLeft: answer.tries_left,
      voided: answer.voided ?? false,
      lockedUntil: answer.locked_until,
    });
  }

  return NextResponse.json({ ok: true, already: !!answer.already, redeemedAt: answer.redeemed_at }, { headers: NO_STORE });
}

async function tellOwnerPinLocked(db: ReturnType<typeof dealsDb>, code: string) {
  const { data: claim } = await db.from('deal_claims').select('restaurant_id').eq('code', code).maybeSingle();
  if (!claim) return;
  const { data: r } = await db.from('restaurants').select('slug').eq('id', claim.restaurant_id).maybeSingle();
  await sendOwnerEmail({
    restaurantId: claim.restaurant_id,
    kind: 'pin_locked',
    period: new Date().toISOString().slice(0, 13),
    subject: 'Your deal PIN is locked for 30 minutes',
    lines: [
      'Someone typed the wrong staff PIN 10 times in a row, so we locked it for 30 minutes.',
      'If that was not your staff, set a new PIN now. A new PIN works straight away.',
    ],
    action: r ? { label: 'Set a new PIN', path: `/manage/${r.slug}/deals` } : undefined,
  });
}
