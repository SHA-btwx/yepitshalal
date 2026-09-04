'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import Supercluster from 'supercluster';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SearchResultRestaurant } from '@/lib/types';
import { HALAL_DOT_COLOR } from './halalColors';

// The only thing this component knows is "MapLibre + a style URL." Swapping
// tile providers later is a change to NEXT_PUBLIC_MAP_STYLE_URL, nothing here.
// Pins come entirely from our own search results (lat/lng), never the tile provider.
const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

interface RestaurantMapProps {
  center: { lat: number; lng: number };
  restaurants: SearchResultRestaurant[];
  selectedId: string | null;
  onSelect: (restaurant: SearchResultRestaurant) => void;
}

type ClusterProps = { restaurant?: SearchResultRestaurant };

export function RestaurantMap({ center, restaurants, selectedId, onSelect }: RestaurantMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  const restaurantsRef = useRef(restaurants);
  const selectedIdRef = useRef(selectedId);
  onSelectRef.current = onSelect;
  restaurantsRef.current = restaurants;
  selectedIdRef.current = selectedId;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap | null = null;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [center.lng, center.lat],
        zoom: 13.5,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      mapRef.current = map;

      const rerender = () => renderMarkers(map!, restaurantsRef.current, selectedIdRef.current, onSelectRef, markersRef);
      map.on('moveend', rerender);
      map.on('load', rerender);
    } catch {
      // Tile source unreachable — the map simply doesn't render.
      // Search/list results are independent of this and keep working.
    }

    return () => {
      // MapLibre's remove() detaches the DOM nodes it created from the
      // container React manages. Clearing markers here too means a genuine
      // remount (e.g. Fast Refresh) starts from a clean slate instead of
      // holding references to now-orphaned marker elements.
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setCenter([center.lng, center.lat]);
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) {
      renderMarkers(map, restaurants, selectedId, onSelectRef, markersRef);
    }
  }, [restaurants, selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function renderMarkers(
  map: MapLibreMap,
  restaurants: SearchResultRestaurant[],
  selectedId: string | null,
  onSelectRef: React.MutableRefObject<(r: SearchResultRestaurant) => void>,
  markersRef: React.MutableRefObject<Marker[]>
) {
  for (const m of markersRef.current) m.remove();
  markersRef.current = [];

  const index = new Supercluster<ClusterProps>({ radius: 50, maxZoom: 18 });
  index.load(
    restaurants.map((r) => ({
      type: 'Feature',
      properties: { restaurant: r },
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
    }))
  );

  const bounds = map.getBounds();
  const bbox: [number, number, number, number] = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ];
  const zoom = Math.round(map.getZoom());
  const clusters = index.getClusters(bbox, zoom);

  for (const feature of clusters) {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties as ClusterProps & { cluster?: boolean; point_count?: number; cluster_id?: number };
    const isCluster = Boolean(props.cluster);

    if (isCluster) {
      const count = props.point_count!;
      const size = count < 10 ? 34 : count < 30 ? 40 : 48;
      const el = document.createElement('button');
      el.setAttribute('aria-label', `${count} restaurants — zoom in to see them`);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
      el.style.background = '#14181A';
      el.style.color = 'white';
      el.style.fontFamily = 'inherit';
      el.style.fontSize = '13px';
      el.style.fontWeight = '700';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.textContent = String(count);
      el.addEventListener('click', () => {
        const expansionZoom = Math.min(index.getClusterExpansionZoom(props.cluster_id!), 20);
        map.easeTo({ center: [lng, lat], zoom: expansionZoom, duration: 350 });
      });

      const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.push(marker);
      continue;
    }

    const restaurant = props.restaurant!;
    const isSelected = restaurant.id === selectedId;
    const el = document.createElement('button');
    el.setAttribute('aria-label', restaurant.name);
    const size = isSelected ? 28 : 20;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = '50%';
    el.style.border = '2.5px solid white';
    el.style.boxShadow = isSelected ? '0 2px 8px rgba(0,0,0,.45)' : '0 1px 4px rgba(0,0,0,.35)';
    el.style.background = HALAL_DOT_COLOR[restaurant.halal_classification];
    el.style.cursor = 'pointer';
    el.style.padding = '0';
    el.style.zIndex = isSelected ? '10' : '1';
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onSelectRef.current(restaurant);
    });

    const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    markersRef.current.push(marker);
  }
}
