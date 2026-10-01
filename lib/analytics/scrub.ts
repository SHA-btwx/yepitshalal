import type { CaptureResult } from 'posthog-js';

// Every event passes through here in the browser before anything is sent to
// PostHog, and what comes out is all PostHog ever receives. The privacy page
// promises three things this file keeps true: the location someone searched
// from is never stored, nothing personal is collected just by visiting, and
// the analytics does not follow anyone around. The mobile app plan in the
// vault sets the same line for the app: no coordinates, no full postcodes, no
// email addresses, no report text.

// Pages that show someone's own details: the admin queue lists submitters'
// email addresses, /account shows yours, /manage is a restaurant owner's own
// dashboard. Nothing that happens on them is sent at all.
const PRIVATE_PATHS = ['/admin', '/account', '/manage', '/auth'];

// The only query parameters whose values may leave the browser. Everything
// else keeps its name and loses its value, so /search?lat=51.5&lng=-0.1
// arrives as /search?lat=&lng= and still counts as a search. An allowlist
// rather than a blocklist: a parameter added next year is private until
// someone decides otherwise.
const KEPT_PARAMS = new Set([
  'mode',
  'sort',
  'classification',
  'radius_miles',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
]);

// A name=value pair inside any URL, wherever it turns up: the page address,
// the referrer, or the href of a clicked link inside autocapture's element
// chain. The value stops at quotes and angle brackets because the element
// chain wraps attributes in double quotes.
const QUERY_PAIR = /([?&])([^=&#\s"'<>]+)=([^&#\s"'<>]*)/g;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// A full UK postcode, "E7 9AA", cut back to its district, "E7". It needs the
// space (or its URL encodings) between the halves, which is how the site
// prints one, so that a slug or a class name that happens to look like
// "e79aa" is left alone.
const FULL_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)(?:\s|%20|\+)+\d[A-Z]{2}\b/gi;

export function scrubText(text: string): string {
  return text
    .replace(QUERY_PAIR, (pair, separator: string, name: string) =>
      KEPT_PARAMS.has(name) ? pair : `${separator}${name}=`,
    )
    .replace(EMAIL, '[email]')
    .replace(FULL_POSTCODE, '$1');
}

// Keys as well as values: heatmap events are keyed by the page URL. Heatmaps
// are off in posthog.ts, but this stays in case they are ever turned back on.
function scrubDeep(value: unknown): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [scrubText(key), scrubDeep(inner)]),
    );
  }
  return value;
}

// The page the event belongs to, from the event itself. A $pageleave for an
// admin page is captured after the browser has already moved on, so the
// current location would be the wrong page to judge it by.
function pathOf(properties: Record<string, unknown>): string {
  if (typeof properties.$pathname === 'string') return properties.$pathname;
  if (typeof properties.$current_url === 'string') {
    try {
      return new URL(properties.$current_url).pathname;
    } catch {
      // Not a full URL, so fall back to where the browser is.
    }
  }
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

function isPrivate(path: string): boolean {
  return PRIVATE_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;
  const properties = event.properties ?? {};
  if (isPrivate(pathOf(properties))) return null;
  return {
    ...event,
    properties: scrubDeep(properties) as CaptureResult['properties'],
    ...(event.$set ? { $set: scrubDeep(event.$set) as CaptureResult['$set'] } : {}),
    ...(event.$set_once ? { $set_once: scrubDeep(event.$set_once) as CaptureResult['$set_once'] } : {}),
  };
}
