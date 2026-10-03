import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" to a cron route when the
 * project has a CRON_SECRET variable. Without one, nothing can prove a call
 * came from Vercel, so the job refuses to run at all. Nothing depends on these
 * jobs for correctness (0052): codes expire and credit pauses on their own.
 * They only tidy and send emails.
 */
export function cronRefusal(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set.' }, { status: 503 });
  const want = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(request.headers.get('authorization') ?? '');
  if (want.length !== got.length || !timingSafeEqual(want, got)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  return null;
}

/** "2026-W41", the ISO week a date falls in. */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
