'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { HalalBadge } from './HalalBadge';
import { MapPinIcon, MapIcon, NavigationIcon, SearchIcon, ForkKnifeIcon } from './icons';
import type { HalalStatus } from '@/lib/types';

export interface LocationItem {
  kind: 'postcode' | 'outcode' | 'place' | 'borough' | 'street' | 'station' | 'landmark';
  label: string;
  sublabel: string;
  lat: number;
  lng: number;
}

export interface RestaurantItem {
  kind: 'restaurant';
  id: string;
  slug: string;
  label: string;
  sublabel: string;
  halal_status: HalalStatus;
  branchCount: number;
}

export type SuggestionItem = LocationItem | RestaurantItem;

const LOCATION_ICON: Record<LocationItem['kind'], typeof MapPinIcon> = {
  postcode: SearchIcon,
  outcode: SearchIcon,
  place: MapPinIcon,
  borough: MapIcon,
  street: NavigationIcon,
  station: MapPinIcon,
  landmark: MapPinIcon,
};

/**
 * The panel is portalled to the body and positioned fixed rather than absolutely
 * inside the form. The hero it sits in is `overflow-hidden` (it clips the
 * decorative gradients), which would otherwise cut the list off at the section
 * edge, and `overflow-x` alone cannot be relaxed without the vertical axis
 * clipping too.
 */
export function SuggestionPanel({
  anchorRef,
  items,
  activeIndex,
  listId,
  optionId,
  loading,
  query,
  attribution,
  hint = null,
  onPick,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  items: SuggestionItem[];
  activeIndex: number;
  listId: string;
  optionId: (i: number) => string;
  loading: boolean;
  query: string;
  attribution: string[];
  /** Shown above the list, e.g. when Enter found restaurants but no place. */
  hint?: string | null;
  onPick: (item: SuggestionItem) => void;
}) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    measure();
    window.addEventListener('resize', measure);
    // Capture phase so the panel keeps up with any scrolling ancestor, not just
    // the window.
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [anchorRef, items.length]);

  if (!mounted || !rect) return null;

  const locations = items.filter((i): i is LocationItem => i.kind !== 'restaurant');
  const restaurants = items.filter((i): i is RestaurantItem => i.kind === 'restaurant');
  const indexOf = (item: SuggestionItem) => items.indexOf(item);

  return createPortal(
    <div
      // The panel lives outside the form in the DOM, so a click inside it looks
      // like a click outside the search box. This marks it as part of the
      // control for the dismiss-on-outside-click check.
      data-suggestion-panel=""
      style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 60 }}
      className="overflow-hidden rounded-2xl border border-line bg-white shadow-2xl shadow-black/20"
    >
      {hint && items.length > 0 && (
        <p role="status" className="border-b border-line bg-accent-soft/60 px-4 py-2 text-[13px] font-medium text-accent-ink">
          {hint}
        </p>
      )}
      {items.length === 0 ? (
        <p role="status" className="px-4 py-3.5 text-sm text-muted">
          {loading
            ? 'Looking…'
            : `Nothing matching “${query}”. Try a postcode, area, street or restaurant name.`}
        </p>
      ) : (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="max-h-[min(60vh,26rem)] overflow-y-auto py-1.5"
        >
          {locations.length > 0 && <GroupHeading>Places</GroupHeading>}
          {locations.map((item) => {
            const i = indexOf(item);
            const Icon = LOCATION_ICON[item.kind];
            return (
              <Option
                key={`loc-${item.kind}-${item.label}-${item.sublabel}`}
                id={optionId(i)}
                active={i === activeIndex}
                onPick={() => onPick(item)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{item.label}</span>
                  <span className="block truncate text-xs text-muted">{item.sublabel}</span>
                </span>
              </Option>
            );
          })}

          {restaurants.length > 0 && (
            <GroupHeading divided={locations.length > 0}>Restaurants</GroupHeading>
          )}
          {restaurants.map((item) => {
            const i = indexOf(item);
            return (
              <Option key={`res-${item.id}`} id={optionId(i)} active={i === activeIndex} onPick={() => onPick(item)}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-halal-unverifiedSoft text-halal-unverifiedInk">
                  <ForkKnifeIcon className="h-4 w-4" />
                </span>
                {/* The name gets the full width, because on a phone a badge on the
                    right cut "Whitechapel Fried Chicken" down to "Whitechape…".
                    The status leads the second line so it is never the part that
                    truncates. */}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-semibold text-ink">{item.label}</span>
                    {item.branchCount > 1 && (
                      <span className="shrink-0 text-[11px] font-medium text-subtle">
                        {item.branchCount} branches
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-2">
                    <HalalBadge classification={item.halal_status} size="sm" />
                    <span className="truncate text-xs text-muted">{item.sublabel}</span>
                  </span>
                </span>
              </Option>
            );
          })}
        </ul>
      )}

      {attribution.length > 0 && items.length > 0 && (
        <p className="border-t border-line px-4 py-1.5 text-right text-[10.5px] text-subtle">
          {attribution.join(' · ')}
        </p>
      )}
    </div>,
    document.body
  );
}

function GroupHeading({ children, divided = false }: { children: React.ReactNode; divided?: boolean }) {
  return (
    <li role="presentation">
      <p
        className={clsx(
          'px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle',
          divided && 'mt-1 border-t border-line pt-2.5'
        )}
      >
        {children}
      </p>
    </li>
  );
}

function Option({
  id,
  active,
  onPick,
  children,
}: {
  id: string;
  active: boolean;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      // mousedown rather than click: the input's blur would otherwise tear the
      // panel down before the click landed.
      onMouseDown={(e) => {
        e.preventDefault();
        onPick();
      }}
      className={clsx(
        'flex min-h-[52px] cursor-pointer items-center gap-3 px-4 py-2 transition',
        active ? 'bg-accent-soft' : 'hover:bg-black/[0.03]'
      )}
    >
      {children}
    </li>
  );
}
