'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { geocodePostcode } from '@/lib/geocode';

export function LocationSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'locating' | 'searching' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  function useCurrentLocation() {
    setError(null);
    setStatus('locating');
    if (!navigator.geolocation) {
      setError("We can't get your location. Try typing a postcode or area name instead.");
      setStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        router.push(
          `/search?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&mode=current_location&label=Your location`
        );
      },
      () => {
        setError("We couldn't get your location. Try typing a postcode or area name instead.");
        setStatus('error');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setStatus('searching');
    const result = await geocodePostcode(query);
    if (!result) {
      setError(`We couldn't find "${query}". Try a London postcode or area name.`);
      setStatus('error');
      return;
    }
    router.push(
      `/search?lat=${result.lat}&lng=${result.lng}&mode=searched_location&label=${encodeURIComponent(result.label)}`
    );
  }

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 rounded-full bg-white p-1.5 shadow-lg shadow-black/10 ring-1 ring-black/5 transition focus-within:shadow-xl focus-within:ring-2 focus-within:ring-accent/40"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Shoreditch, E1 6AN"
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[15px] text-ink placeholder:text-ink/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'searching'}
          className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-ink active:scale-[0.98] disabled:opacity-60"
        >
          {status === 'searching' ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={useCurrentLocation}
          disabled={status === 'locating'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/95 transition hover:text-white disabled:opacity-60"
        >
          <span aria-hidden>📍</span>
          {status === 'locating' ? 'Finding you…' : 'Use my location'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm font-medium text-white">{error}</p>}
    </div>
  );
}
