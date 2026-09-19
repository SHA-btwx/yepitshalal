'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { RestaurantCard } from './RestaurantCard';
import { RestaurantCardSkeleton } from './RestaurantCardSkeleton';
import { RadiusSelector } from './RadiusSelector';
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
  HalalNotCheckedMark,
  InfoIcon,
} from './icons';
import { DEFAULT_RADIUS_MILES, effectiveRadiusMeters, formatRadiusMiles } from '@/lib/types';
import type { HalalStatus, SearchResultRestaurant, TierCount } from '@/lib/types';
import type { SearchResponse } from '@/lib/search';
import type { NearbyArea } from '@/app/api/nearby-areas/route';

const RestaurantMap = dynamic(() => import('./RestaurantMap').then((m) => m.RestaurantMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted">Loading map…</div>,
});

interface SearchViewProps {
  lat: number;
  lng: number;
  mode: 'current_location' | 'searched_location';
  label: string;
  initial: SearchResponse;
}

// Same marks the cards use, so the filter row and the map legend read in the
// one visual language rather than a second colour-coded one.
const CLASSIFICATION_FILTERS: {
  value: HalalStatus;
  label: string;
  Mark: typeof HalalFullMark;
  tone: string;
}[] = [
  { value: 'fully_halal', label: 'Fully Halal', Mark: HalalFullMark, tone: 'text-halal-full' },
  { value: 'halal_options', label: 'Halal Options', Mark: HalalPartialMark, tone: 'text-halal-partial' },
  { value: 'unverified', label: 'Unverified', Mark: HalalUnknownMark, tone: 'text-halal-unverified' },
  { value: 'unknown', label: 'Not checked yet', Mark: HalalNotCheckedMark, tone: 'text-subtle' },
];

const PAGE = 30;

