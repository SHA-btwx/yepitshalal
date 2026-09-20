export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

// YepItsHalal is London-first, and the national place index needs that bias
// applied explicitly: "Whitechapel" matches Lancashire before Greater London,
// and "Forest Hill" matches Oxfordshire before Lewisham.
export const LONDON_BOUNDS = { minLat: 51.28, maxLat: 51.7, minLng: -0.51, maxLng: 0.33 };

export function isInLondon(lat: number, lng: number): boolean {
  return (
    lat >= LONDON_BOUNDS.minLat &&
    lat <= LONDON_BOUNDS.maxLat &&
    lng >= LONDON_BOUNDS.minLng &&
    lng <= LONDON_BOUNDS.maxLng
  );
}

// postcodes.io: free, keyless, UK-only. Used for manual "search another location."
export async function geocodePostcode(query: string): Promise<GeocodeResult | null> {
  const cleaned = query.trim();
  if (!cleaned) return null;

  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned.replace(/\s+/g, ''))}`
    );
    if (res.ok) {
      const json = await res.json();
      if (json.result) {
        return {
          lat: json.result.latitude,
          lng: json.result.longitude,
          label: `${json.result.postcode}, ${json.result.admin_district ?? 'London'}`,
        };
      }
    }
  } catch {
    // fall through to place-name search below
  }

  try {
    const res = await fetch(
      `https://api.postcodes.io/places?q=${encodeURIComponent(cleaned)}&limit=10`
    );
    if (res.ok) {
      const json = await res.json();
      const results: { latitude: number; longitude: number; name_1?: string; region?: string }[] =
        json.result ?? [];
      // London only. This used to fall back to the first national match and
      // label it "…, London" regardless, so a place missing from London's index
      // sent the search to Oxfordshire under a London name. No match is the
      // honest answer, and the caller says so.
      const place = results.find(
        (p) => (p.region === undefined || p.region === 'London') && isInLondon(p.latitude, p.longitude)
      );
      if (place) {
        return {
          lat: place.latitude,
          lng: place.longitude,
          label: place.name_1 ? `${place.name_1}, London` : cleaned,
        };
      }
    }
  } catch {
    // no match found
  }

  return null;
}
