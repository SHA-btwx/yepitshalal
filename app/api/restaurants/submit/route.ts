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
      // London-centre placeholder until the admin confirms exact coordinates during verification —
      // geocoding a free-text address is a later enhancement, not required to accept the submission.
      location: 'SRID=4326;POINT(-0.1278 51.5074)',
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