export function SearchView({ lat, lng, mode, label, initial }: SearchViewProps) {
  const [results, setResults] = useState<SearchResultRestaurant[]>(initial.results);
  const [totalCount, setTotalCount] = useState(initial.totalCount);
  const [tierCounts, setTierCounts] = useState<TierCount[]>(initial.tierCounts);
  // One mile to start: near enough to walk to, and the chip for it is selected.
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS_MILES);
  const [classifications, setClassifications] = useState<HalalStatus[]>([]);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  // Evidence first by default: someone looking for halal food wants the places
  // with a reason to believe first, nearest first within each label.
  const [sort, setSort] = useState<'distance' | 'evidence'>('evidence');
  const [visible, setVisible] = useState(PAGE);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<SearchResultRestaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // The radius the server reports it actually used. Null while a search is in
  // flight, when the locally derived value (same clamp) is the honest answer.
  const [serverRadiusMeters, setServerRadiusMeters] = useState<number | null>(initial.effectiveRadiusMeters);
  const [nearbyAreas, setNearbyAreas] = useState<NearbyArea[] | null>(null);
  // Set when the radius was widened automatically, so the page can say so.
  const [expandedFrom, setExpandedFrom] = useState<number | null>(null);
  const userChoseRadius = useRef(false);

  const coverageMeters = serverRadiusMeters ?? effectiveRadiusMeters(radiusMiles);

  const filtered = classifications.length > 0 || query.length > 0;

  const run = useCallback(
    async (miles: number, filters: HalalStatus[], q: string, s: 'distance' | 'evidence') => {
      setLoading(true);
      setFailed(false);
      setServerRadiusMeters(null);
      const params = new URLSearchParams({ lat: String(lat), lng: String(lng), mode, radius_miles: String(miles), sort: s });
      if (filters.length) params.set('classification', filters.join(','));
      if (q) params.set('q', q);
      try {
        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error();
        const json: SearchResponse = await res.json();
        setResults(json.results);
        setTotalCount(json.totalCount);
        setTierCounts(json.tierCounts);
        setServerRadiusMeters(json.effectiveRadiusMeters);
        setVisible(PAGE);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [lat, lng, mode]
  );

  // The first view was rendered on the server. Re-running it on mount would only
  // flash skeletons over results already on screen.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    run(radiusMiles, classifications, query, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMiles, classifications, query, sort]);

  // Typing filters after a pause, not on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput.trim()), 350);
    return () => clearTimeout(t);
  }, [queryInput]);

  // Thin area: widen to the nearest radius that has something, and say so.
  // Nobody gets an empty page when there is food a mile further out.
  useEffect(() => {
    if (loading || userChoseRadius.current || filtered || totalCount > 0) return;
    const next = tierCounts.find((t) => t.meters > coverageMeters && t.places > 0);
    if (!next) return;
    setExpandedFrom(radiusMiles);
    setRadiusMiles(next.miles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, totalCount, tierCounts]);

  // Nearby areas for a search that found nothing and was not narrowed by filters.
  const emptyAndUnfiltered = !loading && totalCount === 0 && !filtered;
  useEffect(() => {
    if (!emptyAndUnfiltered) {
      setNearbyAreas(null);
      return;
    }
    let cancelled = false;
    setNearbyAreas(null);
    fetch(`/api/nearby-areas?lat=${lat}&lng=${lng}&radius_meters=${coverageMeters}`)
      .then((res) => res.json())
      .then((json) => !cancelled && setNearbyAreas(json.areas ?? []))
      .catch(() => !cancelled && setNearbyAreas([]));
    return () => {
      cancelled = true;
    };
  }, [emptyAndUnfiltered, lat, lng, coverageMeters]);

  // A map that was display:none while MapLibre initialised has a zero-height
  // canvas; it has to re-measure the moment the mobile toggle reveals it.
  const [resizeSignal, setResizeSignal] = useState(0);
  useEffect(() => {
    if (mobileView === 'map') setResizeSignal((n) => n + 1);
  }, [mobileView]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  function toggleClassification(value: HalalStatus) {
    setSelected(null);
    setClassifications((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const radiusLabel = formatRadiusMiles(coverageMeters);
  const skeletonCount = Math.min(Math.max(results.length, 3), 6);
  // Of the places in range, how many have halal evidence. Same query as the count.
  const withEvidenceHere = tierCounts.find((t) => t.meters === coverageMeters)?.withEvidence ?? null;

  return (
    <div className="mx-auto max-w-6xl sm:px-6 sm:py-4">
      <div className="sticky top-14 z-20 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:static sm:rounded-2xl sm:border sm:px-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Halal restaurants near</p>
            <h1 className="flex items-center gap-1.5 font-display text-lg font-semibold text-ink">
              <MapPinIcon className="h-4 w-4 shrink-0 text-accent-ink" />
              <span className="truncate">{label}</span>
            </h1>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
            <Link
              href="/"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-ink/75 transition hover:border-ink/30 hover:text-ink"
            >
              <SearchIcon className="h-4 w-4" />
              Change
            </Link>
            <div role="group" aria-label="Result view" className="flex rounded-full bg-black/[0.06] p-1 sm:hidden">
              {(['list', 'map'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMobileView(v)}
                  aria-pressed={mobileView === v}
                  className={clsx(
                    'inline-flex min-h-[32px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold capitalize transition',
                    mobileView === v ? 'bg-white text-ink shadow-sm' : 'text-muted'
                  )}
                >
                  {v === 'list' ? <ListIcon className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <RadiusSelector
            selectedMiles={radiusMiles}
            onSelect={(miles) => {
              userChoseRadius.current = true;
              setExpandedFrom(null);
              setRadiusMiles(miles);
            }}
          />
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div role="group" aria-label="Filter by halal status" className="no-scrollbar rail-fade flex gap-2 overflow-x-auto pb-0.5 sm:[mask-image:none]">
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
                    on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink/75 hover:border-ink/30 hover:text-ink'
                  )}
                >
                  <f.Mark className={clsx('h-4 w-4 shrink-0', on ? 'text-white' : f.tone)} />
                  {f.label}
                </button>
              );
            })}
          </div>
          <label className="relative block sm:ml-auto sm:w-56">
            <span className="sr-only">Filter these results by name or cuisine</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Name or cuisine"
              className="min-h-[36px] w-full rounded-full border border-line bg-white py-1.5 pl-9 pr-3 text-[16px] text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-[13px]"
            />
          </label>
        </div>
      </div>

      {expandedFrom !== null && (
        <p className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent-ink sm:mx-0">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Nothing within {expandedFrom} {expandedFrom === 1 ? 'mile' : 'miles'}, so we&apos;re showing places within {radiusLabel}.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-3 sm:px-0">
        {/* Announced politely so the count reaches a screen-reader user without
            pulling focus from the control they just used. */}
        <p role="status" aria-live="polite" className="text-[13px] font-medium text-ink/75">
          {loading
            ? 'Searching…'
            : failed
              ? "Search didn't load. Try again."
              : `${totalCount} ${totalCount === 1 ? 'place' : 'places'} within ${radiusLabel}`}
          {!loading && !failed && totalCount > 0 && withEvidenceHere !== null && classifications.length === 0 && (
            <span className="font-normal text-muted">
              {' · '}
              {withEvidenceHere === totalCount ? 'all with halal evidence' : `${withEvidenceHere} with halal evidence`}
            </span>
          )}
        </p>
        {totalCount > 1 && !loading && (
          <div role="group" aria-label="Sort results" className="flex items-center gap-1 text-xs">
            <span className="text-subtle">Sort:</span>
            {(['evidence', 'distance'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                aria-pressed={sort === s}
                className={clsx(
                  'rounded-full px-2 py-1 font-semibold transition',
                  sort === s ? 'bg-ink text-white' : 'text-ink/70 hover:text-ink'
                )}
              >
                {s === 'distance' ? 'Nearest' : 'Evidence first'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:mt-4 sm:grid-cols-[minmax(0,1fr)_1.1fr]">
        <div aria-busy={loading} className={clsx('flex flex-col gap-2.5 px-4 sm:px-0', mobileView === 'map' && 'hidden sm:flex')}>
          <h2 className="sr-only">Results</h2>

          {loading && Array.from({ length: skeletonCount }).map((_, i) => <RestaurantCardSkeleton key={i} />)}

          {!loading && totalCount === 0 && filtered && (
            <div className="rounded-2xl border border-dashed border-black/10 px-6 py-12 text-center">
              <MapPinIcon className="mx-auto h-8 w-8 text-subtle" />
              <p className="mt-3 font-display text-base font-semibold text-ink">
                {query ? `Nothing matching “${query}” within ${radiusLabel}` : 'No matches for these filters'}
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
                Clear the filters, or try a wider radius.
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setClassifications([]);
                    setQueryInput('');
                    setQuery('');
                  }}
                  className="inline-flex min-h-[40px] items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-accent-ink"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}

          {/* Not a dead end: the nearest areas that do have places, each an
              ordinary search at the usual radius, with the count a visitor will
              see when they get there. */}
          {!loading && totalCount === 0 && !filtered && (
            <div className="rounded-2xl border border-dashed border-black/10 px-5 py-8 sm:px-6">
              <div className="text-center">
                <MapPinIcon className="mx-auto h-8 w-8 text-subtle" />
                <p className="mt-3 font-display text-base font-semibold text-ink">No places found within {radiusLabel} yet</p>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
                  {nearbyAreas && nearbyAreas.length === 0
                    ? "We don't know of any places near here yet."
                    : 'These areas nearby have places to eat.'}
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
                              {area.outcode} · {area.places} {area.places === 1 ? 'place' : 'places'} · {(area.distance_meters / 1609.34).toFixed(1)} mi away
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

          {!loading && results.slice(0, visible).map((r, i) => <RestaurantCard key={r.id} restaurant={r} priority={i < 3} />)}

          {!loading && results.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE)}
              className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-ink/30"
            >
              Show {Math.min(PAGE, results.length - visible)} more of {totalCount}
            </button>
          )}
          {!loading && totalCount > results.length && results.length <= visible && (
            <p className="text-center text-xs text-muted">
              Showing {results.length} of {totalCount}. Narrow the radius or add a filter to see the rest.
            </p>
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
          />

          {/* One overlay, not two. The coverage line answers "what am I looking
              at" and so comes first; the pin key below makes the markers
              readable, colour vision differences included. */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-xl bg-white/92 px-3 py-2.5 text-xs font-medium text-ink shadow-md ring-1 ring-black/5 backdrop-blur">
            <p className="flex items-center gap-2 whitespace-nowrap">
              <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-halal-full bg-halal-full/15" />
              Search area · {radiusLabel}
            </p>
            <ul className="mt-2 space-y-1 border-t border-line pt-2">
              {CLASSIFICATION_FILTERS.map((f) => (
                <li key={f.value} className="flex items-center gap-1.5">
                  <f.Mark className={clsx('h-4 w-4 shrink-0', f.tone)} />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          {selected && <RestaurantPreviewCard restaurant={selected} onClose={() => setSelected(null)} />}
        </div>
      </div>
    </div>
  );
}
