export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

// postcodes.io — free, keyless, UK-only. Used for manual "search another location."
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

  // YepItsHalal is London-first — bias the fuzzy place search accordingly rather
  // than accepting the first UK-wide match (e.g. "Shoreditch" also exists near
  // Droitwich, well outside London).
  const LONDON_BOUNDS = { minLat: 51.28, maxLat: 51.70, minLng: -0.51, maxLng: 0.33 };

  try {
    const res = await fetch(
      `https://api.postcodes.io/places?q=${encodeURIComponent(cleaned)}&limit=10`
    );
    if (res.ok) {
      const json = await res.json();
      const results: { latitude: number; longitude: number; name_1?: string }[] = json.result ?? [];
      const inLondon = results.find(
        (p) =>
          p.latitude >= LONDON_BOUNDS.minLat &&
          p.latitude <= LONDON_BOUNDS.maxLat &&
          p.longitude >= LONDON_BOUNDS.minLng &&
          p.longitude <= LONDON_BOUNDS.maxLng
      );
      const place = inLondon ?? results[0];
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
