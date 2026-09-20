'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { PlaceSuggestion } from '@/app/api/places/suggest/route';

// The "which city?" field, with suggestions, so the answers can be counted.
//
// Built as a proper ARIA combobox rather than a div that happens to have a
// list under it: arrow keys move through the options, Enter takes the
// highlighted one, Escape closes without choosing, and the count of matches is
// announced. A sighted person gets Google's behaviour and everyone else gets
// the same field rather than a worse one.
//
// Typing something we have never heard of is still a valid answer. The
// suggestion is a convenience, not a gate: "anywhere in Scotland honestly" is
// a real thing to want and the form takes it, it just arrives unstructured.

export interface ChosenPlace {
  label: string;
  name: string;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  kind: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
}

export function PlaceAutocomplete({
  name,
  label,
  placeholder,
  className,
  onChoose,
  noResultsHint,
}: {
  /** Name of the hidden input carrying the typed text. */
  name: string;
  label: string;
  placeholder: string;
  className?: string;
  /** Called with the chosen place, or null when the text no longer matches one. */
  onChoose: (place: ChosenPlace | null) => void;
  noResultsHint?: string;
}) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Only the newest response may write to state: a slow "man" must never
  // overwrite the results for "manchester".
  const seq = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const mine = ++seq.current;
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/suggest?q=${encodeURIComponent(term)}`, { signal: ac.signal });
        const json = (await res.json()) as { results?: PlaceSuggestion[] };
        if (mine !== seq.current) return;
        setResults(json.results ?? []);
        setSearched(true);
        setActive(-1);
      } catch {
        /* Leave whatever is on screen; the field still takes free text. */
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [query]);

  // A click outside is a decision to stop choosing.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function choose(place: PlaceSuggestion) {
    setQuery(place.label);
    setOpen(false);
    setActive(-1);
    onChoose(place);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !results.length) {
      if (e.key === 'ArrowDown' && results.length) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      // Only swallow Enter when something is highlighted, so the form can
      // still be submitted from this field.
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  const showList = open && results.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          // What they have typed no longer matches what they picked.
          onChoose(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={120}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className={className}
      />

      {/* Announced without stealing focus, so a screen reader hears that
          options appeared rather than being dropped into them. */}
      <span aria-live="polite" className="sr-only">
        {showList ? `${results.length} ${results.length === 1 ? 'place' : 'places'} found` : ''}
      </span>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-40 mt-1.5 max-h-64 w-full overflow-auto rounded-2xl bg-white py-1.5 text-start shadow-[0_8px_30px_rgba(20,24,26,0.18)] ring-1 ring-black/10"
        >
          {results.map((r, i) => (
            <li
              key={`${r.placeId ?? r.label}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => {
                // Before blur, so the click lands on the option and not on
                // a list that has already closed.
                e.preventDefault();
                choose(r);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-4 py-2.5 text-[14px] leading-snug ${
                i === active ? 'bg-black/[0.055] text-ink' : 'text-ink/80'
              }`}
            >
              <span className="font-semibold text-ink">{r.name}</span>
              {(r.region || r.country) && (
                <span className="text-subtle">
                  {' '}
                  {[r.region, r.country].filter(Boolean).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {noResultsHint && open && searched && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-subtle">{noResultsHint}</p>
      )}
    </div>
  );
}
