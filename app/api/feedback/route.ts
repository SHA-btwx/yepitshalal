import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

// Feedback about the site itself. Written with the service role because nobody
// should be able to read this table back out, including the person who wrote
// the row.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Body {
  email?: string;
  message?: string;
  page_url?: string;
  /** Honeypot. A person never sees this field; a bot fills everything. */
  company_website?: string;
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
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

  const email = clean(body.email, 200);
  const message = clean(body.message, 4000);

  if (!email || !EMAIL.test(email)) {
    return NextResponse.json({ error: 'Please add an email address we can reply to.' }, { status: 422 });
  }
  if (!message || message.length < 4) {
    return NextResponse.json({ error: 'Please tell us what you wanted to say.' }, { status: 422 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase.from('site_feedback').insert({
    email,
    message,
    page_url: clean(body.page_url, 500),
  });

  if (error) {
    return NextResponse.json({ error: "That didn't save. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
