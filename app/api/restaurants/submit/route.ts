import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 7)
  );
}

function toTriState(value: FormDataEntryValue | null): boolean | null {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

const UK_POSTCODE_REGEX = /([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

// Free, keyless, no billing risk (postcodes.io is an open-data UK government-backed
// service) — used to place the pin at the right place instead of a London-centre
// placeholder. Falls back to that placeholder if no postcode is found or the
// lookup fails; the admin corrects it during verification either way.
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const match = address.match(UK_POSTCODE_REGEX);
  if (!match) return null;
  const postcode = `${match[1]}${match[2]}`;
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== 200 || !json?.result) return null;
    return { lat: json.result.latitude, lng: json.result.longitude };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const form = await request.formData();

  // honeypot: a hidden field real users never fill in
  if (form.get('company_website')) {
    return NextResponse.json({ ok: true });
  }

  const name = String(form.get('name') ?? '').trim();
  const address = String(form.get('address') ?? '').trim();
  if (!name || !address) {
    return NextResponse.json({ error: 'Restaurant name and address are required.' }, { status: 400 });
  }

  const geocoded = await geocodeAddress(address);

  const supabase = createServerSupabase();

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({
      name,
      slug: slugify(name),
      address,
      phone: String(form.get('phone') ?? '') || null,
      website_url: String(form.get('website') ?? '') || null,
      halal_classification: 'unverified',
      data_source: 'owner_submitted',
      // Geocoded from a UK postcode in the submitted address when possible; falls back
      // to a London-centre placeholder (the admin corrects it during verification) when
      // no postcode was found or the lookup failed.
      location: geocoded
        ? `SRID=4326;POINT(${geocoded.lng} ${geocoded.lat})`
        : 'SRID=4326;POINT(-0.1278 51.5074)',
    })
    .select('id, slug')
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: restaurantError?.message ?? 'Could not save restaurant.' }, { status: 500 });
  }

  const cuisineId = form.get('cuisine_id');
  if (cuisineId) {
    await supabase.from('restaurant_cuisines').insert({
      restaurant_id: restaurant.id,
      cuisine_id: Number(cuisineId),
    });
  }

  const instagram = String(form.get('instagram') ?? '').trim();

  await supabase.from('restaurant_claims').insert({
    restaurant_id: restaurant.id,
    submitter_type: 'owner',
    contact_name: String(form.get('contact_name') ?? '') || null,
    contact_email: String(form.get('contact_email') ?? '') || null,
    all_meat_halal: toTriState(form.get('all_meat_halal')),
    serves_non_halal_meat: toTriState(form.get('serves_non_halal_meat')),
    serves_pork: toTriState(form.get('serves_pork')),
    serves_alcohol: toTriState(form.get('serves_alcohol')),
    has_certification: toTriState(form.get('has_certification')),
    certification_body: String(form.get('certification_body') ?? '') || null,
    evidence_note: instagram ? `Instagram: ${instagram}` : null,
  });

  return NextResponse.json({ ok: true, slug: restaurant.slug });
}
