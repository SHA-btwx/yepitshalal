import { NextResponse } from 'next/server';
import { getNearestPrayerSpaces } from '@/lib/prayerSpaces';

// Prayer spaces for the area the map is showing. Public and the same for
// everyone, so it can be cached: a mosque's address does not change between two
// pans of a map.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const radius = Number(searchParams.get('radius_meters'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const spaces = await getNearestPrayerSpaces(
    lat,
    lng,
    50,
    Number.isFinite(radius) && radius > 0 ? Math.round(radius) : 3000
  );

  return NextResponse.json(
    { spaces },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}
