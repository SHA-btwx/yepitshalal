import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { notifyAdmin } from '@/lib/notify';

// "Add a restaurant" creates a submission, never a listing.
//
//   submitted -> pending -> reviewed in /admin/submissions -> approved -> listed
//
// Nothing here writes to the public catalogue. The location must be a real
// London postcode (there is no fallback pin: an address we cannot place is
// rejected with a reason, not dropped at Charing Cross), likely duplicates are
// found before storing, and one address can only submit a handful per hour.

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_HOUR = 5;

type Tri = boolean | null;

interface Body {
  company_website?: string; // honeypot
  name?: string;
  address?: string;
  postcode?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  cuisine?: string;
  relationship?: string;
  contact_name?: string;
  contact_email?: string;
  halal_claim?: string;
  serves_pork?: string;
  serves_alcohol?: string;
  certification_body?: string;
  evidence_url?: string;
  notes?: string;
}

const clean = (v: unknown, max: number) => {
  const s = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
  return s ? s.slice(0, max) : null;
};

const tri = (v: unknown): Tri => (v === 'yes' ? true : v === 'no' ? false : null);

function validUrl(v: string | null): string | null {
  if (!v) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return /^https?:$/.test(url.protocol) && url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Something went wrong sending the form. Please try again.' }, { status: 400 });
  }

  // Bots fill every field; people never see this one. Report success so the bot
  // learns nothing.
  if (body.company_website) return NextResponse.json({ ok: true, duplicate: null });

  const name = clean(body.name, 120);
  const address = clean(body.address, 300);
  const postcodeRaw = clean(body.postcode, 10)?.toUpperCase() ?? null;
  const relationship = ['owner', 'staff', 'customer'].includes(String(body.relationship)) ? String(body.relationship) : null;
  const contactEmail = clean(body.contact_email, 200);

  const problems: string[] = [];
  if (!name || name.length < 2) problems.push('the restaurant name');
  if (!address || address.length < 5) problems.push('the street address');
  if (!postcodeRaw || !UK_POSTCODE.test(postcodeRaw)) problems.push('a full UK postcode');
  if (!relationship) problems.push('how you know this restaurant');
  if (contactEmail && !EMAIL.test(contactEmail)) problems.push('a valid email address, or leave it blank');
  if (problems.length) {
    return NextResponse.json({ error: `Please add ${problems.join(', ')}.` }, { status: 422 });
  }

  // Place it from the postcode, and only accept London.
  let lat: number;
  let lng: number;
  let borough: string;
  let postcode: string;
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcodeRaw!.replace(/\s+/g, ''))}`, {
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    if (!res.ok || !json.result) {
      return NextResponse.json(
        { error: `We couldn't find the postcode ${postcodeRaw}. Please check it and try again.` },
        { status: 422 }
      );
    }
    if (json.result.region !== 'London') {
      return NextResponse.json(
        { error: `${json.result.postcode} is outside London. We only list London restaurants for now.` },
        { status: 422 }
      );
    }
    lat = json.result.latitude;
    lng = json.result.longitude;
    borough = json.result.admin_district;
    postcode = json.result.postcode;
  } catch {
    return NextResponse.json(
      { error: "We couldn't check that postcode just now. Please try again in a minute." },
      { status: 503 }
    );
  }

  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch {
    return NextResponse.json({ error: 'Submissions are unavailable right now.' }, { status: 503 });
  }

  // Rate limit by a salted hash of the address, never the address itself.
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const salt = process.env.SUBMISSION_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || '';
  const ipHash = createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
  const { count } = await supabase
    .from('restaurant_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return NextResponse.json(
      { error: "You've sent several restaurants in the last hour. Please try again later." },
      { status: 429 }
    );
  }

  const { data: similar } = await supabase.rpc('similar_restaurants', {
    p_name: name,
    p_lat: lat,
    p_lng: lng,
    p_postcode: postcode,
  });
  const candidates = (similar ?? []) as {
    id: string; name: string; slug: string; address: string; postcode: string | null;
    is_listed: boolean; distance_meters: number; similarity: number;
  }[];
  const likely = candidates.find((c) => c.similarity >= 0.6 && c.distance_meters <= 150);

  const claim = body.halal_claim === 'fully_halal' || body.halal_claim === 'halal_options' ? body.halal_claim : null;

  const { data: inserted, error } = await supabase
    .from('restaurant_submissions')
    .insert({
      name,
      address,
      postcode,
      lat,
      lng,
      borough,
      phone: clean(body.phone, 30),
      website: validUrl(clean(body.website, 300)),
      instagram: clean(body.instagram, 100),
      cuisine: clean(body.cuisine, 60),
      relationship,
      contact_name: clean(body.contact_name, 100),
      contact_email: contactEmail,
      halal_claim: claim,
      all_meat_halal: claim === 'fully_halal' ? true : claim === 'halal_options' ? false : null,
      serves_pork: tri(body.serves_pork),
      serves_alcohol: tri(body.serves_alcohol),
      certification_body: clean(body.certification_body, 80),
      evidence_url: validUrl(clean(body.evidence_url, 500)),
      notes: clean(body.notes, 1000),
      duplicate_candidates: candidates,
      ip_hash: ipHash,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: 'We could not save that just now. Please try again.' }, { status: 500 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://yepitshalal.com';
  await notifyAdmin(
    `New restaurant submission: ${name}`,
    [
      `${name}`,
      `${address}, ${postcode} (${borough})`,
      `Submitted by: ${relationship}${contactEmail ? `, ${contactEmail}` : ''}`,
      `Halal: ${claim ?? 'not stated'}`,
      likely ? `Possible duplicate of: ${likely.name} (${site}/restaurant/${likely.slug})` : 'No likely duplicate found.',
      '',
      `Review: ${site}/admin/submissions/${inserted.id}`,
    ].join('\n')
  );

  return NextResponse.json({
    ok: true,
    duplicate: likely && likely.is_listed ? { name: likely.name, slug: likely.slug } : null,
  });
}
