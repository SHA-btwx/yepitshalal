'use client';

import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { RestaurantCard } from './RestaurantCard';
import { RestaurantCardSkeleton } from './RestaurantCardSkeleton';
import { RadiusSelector } from './RadiusSelector';
import { UpgradePrompt } from './UpgradePrompt';
import { RestaurantPreviewCard } from './RestaurantPreviewCard';
import type { HalalClassification, SearchResultRestaurant } from '@/lib/types';

const RestaurantMap = dynamic(() => import('./RestaurantMap').then((m) => m.RestaurantMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-ink/40">Loading map…</div>,
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
  { value: 'fully_halal', label: '🟢 Fully Halal' },
  { value: 'halal_options', label: '🟡 Halal Options' },
  { value: 'unverified', label: '⚪ Unverified' },
];

export function SearchView({ lat, lng, mode, label, initialResults, initialIsYepPlus }: SearchViewProps) {
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

  useEffect(() => {
    runSearch(radiusMiles, classifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMiles, classifications]);

  function toggleClassification(value: HalalClassification) {
    setClassifications((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-0 sm:px-6 sm:py-4">
      <div className="border-b border-black/5 bg-paper px-4 py-3 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Restaurants near</p>
            <p className="font-display text-base font-semibold text-ink">{label}</p>
          </div>
          <div className="flex rounded-full bg-black/5 p-1 sm:hidden">
            <button
              onClick={() => setMobileView('list')}
              className={clsx('rounded-full px-3 py-1 text-xs font-semibold', mobileView === 'list' ? 'bg-white shadow-sm' : 'text-ink/50')}
            >
              List
            </button>
            <button
              onClick={() => setMobileView('map')}
              className={clsx('rounded-full px-3 py-1 text-xs font-semibold', mobileView === 'map' ? 'bg-white shadow-sm' : 'text-ink/50')}
            >
              Map
            </button>
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

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {CLASSIFICATION_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => toggleClassification(f.value)}
              className={clsx(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                classifications.includes(f.value)
                  ? 'border-ink bg-ink text-white'
                  : 'border-black/10 bg-white text-ink/60 hover:border-ink/30'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!isYepPlus && (
        <div className="px-4 pt-3 sm:px-0">
          <p className="text-xs text-ink/45">
            Free plan: we show places within {freeCapMiles} mile{freeCapMiles !== 1 ? 's' : ''}
            {mode === 'current_location' ? ' of you.' : ' of here.'}
          </p>
        </div>
      )}

      {showUpgrade && (
        <div className="px-4 pt-3 sm:px-0">
          <UpgradePrompt />
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-4 sm:mt-4 sm:grid-cols-[1fr_1.1fr] sm:px-0">
        <div className={clsx('flex flex-col gap-2.5 px-4 sm:px-0', mobileView === 'map' && 'hidden sm:flex')}>
          {loading && (
            <>
              <RestaurantCardSkeleton />
              <RestaurantCardSkeleton />
              <RestaurantCardSkeleton />
            </>
          )}
          {!loading && results.length === 0 && (
            <p className="py-10 text-center text-sm text-ink/40">
              No halal restaurants here yet. Try a bigger area, or search somewhere else.
            </p>
          )}
          {!loading &&
            results.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
          {!isYepPlus && results.length > 0 && (
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
          />
          {selected && <RestaurantPreviewCard restaurant={selected} onClose={() => setSelected(null)} />}
        </div>
      </div>
    </div>
  );
}
