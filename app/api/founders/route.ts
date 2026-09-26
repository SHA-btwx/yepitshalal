import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { track } from '@vercel/analytics/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getFounderAvailability } from '@/lib/founders-data';
import { notifyInbox } from '@/lib/notify';
import { SITE_URL } from '@/lib/site';
import {
  FOUNDERS_CAP,
  cleanSource,
  cleanText,
  dedupeKey,
  findPostcode,
  hasSubstance,
  parseContact,
  type ClaimError,
  type ClaimResponse,
  type ContactVia,
} from '@/lib/founders';

// The 100 Founders Club, /founders.
//
//   GET   the live count, for the page to stay current while it is open
//   POST  one application. The database decides what it gets, atomically, in
//         claim_founder_spot() (0050): a Founder number while any of the 100
//         are free, a standard free listing after that. The page's own count
//         is never trusted for this.
//
// Four answers come in, as typed. The route checks they make sense, places a
// postcode if there is one (London only, like every listing), and hands the
// rest to the database. Nothing here writes to the public catalogue: an
// application becomes a listing only when Shabir sets it up.

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const availability = await getFounderAvailability();
  if (!availability) {
    return NextResponse.json({ error: 'The count could not be read just now.' }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json(availability, { headers: NO_STORE });
}

interface Body {
  company_website?: string; // the spam trap
  business_name?: string;
  location?: string;
  contact_name?: string;
  contact?: string;
  client_token?: string;
  source?: string;
}

interface ClaimRow {
  outcome: 'founder' | 'standard' | 'duplicate' | 'rate_limited';
  application_id: string | null;
  tier: 'founder' | 'standard' | null;
  founder_number: number | null;
  claimed: number;
  cap: number;
  business_name: string | null;
  contact_via: ContactVia | null;
}

function problem(error: string, field?: ClaimError['field'], status = 422) {
  return NextResponse.json({ error, field } satisfies ClaimError, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return problem('Something went wrong sending the form. Please try again.', undefined, 400);
  }

  // People never see this field; bots fill in everything. Nothing is stored,
  // and the answer promises nothing.
  if (body.company_website) {
    return NextResponse.json({ outcome: 'received' } satisfies ClaimResponse, { headers: NO_STORE });
  }

  const businessName = cleanText(body.business_name, 120);
  const location = cleanText(body.location, 120);
  const contactName = cleanText(body.contact_name, 120);
  const contactRaw = cleanText(body.contact, 100);

  if (!hasSubstance(businessName)) return problem('Add the name of your restaurant or business.', 'business_name');
  if (!hasSubstance(location)) return problem('Add where you are in London: a postcode, or the area or market.', 'location');
  if (!hasSubstance(contactName)) return problem('Add your name and role, like "Aisha, Owner".', 'contact_name');
  const contact = contactRaw ? parseContact(contactRaw) : null;
  if (!contactRaw || !contact) {
    return problem('Add your Instagram handle, like @yourplace, or a phone number.', 'contact');
  }

  // A postcode is placed and held to London, like every listing. An area or a
  // market name is kept as typed: Shabir sorts the exact address out when he
  // gets in touch, and a stall may not have one.
  const postcodeTyped = findPostcode(location);
  let geo: { postcode: string; borough: string; lat: number; lng: number } | null = null;
  if (postcodeTyped) {
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcodeTyped.replace(/\s+/g, ''))}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 404) {
        return problem(`We couldn't find the postcode ${postcodeTyped}. Check it, or write the area instead.`, 'location');
      }
      const json = await res.json();
      if (res.ok && json.result) {
        if (json.result.region !== 'London') {
          return problem(
            `${json.result.postcode} is in ${json.result.admin_district}, outside London. Where do you trade in London? Put that postcode or area here instead.`,
            'location'
          );
        }
        geo = {
          postcode: json.result.postcode,
          borough: json.result.admin_district,
          lat: json.result.latitude,
          lng: json.result.longitude,
        };
      }
    } catch {
      // postcodes.io being slow must not cost anybody their spot. The postcode
      // is kept as typed and placed later.
    }
  }
  const postcode = geo?.postcode ?? postcodeTyped;

  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch {
    return problem('Sign-ups are unavailable right now. Please message Shabir on Instagram instead.', undefined, 503);
  }

  // The hourly limit counts a salted hash of the address, never the address.
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const salt = process.env.SUBMISSION_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || '';
  const ipHash = createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);

  const { data, error } = await supabase.rpc('claim_founder_spot', {
    p_business_name: businessName,
    p_location: location,
    p_contact_name: contactName,
    p_contact: contactRaw,
    p_dedupe_key: dedupeKey(businessName, location, postcode),
    p_postcode: postcode,
    p_borough: geo?.borough ?? null,
    p_lat: geo?.lat ?? null,
    p_lng: geo?.lng ?? null,
    p_instagram: contact.instagram,
    p_phone: contact.phone,
    p_client_token: typeof body.client_token === 'string' && UUID.test(body.client_token) ? body.client_token : null,
    p_source: cleanSource(body.source),
    p_ip_hash: ipHash,
  });

  const row = (Array.isArray(data) ? data[0] : data) as ClaimRow | undefined;
  if (error || !row) {
    return problem(
      "We couldn't save that just now. Please try again in a minute, or message Shabir on Instagram.",
      undefined,
      500
    );
  }

  if (row.outcome === 'rate_limited') {
    return problem(
      'A lot of sign-ups have come from this connection in the last hour. Please try again later, or message Shabir on Instagram.',
      undefined,
      429
    );
  }

  const cap = row.cap || FOUNDERS_CAP;
  const via: ContactVia = row.contact_via ?? (contact.instagram ? 'instagram' : 'phone');

  if (row.outcome === 'duplicate') {
    const answer: ClaimResponse = {
      outcome: 'duplicate',
      tier: row.tier === 'founder' ? 'founder' : 'standard',
      founderNumber: row.founder_number,
      businessName: row.business_name ?? businessName,
      contactVia: via,
      claimed: row.claimed,
      cap,
    };
    return NextResponse.json(answer, { headers: NO_STORE });
  }

  const isFounder = row.outcome === 'founder' && row.founder_number !== null;

  // info@ is the business inbox. The status is the first thing in the subject
  // and the first row, so it cannot be misread. Stored before this runs, so a
  // failed or unconfigured email never loses an application.
  await notifyInbox({
    inbox: 'info',
    subject: isFounder
      ? `Founder #${row.founder_number} of ${cap}: ${businessName}`
      : `Free listing request from the Founders page: ${businessName}`,
    fields: [
      [
        'Status',
        isFounder
          ? `Founder #${row.founder_number} of ${cap}`
          : `Standard free listing. All ${cap} Founder spots were already taken, so this is not Founder status.`,
      ],
      ['Business', businessName],
      ['Location, as typed', location],
      ['Postcode', geo ? `${geo.postcode}, ${geo.borough}` : postcode],
      ['Name and role', contactName],
      ['Instagram', contact.instagram ? `@${contact.instagram}, https://instagram.com/${contact.instagram}` : null],
      ['Phone', contact.phone],
      ['Came from', cleanSource(body.source)],
      ['Founders so far', `${row.claimed} of ${cap}`],
    ],
    action: { label: 'Open the Founders list', href: `${SITE_URL}/admin/founders` },
  });

  // Counts only, never who. Vercel records custom events on its paid plans.
  try {
    await track('founders_application_accepted', { tier: isFounder ? 'founder' : 'standard' }, { request });
    if (isFounder && row.claimed >= cap) {
      await track('founders_capacity_reached', { cap }, { request });
    }
  } catch {
    // Analytics never fails a sign-up.
  }

  const answer: ClaimResponse = isFounder
    ? {
        outcome: 'founder',
        founderNumber: row.founder_number!,
        businessName,
        contactVia: via,
        claimed: row.claimed,
        cap,
      }
    : { outcome: 'standard', businessName, contactVia: via, claimed: row.claimed, cap };
  return NextResponse.json(answer, { headers: NO_STORE });
}
