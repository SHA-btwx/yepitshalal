import { escapeHtml } from '@/lib/notify';

// A reply should look like a person wrote it, because one did: no banner, no
// logo, no tracking. Plain text first, since that is what a phone's preview
// shows, and a quiet HTML copy with the same words for everything else.

const FONT = "font:15px/1.6 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function paragraphsHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;${FONT};color:#0F252B">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function renderReply(body: string, quote: { intro: string; lines: string[] } | null) {
  const text = quote
    ? `${body}\n\n${quote.intro}\n${quote.lines.map((l) => `> ${l}`).join('\n')}\n`
    : `${body}\n`;

  const quoted = quote
    ? `<p style="margin:24px 0 6px;font:13px/1.5 -apple-system,'Segoe UI',sans-serif;color:#5B6D72">${escapeHtml(quote.intro)}</p>` +
      `<blockquote style="margin:0;padding:2px 0 2px 12px;border-left:3px solid #DDE8E8;font:13px/1.55 -apple-system,'Segoe UI',sans-serif;color:#4A5D62">${quote.lines
        .map((l) => escapeHtml(l))
        .join('<br>')}</blockquote>`
    : '';

  const html = `<div style="max-width:600px">${paragraphsHtml(body)}${quoted}</div>`;
  return { text, html };
}
