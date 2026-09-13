import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { SearchView } from '@/components/SearchView';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { lat?: string; lng?: string; mode?: string; label?: string };
}) {
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    redirect('/');
  }

  const mode = searchParams.mode === 'searched_location' ? 'searched_location' : 'current_location';
  const label = searchParams.label || 'your area';
  const freeCapMiles = mode === 'current_location' ? 1 : 0.5;

  const supabase = createServerSupabase();
  const [{ data: results }, { data: isYepPlus }] = await Promise.all([
    supabase.rpc('search_restaurants', {
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: Math.round(freeCapMiles * 1609.34),
      p_mode: mode,
      p_classification: null,
      p_cuisine_ids: null,
      p_query: null,
    }),
    supabase.rpc('is_current_user_yep_plus'),
  ]);

  return (
    <SearchView
      // Keyed by location: moving from one search to another inside the app
      // (a suggested nearby area, say) keeps this component mounted, and its
      // state is only seeded from these props on first mount. Without the key
      // the new place shows the previous place's results under its own name.
      key={`${lat},${lng},${mode}`}
      lat={lat}
      lng={lng}
      mode={mode}
      label={label}
      initialResults={results ?? []}
      initialIsYepPlus={Boolean(isYepPlus)}
    />
  );
}
