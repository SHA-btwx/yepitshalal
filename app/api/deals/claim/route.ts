import { NextResponse } from 'next/server';
import { dealsDb } from '@/lib/deals/db';
import { ipHashFor, overIpLimit } from '@/lib/rateLimit';
import { ensureDeviceHash } from '@/lib/deals/device';
import { CLAIM_ERRORS } from '@/lib/deals/messages';

// Claim a deal: no account, no form. The phone gets a signed cookie (only
// here, only when someone taps Claim) and the database decides everything
// else in claim_deal() (0052): whether the deal is live, the one use a day,
// the credit, the cap, and the code.

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOUR = 60 * 60 * 1000;

function fail(error: string, status = 200) {
  return NextResponse.json(
    { ok: false, error, message: CLAIM_ERRORS[error] ?? CLAIM_ERRORS.failed },
    { status, headers: NO_STORE }
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { dealId?: string; source?: string } | null;
  const dealId = String(body?.dealId ?? '');
  // Only the restaurant's own in-store QR says qr. Everything else started on
  // the site. A QR claim is the cheaper rate, so nobody gains by faking it.
  const source = body?.source === 'qr' ? 'qr' : 'site';
  if (!UUID.test(dealId)) return fail('not_found', 400);

  let db;
  try {
    db = dealsDb();
  } catch {
    return fail('failed', 503);
  }

  // A whole restaurant of diners can share one Wi-Fi, so this is generous.
  const ipHash = ipHashFor(request);
  if (await overIpLimit(db, 'deal_claims', ipHash, { max: 30, windowMs: HOUR })) return fail('rate_limited', 429);

  const device = ensureDeviceHash();
  const { data, error } = await db.rpc('claim_deal', {
    p_deal_id: dealId,
    p_device_hash: device,
    p_source: source,
    p_ip_hash: ipHash,
  });
  if (error || !data) {
    console.error('[deals] claim', error?.message);
    return fail('failed', 500);
  }
  const result = data as { ok: boolean; error?: string; code?: string; expires_at?: string; existing?: boolean };
  if (!result.ok) return fail(result.error ?? 'failed');
  return NextResponse.json(
    { ok: true, code: result.code, expiresAt: result.expires_at, existing: !!result.existing },
    { headers: NO_STORE }
  );
}
