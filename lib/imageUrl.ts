/**
 * Our own images are served straight from storage, at the size they are shown.
 *
 * Vercel's image optimiser allows a fixed number of distinct source images a
 * month. This catalogue passed it the day restaurants started supplying their
 * own pictures, and past the limit it answers 402: every card on the site
 * becomes a grey tile. Nothing about that problem gets better as the catalogue
 * grows, so the site stopped asking it to resize anything it already stores.
 *
 * Instead each picture is kept twice, by scripts/catalogue/make-thumbnails.mjs:
 *
 *   <path>          960x720, for a page header
 *   thumb/<path>    320x240, about 15KB, for a card
 *
 * Unsplash no longer goes through it either (2026-09-23). The optimiser is
 * past its allowance, and past it answers 402 to any size it has not already
 * cached: /image-credits asked for a new 96px width and got five grey tiles.
 * Unsplash resizes on its own CDN from the query string, so it is hotlinked at
 * the size it is shown, which is how Unsplash asks to be used anyway, and the
 * optimiser is out of the path for every picture on the site.
 */

const STORAGE_MARKER = '/storage/v1/object/public/restaurant-photos/';

/** True for a picture we host, which is therefore already the right size. */
export function isOwnStorage(url: string): boolean {
  return url.includes(STORAGE_MARKER);
}

export function isUnsplash(url: string): boolean {
  return url.includes('images.unsplash.com');
}

/** An Unsplash picture cropped and sized by Unsplash's own CDN. */
export function unsplashSized(url: string, width: number, height?: number): string {
  try {
    const u = new URL(url);
    u.searchParams.set('w', String(width));
    if (height) {
      u.searchParams.set('h', String(height));
      u.searchParams.set('fit', 'crop');
    } else {
      u.searchParams.delete('h');
    }
    u.searchParams.set('q', '70');
    u.searchParams.set('auto', 'format');
    return u.toString();
  } catch {
    return url;
  }
}

/** True for anything that must never go through the image optimiser. */
export function skipOptimiser(url: string): boolean {
  return isOwnStorage(url) || isUnsplash(url);
}

/** The small copy, for a list. Falls back to the original if it isn't ours. */
export function thumbUrl(url: string): string {
  if (!isOwnStorage(url)) return url;
  const [base, path] = url.split(STORAGE_MARKER);
  if (!path || path.startsWith('thumb/')) return url;
  return `${base}${STORAGE_MARKER}thumb/${path}`;
}
