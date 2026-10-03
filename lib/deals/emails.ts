import { dealsDb } from '@/lib/deals/db';
import { escapeHtml, sendThroughResend } from '@/lib/notify';
import { INBOX, SITE_URL } from '@/lib/site';
import { ownerEmailFor } from './data';

/**
 * The emails Deals sends to restaurant owners: running low, out of credit,
 * paused by reports, PIN locked, and the Monday summary.
 *
 * Each is recorded in deal_emails before it is sent, keyed on what it is
 * about (the week, the top up it follows), so a job that runs twice never
 * sends twice. If Resend fails, the record is taken back so the next run
 * tries again. Replies go to info@, the business inbox.
 */

const FROM = process.env.DEALS_FROM_EMAIL || 'YepItsHalal deals <deals@yepitshalal.com>';

export type OwnerEmailKind = 'low_balance' | 'no_credit' | 'weekly' | 'paused_reports' | 'pin_locked';

export interface OwnerEmail {
  restaurantId: string;
  kind: OwnerEmailKind;
  /** What makes this email unique: the week, a ledger row, a time. */
  period: string;
  subject: string;
  /** Short paragraphs, in order. */
  lines: string[];
  action?: { label: string; path: string };
}

function render(email: OwnerEmail): { text: string; html: string } {
  const href = email.action ? `${SITE_URL}${email.action.path}` : null;
  const text = [...email.lines, ...(href ? ['', `${email.action!.label}: ${href}`] : []), '', 'YepItsHalal'].join('\n\n');
  const paras = email.lines
    .map((l) => `<p style="margin:0 0 14px;font:15px/1.6 -apple-system,Segoe UI,sans-serif;color:#0F252B">${escapeHtml(l)}</p>`)
    .join('');
  const button = href
    ? `<p style="margin:20px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0B2F3A;color:#fff;text-decoration:none;font:600 14px -apple-system,Segoe UI,sans-serif;padding:11px 20px;border-radius:999px">${escapeHtml(email.action!.label)}</a></p>`
    : '';
  const html =
    `<div style="max-width:560px">` +
    `<p style="margin:0 0 16px;font:600 18px/1.3 Georgia,serif;color:#124452">${escapeHtml(email.subject)}</p>` +
    paras +
    button +
    `<p style="margin:24px 0 0;font:12px -apple-system,Segoe UI,sans-serif;color:#5B6D72">YepItsHalal deals. Reply to this email to talk to us.</p>` +
    `</div>`;
  return { text, html };
}

/** Sends once per (restaurant, kind, period). Returns what happened. */
export async function sendOwnerEmail(email: OwnerEmail): Promise<'sent' | 'already' | 'no_owner' | 'failed'> {
  const db = dealsDb();
  const owner = await ownerEmailFor(email.restaurantId);
  if (!owner) return 'no_owner';

  const { error: claimError } = await db
    .from('deal_emails')
    .insert({ restaurant_id: email.restaurantId, kind: email.kind, period: email.period });
  if (claimError) return claimError.code === '23505' ? 'already' : 'failed';

  const { text, html } = render(email);
  const result = await sendThroughResend(
    { from: FROM, to: [owner.email], subject: email.subject, text, html, replyTo: INBOX.info },
    { idempotencyKey: `deal-${email.kind}-${email.restaurantId}-${email.period}`.slice(0, 250) }
  );

  if (!result.ok) {
    await db
      .from('deal_emails')
      .delete()
      .match({ restaurant_id: email.restaurantId, kind: email.kind, period: email.period });
    return 'failed';
  }
  await db
    .from('deal_emails')
    .update({ resend_id: result.id ?? null })
    .match({ restaurant_id: email.restaurantId, kind: email.kind, period: email.period });
  return 'sent';
}
