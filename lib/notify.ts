// Email to the site owner when something needs a person to look at it.
//
// Sent through Resend's HTTP API directly, so there is no new dependency. It
// does nothing until these are set in Vercel:
//
//   RESEND_API_KEY        from resend.com
//   ADMIN_NOTIFY_EMAIL    where alerts go
//   NOTIFY_FROM_EMAIL     optional, e.g. "YepItsHalal <alerts@yepitshalal.com>"
//                         once the domain is verified in Resend. Without it,
//                         Resend's onboarding sender only delivers to the
//                         Resend account's own address.
//
// A failed or unconfigured email never fails the request that triggered it:
// the submission is already stored and visible in /admin/submissions.

export async function notifyAdmin(subject: string, text: string): Promise<'sent' | 'not_configured' | 'failed'> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!key || !to) return 'not_configured';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM_EMAIL || 'YepItsHalal <onboarding@resend.dev>',
        to: [to],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
