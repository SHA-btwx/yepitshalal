'use server';

import { revalidatePath } from 'next/cache';
import { createAdminSupabase } from './supabase/admin';
import { requireAdmin } from './require-admin';

export async function publishVerification(requestId: string, formData: FormData) {
  await requireAdmin();
  const supabase = createAdminSupabase();

  const { data: request } = await supabase
    .from('verification_requests')
    .select('id, restaurant_id')
    .eq('id', requestId)
    .single();
  if (!request) throw new Error('Verification request not found.');

  const classification = String(formData.get('classification'));
  const notes = String(formData.get('notes') ?? '');
  const outcome = classification === 'unverified' ? 'unable_to_verify' : 'verified';

  function tri(name: string): boolean | null {
    const v = formData.get(name);
    if (v === 'yes') return true;
    if (v === 'no') return false;
    return null;
  }

  const facts = {
    restaurant_id: request.restaurant_id,
    all_meat_halal: tri('all_meat_halal'),
    serves_non_halal_meat: tri('serves_non_halal_meat'),
    serves_pork: tri('serves_pork'),
    serves_alcohol: tri('serves_alcohol'),
    has_certification: tri('has_certification'),
    certification_body: String(formData.get('certification_body') ?? '') || null,
    verification_notes: notes || null,
    verified_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
    next_review_due_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_outcome: outcome,
  };

  await supabase.from('restaurant_halal_facts').upsert(facts, { onConflict: 'restaurant_id' });

  await supabase
    .from('restaurants')
    .update({ halal_classification: classification })
    .eq('id', request.restaurant_id);

  await supabase.from('verification_history').insert({
    restaurant_id: request.restaurant_id,
    verification_request_id: request.id,
    classification_result: classification,
    facts_snapshot: facts,
  });

  await supabase
    .from('verification_requests')
    .update({
      status: classification === 'unverified' ? 'unable_to_verify' : 'completed',
      outcome_classification: classification,
      completed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  revalidatePath('/admin/queue');
  revalidatePath(`/admin/queue/${requestId}`);
}

export async function deleteRestaurant(restaurantId: string) {
  await requireAdmin();
  const supabase = createAdminSupabase();
  await supabase.from('restaurants').delete().eq('id', restaurantId);
  revalidatePath('/admin/restaurants');
}

export async function updateRestaurant(restaurantId: string, formData: FormData) {
  await requireAdmin();
  const supabase = createAdminSupabase();
  await supabase
    .from('restaurants')
    .update({
      name: String(formData.get('name') ?? ''),
      address: String(formData.get('address') ?? ''),
      description: String(formData.get('description') ?? '') || null,
      phone: String(formData.get('phone') ?? '') || null,
      website_url: String(formData.get('website_url') ?? '') || null,
      menu_url: String(formData.get('menu_url') ?? '') || null,
    })
    .eq('id', restaurantId);
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  revalidatePath(`/restaurant`);
}

export async function addVideo(restaurantId: string, formData: FormData) {
  await requireAdmin();
  const supabase = createAdminSupabase();
  const embedUrl = String(formData.get('embed_url') ?? '').trim();
  if (!embedUrl) return;
  const provider = embedUrl.includes('tiktok')
    ? 'tiktok'
    : embedUrl.includes('instagram')
    ? 'instagram'
    : 'youtube';
  await supabase.from('restaurant_videos').insert({
    restaurant_id: restaurantId,
    provider,
    embed_url: embedUrl,
    caption: String(formData.get('caption') ?? '') || null,
  });
  revalidatePath(`/admin/restaurants/${restaurantId}`);
}

export async function deletePhoto(restaurantId: string, photoId: string) {
  await requireAdmin();
  const supabase = createAdminSupabase();
  await supabase.from('restaurant_photos').delete().eq('id', photoId);
  revalidatePath(`/admin/restaurants/${restaurantId}`);
}

export async function setPrimaryPhoto(restaurantId: string, photoId: string) {
  await requireAdmin();
  const supabase = createAdminSupabase();
  await supabase.from('restaurant_photos').update({ is_primary: false }).eq('restaurant_id', restaurantId);
  await supabase.from('restaurant_photos').update({ is_primary: true }).eq('id', photoId);
  revalidatePath(`/admin/restaurants/${restaurantId}`);
}

export async function createOffer(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminSupabase();
  const restaurantId = String(formData.get('restaurant_id') ?? '') || null;
  await supabase.from('offers').insert({
    restaurant_id: restaurantId,
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? '') || null,
    yep_plus_only: formData.get('yep_plus_only') === 'on',
    is_early_access: formData.get('is_early_access') === 'on',
    voucher_code: String(formData.get('voucher_code') ?? '') || null,
    ends_at: String(formData.get('ends_at') ?? '') || null,
  });
  revalidatePath('/admin/offers');
}

export async function deleteOffer(offerId: string) {
  await requireAdmin();
  const supabase = createAdminSupabase();
  await supabase.from('offers').delete().eq('id', offerId);
  revalidatePath('/admin/offers');
}
