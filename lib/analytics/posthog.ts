import posthog from 'posthog-js';
import { scrubEvent } from './scrub';

// PostHog's project token only lets a browser send events in, and it ships in
// the page source by design, which is why it is a NEXT_PUBLIC_ variable rather
// than a secret. It is set in Vercel for production only, so local dev servers
// and previews never start PostHog, and track() does nothing there.
const TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

// Straight to PostHog's EU servers, not through a rewrite on this domain. A
// proxy on yepitshalal.com would carry the Supabase sign-in cookie to PostHog
// with every request, because the browser attaches it to anything on this
// site, and counting visitors without cookies needs the visitor's own IP
// address, which a direct request gives PostHog without a forwarded header.
// The cost is that some ad blockers stop it, which is their user's choice.
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let started = false;

function start() {
  if (started || !TOKEN || typeof window === 'undefined') return;
  try {
    posthog.init(TOKEN, {
      api_host: HOST,
      defaults: '2026-08-30',
      // No cookies and no local or session storage. PostHog tells one visit
      // from another with a hash of IP address and browser that it salts
      // afresh each day, so nobody can be followed from one day to the next.
      // This is what lets the privacy page keep saying there is no cookie
      // banner because there is nothing to ask. It only works while
      // "Cookieless server hash mode" is on in the PostHog project's Web
      // analytics settings: with it off, PostHog drops these events.
      cookieless_mode: 'always',
      // Nobody is ever identified, so no profile is built around a person,
      // and identify() is a no-op if anything calls it.
      person_profiles: 'never',
      disable_session_recording: true,
      disable_surveys: true,
      // The privacy page says PostHog learns which pages and buttons get used
      // and when a page breaks. The project's own switches would add where
      // the mouse rests on a page (heatmaps) and how long pages take to load
      // (web vitals). Setting them here wins over those switches, so the
      // PostHog dashboard cannot quietly widen what is collected.
      capture_heatmaps: false,
      capture_performance: false,
      capture_exceptions: true,
      before_send: scrubEvent,
    });
    started = true;
  } catch {
    // Analytics must never be the reason a page fails to load.
  }
}

// Started as this module loads in the browser, not in an effect. React runs a
// page's effects before the root layout's, so an event captured on mount
// would otherwise reach a PostHog that had not started yet.
start();

type EventProperties = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, properties?: EventProperties) {
  if (started) posthog.capture(event, properties);
}

export function reportError(error: unknown) {
  if (started) posthog.captureException(error);
}
