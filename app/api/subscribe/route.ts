import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { ipHashFor, overIpLimit, RATE_LIMITED_MESSAGE } from '@/lib/rateLimit';

// "Tell me when you reach my city."
//
// Written with the service role because nobody should be able to read this
// table back out, including the person who wrote the row. Signing up twice is
// not an error: the second one updates the city and says thank you, because
// telling somebody "you are already on the list" when they cannot see the list
// is just a way of making them feel stupid.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** What the autocomplete handed back, when somebody picked rather than typed. */
interface ChosenPlace {
  label?: unknown;
  name?: unknown;
  region?: unknown;
  country?: unknown;
  countryCode?: unknown;
  kind?: unknown;
  placeId?: unknown;
  lat?: unknown;
  lng?: unknown;
}

interface Body {
  email?: string;
  wanted_city?: string;
  place?: ChosenPlace | null;
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

  // Lowercased on the way in: one person is one row, however they type it.
  const email = clean(body.email, 200)?.toLowerCase() ?? null;
  if (!email || !EMAIL.test(email)) {
    return NextResponse.json({ error: 'Please add an email address we can reach you on.' }, { status: 422 });
  }

  // A chosen place is worth more than a typed one: it is the same row for
  // everybody who asks for the same city, which is the only way to count. What
  // was typed is kept either way, because free text is still an answer.
  const p = body.place && typeof body.place === 'object' ? body.place : null;
  const str = (v: unknown, max: number) => clean(v, max);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  const supabase = createAdminSupabase();

  // One connection cannot put a stack of other people's addresses on the list.
  const ipHash = ipHashFor(request);
  if (await overIpLimit(supabase, 'subscribers', ipHash)) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 });
  }

  const { error } = await supabase.from('subscribers').upsert(
    {
      email,
      wanted_city: str(p?.name, 120) ?? clean(body.wanted_city, 120),
      wanted_place_label: str(p?.label, 200),
      wanted_region: str(p?.region, 120),
      wanted_country: str(p?.country, 120),
      wanted_country_code: str(p?.countryCode, 8),
      wanted_place_kind: str(p?.kind, 40),
      wanted_place_id: str(p?.placeId, 64),
      wanted_lat: num(p?.lat),
      wanted_lng: num(p?.lng),
      ip_hash: ipHash,
      source: clean(body.source, 200),
      locale: clean(body.locale, 8) ?? 'en',
      status: 'active',
    },
    { onConflict: 'email', ignoreDuplicates: false }
  );

  if (error) {
    // Already on the list is not a failure worth showing anybody.
    if (error.code === '23505') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "That didn't save. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
