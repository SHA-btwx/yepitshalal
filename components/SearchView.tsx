'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { RestaurantCard } from './RestaurantCard';
import { RestaurantCardSkeleton } from './RestaurantCardSkeleton';
import { RadiusSelector } from './RadiusSelector';
import { UpgradePrompt } from './UpgradePrompt';
import { RestaurantPreviewCard } from './RestaurantPreviewCard';
import { HALAL_DOT_COLOR } from './halalColors';
import { ListIcon, MapIcon, MapPinIcon, SearchIcon } from './icons';
import type { HalalClassification, SearchResultRestaurant } from '@/lib/types';

const RestaurantMap = dynamic(() => import('./RestaurantMap').then((m) => m.RestaurantMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted">Loading map…</div>
  ),
});

interface SearchViewProps {
  lat: number;
  lng: number;
  mode: 'current_location' | 'searched_location';
  label: string;
  initialResults: SearchResultRestaurant[];
  initialIsYepPlus: boolean;
}

const CLASSIFICATION_FILTERS: { value: HalalClassification; label: string }[] = [
  { value: 'fully_halal', label: 'Fully Halal' },
  { value: 'halal_options', label: 'Halal Options' },
  { value: 'unverified', label: 'Unverified' },
];

export function SearchView({
  lat,
  lng,
  mode,
  label,
  initialResults,
  initialIsYepPlus,
}: SearchViewProps) {
  const freeCapMiles = mode === 'current_location' ? 1 : 0.5;
  const [results, setResults] = useState(initialResults);
  const [isYepPlus, setIsYepPlus] = useState(initialIsYepPlus);
  const [radiusMiles, setRadiusMiles] = useState(freeCapMiles);
  const [classifications, setClassifications] = useState<HalalClassification[]>([]);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<SearchResultRestaurant | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(
    async (miles: number, filters: HalalClassification[]) => {
      setLoading(true);
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        mode,
        radius_miles: String(miles),
      });
      if (filters.length) params.set('classification', filters.join(','));
      const res = await fetch(`/api/search?${params.toString()}`);
      const json = await res.json();
      setResults(json.results ?? []);
      setIsYepPlus(Boolean(json.is_yep_plus));
      setLoading(false);
    },
    [lat, lng, mode]
  );

  // The server already rendered results for the default radius with no filters.
  // Re-running that identical query on mount threw them away and flashed
  // skeletons over content the user could already see, so the first pass is
  // skipped and the effect only fires on a real filter/radius change.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    runSearch(radiusMiles, classifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMiles, classifications]);

  // A map that was display:none while MapLibre initialised has a zero-height
  // canvas; it has to re-measure the moment the mobile toggle reveals it.
  const [resizeSignal, setResizeSignal] = useState(0);
  useEffect(() => {
    if (mobileView === 'map') setResizeSignal((n) => n + 1);
  }, [mobileView]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  function toggleClassification(value: HalalClassification) {
    setSelected(null);
    setClassifications((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const filtered = classifications.length > 0;
  const skeletonCount = Math.min(Math.max(results.length, 3), 6);
  const radiusLabel = radiusMiles === 999 ? 'London' : `${radiusMiles} mi`;

  return (
    <div className="mx-auto max-w-6xl sm:px-6 sm:py-4">
      <div className="sticky top-14 z-20 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:static sm:rounded-2xl sm:border sm:px-5">
        {/* Stacked on a phone: at 375px the label, "Change" and the view toggle
            fought for one row and the location truncated to three characters. */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
              Halal restaurants near
            </p>
            <h1 className="flex items-center gap-1.5 font-display text-lg font-semibold text-ink">
              <MapPinIcon className="h-4 w-4 shrink-0 text-accent-ink" />
              <span className="truncate">{label}</span>
            </h1>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
            {/* Previously the only way to search elsewhere was the browser back
                button — a dead end once you had arrived from a shared link. */}
            <Link
              href="/"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-ink/75 transition hover:border-ink/30 hover:text-ink"
            >
              <SearchIcon className="h-4 w-4" />
              Change
            </Link>

            <div
              role="group"
              aria-label="Result view"
              className="flex rounded-full bg-black/[0.06] p-1 sm:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileView('list')}
                aria-pressed={mobileView === 'list'}
                className={clsx(
                  'inline-flex min-h-[32px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition',
                  mobileView === 'list' ? 'bg-white text-ink shadow-sm' : 'text-muted'
                )}
              >
                <ListIcon className="h-4 w-4" />
                List
              </button>
              <button
                type="button"
                onClick={() => setMobileView('map')}
                aria-pressed={mobileView === 'map'}
                className={clsx(
                  'inline-flex min-h-[32px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition',
                  mobileView === 'map' ? 'bg-white text-ink shadow-sm' : 'text-muted'
                )}
              >
                <MapIcon className="h-4 w-4" />
                Map
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <RadiusSelector
            isYepPlus={isYepPlus}
            freeCapMiles={freeCapMiles}
            selectedMiles={radiusMiles}
            onSelect={setRadiusMiles}
            onLockedSelect={() => setShowUpgrade(true)}
          />
        </div>

        <div
          role="group"
          aria-label="Filter by halal status"
          className="no-scrollbar rail-fade mt-2 flex gap-2 overflow-x-auto pb-0.5 sm:[mask-image:none]"
        >
          {CLASSIFICATION_FILTERS.map((f) => {
            const on = classifications.includes(f.value);
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => toggleClassification(f.value)}
                aria-pressed={on}
                className={clsx(
                  'inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition',
                  on
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-white text-ink/75 hover:border-ink/30 hover:text-ink'
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ background: HALAL_DOT_COLOR[f.value] }}
                  aria-hidden="true"
                />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-3 sm:px-0">
        {/* Announced politely so the result count reaches a screen-reader user
            without yanking focus away from the filter they just toggled. */}
        <p role="status" aria-live="polite" className="text-[13px] font-medium text-ink/75">
          {loading
            ? 'Searching…'
            : `${results.length} ${results.length === 1 ? 'place' : 'places'} within ${radiusLabel}`}
        </p>
        {!isYepPlus && (
          <p className="text-xs text-subtle">
            Free plan: up to {freeCapMiles} mile{freeCapMiles !== 1 ? 's' : ''}
            {mode === 'current_location' ? ' from you' : ' from here'}
          </p>
        )}
      </div>

      {showUpgrade && (
        <div className="px-4 pt-3 sm:px-0">
          <UpgradePrompt />
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-4 sm:mt-4 sm:grid-cols-[minmax(0,1fr)_1.1fr]">
        <div
          aria-busy={loading}
          className={clsx(
            'flex flex-col gap-2.5 px-4 sm:px-0',
            mobileView === 'map' && 'hidden sm:flex'
          )}
        >
          {/* The cards are h3s; without this the outline jumped h1 → h3 and a
              screen reader lost the level that says "these are the results". */}
          <h2 className="sr-only">Results</h2>

          {loading &&
            Array.from({ length: skeletonCount }).map((_, i) => <RestaurantCardSkeleton key={i} />)}

          {!loading && results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/10 px-6 py-12 text-center">
              <MapPinIcon className="mx-auto h-8 w-8 text-subtle" />
              <p className="mt-3 font-display text-base font-semibold text-ink">Nothing here yet</p>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
                {filtered
                  ? 'No places match these filters in this area. Try clearing them, or widen the radius.'
                  : 'We have no halal restaurants listed around here yet. Try a wider radius, or another part of London.'}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {filtered && (
                  <button
                    type="button"
                    onClick={() => setClassifications([])}
                    className="inline-flex min-h-[40px] items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink/30"
                  >
                    Clear filters
                  </button>
                )}
                <Link
                  href="/submit-restaurant"
                  className="inline-flex min-h-[40px] items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-accent-ink"
                >
                  Add a restaurant
                </Link>
              </div>
            </div>
          )}

          {!loading &&
            results.map((r, i) => <RestaurantCard key={r.id} restaurant={r} priority={i < 3} />)}

          {!isYepPlus && !loading && results.length > 0 && (
            <div className="mt-2">
              <UpgradePrompt compact />
            </div>
          )}
        </div>

        <div
          className={clsx(
            'relative h-[70vh] overflow-hidden bg-halal-unverifiedSoft sm:sticky sm:top-[4.5rem] sm:h-[calc(100vh-6rem)] sm:rounded-2xl',
            mobileView === 'list' && 'hidden sm:block'
          )}
        >
          <RestaurantMap
            center={{ lat, lng }}
            restaurants={results}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            resizeSignal={resizeSignal}
          />

          {/* Map pins carry their status in colour alone; this legend is what
              makes them readable, colour vision differences included. */}
          <ul className="pointer-events-none absolute left-3 top-3 z-10 space-y-1 rounded-xl bg-white/90 px-3 py-2 text-xs font-medium text-ink shadow-md ring-1 ring-black/5 backdrop-blur">
            {CLASSIFICATION_FILTERS.map((f) => (
              <li key={f.value} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-inset ring-white"
                  style={{ background: HALAL_DOT_COLOR[f.value] }}
                  aria-hidden="true"
                />
                {f.label}
              </li>
            ))}
          </ul>

          {selected && (
            <RestaurantPreviewCard restaurant={selected} onClose={() => setSelected(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
