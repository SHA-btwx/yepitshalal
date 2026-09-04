'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { geocodePostcode } from '@/lib/geocode';
import { SearchIcon, CrosshairIcon } from './icons';

export function LocationSearchBar() {
  const router = useRouter();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'locating' | 'searching' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  function useCurrentLocation() {
    setError(null);
    setStatus('locating');
    if (!navigator.geolocation) {
      setError("This browser can't share your location. Type a postcode or area name instead.");
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
        setError("We couldn't get your location. Type a postcode or area name instead.");
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
      setError(`We couldn't find “${query}”. Try a London postcode or area name.`);
      setStatus('error');
      return;
    }
    router.push(
      `/search?lat=${result.lat}&lng=${result.lng}&mode=searched_location&label=${encodeURIComponent(result.label)}`
    );
  }

  const busy = status === 'searching' || status === 'locating';

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={handleSearch}
        role="search"
        className="flex items-center gap-1.5 rounded-full bg-white p-1.5 shadow-xl shadow-black/15 ring-1 ring-black/5 transition focus-within:ring-2 focus-within:ring-accent-ink"
      >
        <label htmlFor={inputId} className="sr-only">
          Search by postcode or area
        </label>
        <SearchIcon className="ml-3 h-5 w-5 shrink-0 text-subtle" />
        <input
          id={inputId}
          type="text"
          inputMode="search"
          autoComplete="postal-code"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-invalid={status === 'error' || undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder="Postcode or area"
          className="min-w-0 flex-1 bg-transparent py-3 pl-1.5 pr-1 text-[16px] text-ink placeholder:text-subtle focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink active:scale-[0.98] disabled:opacity-60"
        >
          {status === 'searching' ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div className="mt-3 flex items-center justify-center sm:justify-start">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          <CrosshairIcon className="h-[18px] w-[18px]" />
          {status === 'locating' ? 'Finding you…' : 'Use my location'}
        </button>
      </div>

      {/* role="alert" so the failure is announced, not just repainted. */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 rounded-xl bg-white/95 px-3.5 py-2.5 text-sm font-medium text-ink shadow-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
