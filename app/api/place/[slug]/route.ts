import { NextResponse } from 'next/server';
import { getPlacePreview } from '@/lib/placePreview';

// What the map sheet fills itself in with after a pin is tapped. Public, and
// the same for everyone, so it can be cached at the edge for a few minutes: a
// restaurant's address and phone number do not change between two taps.

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const preview = await getPlacePreview(params.slug);
  if (!preview) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(preview, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' },
  });
}
