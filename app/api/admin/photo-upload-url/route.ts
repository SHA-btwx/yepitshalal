import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getAdminUserId } from '@/lib/require-admin';

const BUCKET = 'restaurant-photos';
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * One-shot signed upload URL for a restaurant photo, admins only.
 *
 * The bucket used to accept uploads from anyone. There is now no public insert
 * policy on it at all: a signed URL, issued here after the admin check, is the
 * only way a file gets in.
 */
export async function POST(request: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  let body: { restaurantId?: string; contentType?: string; fileName?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { restaurantId, contentType, fileName, size } = body;
  if (!restaurantId || !contentType || !fileName) {
    return NextResponse.json({ error: 'restaurantId, fileName and contentType are required.' }, { status: 400 });
  }
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: 'Photos must be JPEG, PNG or WebP.' }, { status: 415 });
  }
  if (typeof size === 'number' && size > MAX_BYTES) {
    return NextResponse.json({ error: 'Photos must be under 8 MB.' }, { status: 413 });
  }

  const supabase = createAdminSupabase();
  const { data: restaurant } = await supabase.from('restaurants').select('id').eq('id', restaurantId).maybeSingle();
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });

  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '').slice(-60) || 'photo.jpg';
  const path = `${restaurantId}/${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not start upload.' }, { status: 500 });
  }

  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
