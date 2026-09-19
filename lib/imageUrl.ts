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
 * Unsplash still goes through the optimiser. There are only 75 of those and
 * they are one fixed set, so they stay well inside the allowance.
 */

const STORAGE_MARKER = '/storage/v1/object/public/restaurant-photos/';

/** True for a picture we host, which is therefore already the right size. */
export function isOwnStorage(url: string): boolean {
  return url.includes(STORAGE_MARKER);
}

/** The small copy, for a list. Falls back to the original if it isn't ours. */
export function thumbUrl(url: string): string {
  if (!isOwnStorage(url)) return url;
  const [base, path] = url.split(STORAGE_MARKER);
  if (!path || path.startsWith('thumb/')) return url;
  return `${base}${STORAGE_MARKER}thumb/${path}`;
}
