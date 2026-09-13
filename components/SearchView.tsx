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
import {
  ArrowRightIcon,
  ListIcon,
  MapIcon,
  MapPinIcon,
  SearchIcon,
  HalalFullMark,
  HalalPartialMark,
  HalalUnknownMark,
} from './icons';
import { effectiveRadiusMeters, formatRadiusMiles } from '@/lib/types';
import type { HalalClassification, SearchResultRestaurant } from '@/lib/types';
import type { NearbyArea } from '@/app/api/nearby-areas/route';

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

// Same marks the cards use, so the filter row and the map legend read in the
// one visual language rather than a second colour-coded one.
const CLASSIFICATION_FILTERS: {
  value: HalalClassification;
  label: string;
  Mark: typeof HalalFullMark;
  tone: string;
}[] = [
  { value: 'fully_halal', label: 'Fully Halal', Mark: HalalFullMark, tone: 'text-halal-full' },
  {
    value: 'halal_options',
    label: 'Halal Options',
    Mark: HalalPartialMark,
    tone: 'text-halal-partial',
  },
  { value: 'unverified', label: 'Unverified', Mark: HalalUnknownMark, tone: 'text-halal-unverified' },
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
  // The radius the server reports it actually used. Null while a search is in
  // flight, when the locally derived value (same clamp) is the honest answer.
  const [serverRadiusMeters, setServerRadiusMeters] = useState<number | null>(null);
  // A locked tier the user tapped. Never touches the query, only the map.
  const [previewMiles, setPreviewMiles] = useState<number | null>(null);
  // Null while loading; an empty array means we looked and there is nothing nearby.
  const [nearbyAreas, setNearbyAreas] = useState<NearbyArea[] | null>(null);

  // One clamp, shared with the API route and mirroring search_restaurants(), so
  // the ring on the map and the rows in the list always describe one radius.
  const coverageMeters =
    serverRadiusMeters ?? effectiveRadiusMeters({ requestedMiles: radiusMiles, mode, isYepPlus });

  // What that tier would cover *with* Yep+, which is the whole point of showing
  // it. Capped the same way, so "Anywhere" previews 50 miles rather than 999.
  const rawPreviewMeters =
    previewMiles === null
      ? null
      : effectiveRadiusMeters({ requestedMiles: previewMiles, mode, isYepPlus: true });
  const previewMeters = rawPreviewMeters && rawPreviewMeters > coverageMeters ? rawPreviewMeters : null;

  // Only fetched for an unfiltered search that found nothing, and keyed to the
  // radius actually searched, so a later radius change asks again.
  const emptyAndUnfiltered = !loading && results.length === 0 && classifications.length === 0;
  useEffect(() => {
    if (!emptyAndUnfiltered) {
      setNearbyAreas(null);
      return;
    }
    let cancelled = false;
    setNearbyAreas(null);
    fetch(`/api/nearby-areas?lat=${lat}&lng=${lng}&radius_meters=${coverageMeters}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setNearbyAreas(json.areas ?? []);
      })
      .catch(() => {
        if (!cancelled) setNearbyAreas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [emptyAndUnfiltered, lat, lng, coverageMeters]);

  const runSearch = useCallback(
    async (miles: number, filters: HalalClassification[]) => {
      setLoading(true);
      // Dropped rather than left stale: until the server answers, the locally
      // derived radius is the one matching the chip the user just pressed.
      setServerRadiusMeters(null);
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
      setServerRadiusMeters(
        typeof json.effective_radius_meters === 'number' ? json.effective_radius_meters : null
      );
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
  // Derived from the searched radius rather than the requested one, so the count
  // line, the map ring and the query can never tell three different stories.
  const radiusLabel = formatRadiusMiles(coverageMeters);

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
            previewMiles={previewMiles}
            onSelect={(miles) => {
              setRadiusMiles(miles);
              setPreviewMiles(null);
            }}
            onLockedSelect={(miles) => {
              setPreviewMiles(miles);
              setShowUpgrade(true);
            }}
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
                <f.Mark
                  className={clsx('h-4 w-4 shrink-0', on ? 'text-white' : f.tone)}
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

          {!loading && results.length === 0 && filtered && (
            <div className="rounded-2xl border border-dashed border-black/10 px-6 py-12 text-center">
              <MapPinIcon className="mx-auto h-8 w-8 text-subtle" />
              <p className="mt-3 font-display text-base font-semibold text-ink">No matches for these filters</p>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
                {/* "Widen the radius" is only advice when the visitor can act on it. */}
                {isYepPlus
                  ? 'Clear the filters, or try a wider radius.'
                  : `Nothing within ${radiusLabel} matches. Clear the filters to see everything here.`}
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setClassifications([])}
                  className="inline-flex min-h-[40px] items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-accent-ink"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}

          {/* Not a dead end: the nearest areas that do have places, each one an
              ordinary search at the usual radius, with the count a visitor will
              actually see when they get there. */}
          {!loading && results.length === 0 && !filtered && (
            <div className="rounded-2xl border border-dashed border-black/10 px-5 py-8 sm:px-6">
              <div className="text-center">
                <MapPinIcon className="mx-auto h-8 w-8 text-subtle" />
                <p className="mt-3 font-display text-base font-semibold text-ink">
                  Nothing listed within {radiusLabel} yet
                </p>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
                  {nearbyAreas && nearbyAreas.length === 0
                    ? 'We have nothing listed near here yet.'
                    : isYepPlus
                      ? 'Try a wider radius, or one of these areas nearby.'
                      : 'These areas nearby have places listed.'}
                </p>
              </div>

              {nearbyAreas === null && (
                <ul aria-hidden="true" className="mt-5 space-y-2">
                  {[0, 1, 2].map((n) => (
                    <li key={n} className="h-[58px] animate-pulse rounded-xl bg-black/[0.04]" />
                  ))}
                </ul>
              )}

              {nearbyAreas && nearbyAreas.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {nearbyAreas.map((area) => {
                    const where = `${area.label}, ${area.outcode}`;
                    return (
                      <li key={area.outcode}>
                        <Link
                          href={`/search?lat=${area.lat}&lng=${area.lng}&mode=searched_location&label=${encodeURIComponent(where)}`}
                          className="group flex min-h-[58px] items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 transition hover:border-ink/25 hover:shadow-sm"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                            <MapPinIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{area.label}</span>
                            <span className="block truncate text-xs text-muted">
                              {area.outcode} · {area.places} {area.places === 1 ? 'place' : 'places'} ·{' '}
                              {(area.distance_meters / 1609.34).toFixed(1)} mi away
                            </span>
                          </span>
                          <ArrowRightIcon className="h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-ink" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-5 text-center text-sm text-muted">
                Know somewhere halal around here?{' '}
                <Link href="/submit-restaurant" className="font-semibold text-accent-ink underline underline-offset-2">
                  Add it
                </Link>
              </p>
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
            coverageRadiusMeters={coverageMeters}
            previewRadiusMeters={previewMeters}
          />

          {/* One overlay, not two. The coverage line answers "what am I even
              looking at" and so comes first; the pin key below it is what makes
              the markers readable, colour vision differences included. */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-xl bg-white/92 px-3 py-2.5 text-xs font-medium text-ink shadow-md ring-1 ring-black/5 backdrop-blur">
            <p className="flex items-center gap-2 whitespace-nowrap">
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-halal-full bg-halal-full/15"
              />
              Search area · {radiusLabel}
            </p>

            {/* Only ever an outline, and never any pins: there is nothing inside
                this ring that is in the results, and it must not look like
                there is. */}
            {previewMeters && (
              <p className="pointer-events-auto mt-1.5 flex items-center gap-2 whitespace-nowrap text-ink/70">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-dashed border-ink/50"
                />
                Yep+ would reach {formatRadiusMiles(previewMeters)}
                <button
                  type="button"
                  onClick={() => setPreviewMiles(null)}
                  className="ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink underline underline-offset-2 transition hover:bg-black/[0.04]"
                >
                  Hide
                </button>
              </p>
            )}

            <ul className="mt-2 space-y-1 border-t border-line pt-2">
              {CLASSIFICATION_FILTERS.map((f) => (
                <li key={f.value} className="flex items-center gap-1.5">
                  <f.Mark className={clsx('h-4 w-4 shrink-0', f.tone)} />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          {selected && (
            <RestaurantPreviewCard restaurant={selected} onClose={() => setSelected(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
