import { NextResponse } from 'next/server';

// Place suggestions for "which city should we do next?".
//
// A free-text box gave us "manchester", "Manchester UK", "mcr" and
// "Manchestor" as four different cities, which is worse than useless when the
// whole point of asking is to count demand. These come back with a canonical
// name, a country and coordinates, so a hundred people asking for the same
// place are a hundred people asking for the same place.
//
// Photon rather than Nominatim: Nominatim's usage policy forbids type-ahead
// outright, Photon is built for it. Same OpenStreetMap data underneath, which
// this site already uses and credits. No key, no account, no bill.
//
// Proxied rather than called from the browser so the upstream sees one
// identified caller instead of every visitor's IP, and so a repeated query
// costs nothing.

const PHOTON = 'https://photon.komoot.io/api/';
const UA = 'YepItsHalalBot/1.0 (+https://yepitshalal.com; city waitlist)';

export interface PlaceSuggestion {
  /** "Manchester, England, United Kingdom" */
  label: string;
  /** "Manchester" */
  name: string;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  kind: string | null;
  /** OpenStreetMap type/id, e.g. "R/146656". */
  placeId: string | null;
  lat: number | null;
  lng: number | null;
}

interface PhotonFeature {
  properties?: {
    name?: string;
    state?: string;
    county?: string;
    country?: string;
    countrycode?: string;
    type?: string;
    osm_type?: string;
    osm_id?: number;
  };
  geometry?: { coordinates?: [number, number] };
}

// A tiny in-process cache. Type-ahead sends the same prefixes over and over,
// and the polite thing to do with a free service somebody else pays for is to
// ask it once.
const cache = new Map<string, { at: number; body: PlaceSuggestion[] }>();
const CACHE_MS = 60 * 60 * 1000;
const CACHE_MAX = 500;

function toSuggestion(f: PhotonFeature): PlaceSuggestion | null {
  const p = f.properties ?? {};
  if (!p.name) return null;
  // A country's own record comes back as name "Iceland" in country "Iceland",
  // and a region's as "Istanbul, Istanbul". Saying it once is enough.
  const region = (p.state ?? p.county) === p.name ? null : p.state ?? p.county ?? null;
  const country = p.country === p.name ? null : p.country ?? null;
  return {
    label: [p.name, region, country].filter(Boolean).join(', '),
    name: p.name,
    region,
    country,
    countryCode: p.countrycode ?? null,
    kind: p.type ?? null,
    placeId: p.osm_type && p.osm_id ? `${p.osm_type}/${p.osm_id}` : null,
    lat: f.geometry?.coordinates?.[1] ?? null,
    lng: f.geometry?.coordinates?.[0] ?? null,
  };
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json({ results: hit.body });
  }

  // Towns and upwards only: somebody asking for a street is answering a
  // different question from the one we asked.
  const url = new URL(PHOTON);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '6');
  url.searchParams.set('lang', 'en');
  for (const layer of ['city', 'county', 'state', 'country']) url.searchParams.append('layer', layer);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ results: [] });
    const json = (await res.json()) as { features?: PhotonFeature[] };

    const seen = new Set<string>();
    const results: PlaceSuggestion[] = [];
    for (const f of json.features ?? []) {
      const s = toSuggestion(f);
      // The same city often comes back as a node and as a boundary relation.
      if (!s || seen.has(s.label)) continue;
      seen.add(s.label);
      results.push(s);
    }

    if (cache.size > CACHE_MAX) cache.clear();
    cache.set(key, { at: Date.now(), body: results });
    return NextResponse.json({ results });
  } catch {
    // A suggestion list that cannot load is not an error worth showing: the
    // field still takes whatever they type.
    return NextResponse.json({ results: [] });
  }
}
