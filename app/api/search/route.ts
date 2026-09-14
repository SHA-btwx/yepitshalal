import { NextResponse } from 'next/server';
import { runSearch } from '@/lib/search';
import type { HalalClassification } from '@/lib/types';

// A thin pass-through to runSearch(). Radius entitlement is enforced inside the
// database function, keyed off the caller's real subscription, never here.
const CLASSES: HalalClassification[] = ['fully_halal', 'halal_options', 'unverified'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const classification = (searchParams.get('classification') ?? '')
    .split(',')
    .filter((c): c is HalalClassification => (CLASSES as string[]).includes(c));

  try {
    const response = await runSearch({
      lat,
      lng,
      mode: searchParams.get('mode') === 'searched_location' ? 'searched_location' : 'current_location',
      radiusMiles: Number(searchParams.get('radius_miles')) || null,
      classification,
      query: searchParams.get('q'),
      sort: searchParams.get('sort') === 'evidence' ? 'evidence' : 'distance',
    });
    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
