import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { matchLanguage } from '@/lib/languages';
import { ipHashFor, overIpLimit, RATE_LIMITED_MESSAGE } from '@/lib/rateLimit';
import { notifyInbox } from '@/lib/notify';

// "Can you do this in my language?"
//
// A vote, not a sign-up: the email is optional, because making somebody hand
// over an address to ask for their own language would be a strange toll to
// charge. When they do leave one we can tell them it is ready.
//
// Written with the service role. Nobody can read this table back out.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Body {
  language?: string;
  email?: string;
  source?: string;
  locale?: string;
  /** Honeypot. A person never sees this field; a bot fills everything. */
  company_website?: string;
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ').slice(0, max);
  return trimmed || null;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Something went wrong sending that. Please try again.' }, { status: 400 });
  }

  // Report success so the bot learns nothing.
  if (body.company_website) return NextResponse.json({ ok: true });

  const typed = clean(body.language, 80);
  if (!typed) {
    return NextResponse.json({ error: 'Please say which language.' }, { status: 422 });
  }

  // Matched against the list on the server as well as in the browser, so a
  // request that skipped the suggestions still counts with the rest.
  const matched = matchLanguage(typed);
  const email = clean(body.email, 200)?.toLowerCase() ?? null;
  if (email && !EMAIL.test(email)) {
    return NextResponse.json({ error: 'That email address does not look right.' }, { status: 422 });
  }

  const supabase = createAdminSupabase();

  const ipHash = ipHashFor(request);
  if (await overIpLimit(supabase, 'language_requests', ipHash)) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 });
  }

  const { error } = await supabase.from('language_requests').insert({
    language: matched?.name ?? typed,
    language_code: matched?.code ?? null,
    email,
    source: clean(body.source, 200),
    locale: clean(body.locale, 8) ?? 'en',
    ip_hash: ipHash,
  });

  if (error) {
    return NextResponse.json({ error: "That didn't save. Please try again." }, { status: 500 });
  }

  await notifyInbox({
    inbox: 'hello',
    subject: `Language request: ${matched?.name ?? typed}`,
    fields: [
      ['Language', matched?.name ?? typed],
      ['As typed', matched && matched.name !== typed ? typed : null],
      ['Email', email ?? 'Not given'],
      ['Asked from', clean(body.source, 200)],
      ['Page language', clean(body.locale, 8) ?? 'en'],
    ],
    replyTo: email,
  });

  return NextResponse.json({ ok: true });
}
