import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { requireRestaurantAccess, assertSlotAvailable } from '@/lib/require-restaurant';

const BUCKET = 'restaurant-reels';
const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

/**
 * Mints a one-shot signed upload URL for a reel video.
 *
 * The restaurant-photos bucket has an "Anyone can upload" storage policy, which
 * means any visitor can push files into it. This bucket deliberately has no
 * public insert policy at all: the only way in is a signed URL, and one is only
 * issued after ownership and allowance have both been checked here. That keeps
 * the limit server-side, where the brief requires it — hiding the upload button
 * would not.
 */
export async function POST(request: Request) {
  let body: { restaurantId?: string; contentType?: string; fileName?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { restaurantId, contentType, fileName, size } = body;
  if (!restaurantId || !contentType || !fileName) {
    return NextResponse.json(
      { error: 'restaurantId, fileName and contentType are required.' },
      { status: 400 }
    );
  }

  if (!ALLOWED.has(contentType)) {
    return NextResponse.json(
      { error: 'Reels must be an MP4, MOV or WebM video.' },
      { status: 415 }
    );
  }
  if (typeof size === 'number' && size > MAX_BYTES) {
    return NextResponse.json({ error: 'Reels must be under 100 MB.' }, { status: 413 });
  }

  try {
    await requireRestaurantAccess(restaurantId);
    await assertSlotAvailable(restaurantId);
  } catch (e) {
    const message = (e as Error).message;
    const status = message.includes('signed in') ? 401 : message.includes('allowance') || message.includes('reel ') ? 409 : 403;
    return NextResponse.json({ error: message }, { status });
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '').slice(-60) || 'reel.mp4';
  const path = `${restaurantId}/${Date.now()}-${safeName}`;

  const supabase = createAdminSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not start upload.' }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    path: data.path,
    token: data.token,
    bucket: BUCKET,
    publicUrl: pub.publicUrl,
  });
}
