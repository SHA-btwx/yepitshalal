import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { milesToMeters } from '@/lib/types';

// Single search endpoint. Radius enforcement happens inside search_restaurants()
// itself (server-side, keyed off the caller's real subscription row) — this route
// is a thin pass-through and must never be the place radius limits are "checked."
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const mode = searchParams.get('mode') === 'searched_location' ? 'searched_location' : 'current_location';
  const radiusMiles = Number(searchParams.get('radius_miles')) || undefined;
  const classificationParam = searchParams.get('classification');
  const classification = classificationParam ? classificationParam.split(',') : null;
  const query = searchParams.get('q') || null;

  const supabase = createServerSupabase();

  const [{ data, error }, { data: isYepPlus }] = await Promise.all([
    supabase.rpc('search_restaurants', {
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: radiusMiles ? milesToMeters(radiusMiles) : 999999999,
      p_mode: mode,
      p_classification: classification,
      p_cuisine_ids: null,
      p_query: query,
    }),
    supabase.rpc('is_current_user_yep_plus'),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = data ?? [];
  const effectiveRadiusMeters = results[0]?.effective_radius_meters ??
    (isYepPlus ? null : mode === 'current_location' ? 1609 : 805);

  return NextResponse.json({
    results,
    is_yep_plus: Boolean(isYepPlus),
    effective_radius_meters: effectiveRadiusMeters,
    requested_radius_meters: radiusMiles ? milesToMeters(radiusMiles) : null,
  });
}
