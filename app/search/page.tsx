import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SearchView } from '@/components/SearchView';
import { runSearch } from '@/lib/search';

// Search result pages are for the person searching, not for search engines: the
// indexable versions of "halal restaurants near X" are the area pages.
export const metadata: Metadata = {
  title: 'Halal restaurants near you',
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { lat?: string; lng?: string; mode?: string; label?: string };
}) {
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) redirect('/');

  const mode = searchParams.mode === 'searched_location' ? 'searched_location' : 'current_location';
  const initial = await runSearch({ lat, lng, mode });

  return (
    <SearchView
      // Keyed by location: moving from one search to another inside the app
      // keeps this component mounted, and its state is only seeded from these
      // props on first mount. Without the key the new place would show the
      // previous place's results under its own name.
      key={`${lat},${lng},${mode}`}
      lat={lat}
      lng={lng}
      mode={mode}
      label={searchParams.label || 'your area'}
      initial={initial}
    />
  );
}
