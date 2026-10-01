'use client';

import { track } from '@vercel/analytics';
import { track as trackPostHog } from '@/lib/analytics/posthog';

// Every Founders page event goes through here, so switching where they go is a
// one-file change.
//
// Counts and states only: where on the page, open or full, how many spots
// were left, how somebody arrived. Never a name, a business, a phone number,
// an Instagram handle, a postcode or anything typed into the form.
//
// Each event goes to two places. Vercel Web Analytics records custom events
// only on its paid plans. PostHog records them on its free plan, after the
// privacy filter in lib/analytics/scrub has checked them like every other
// event on the site.

export type FoundersEvent =
  | 'founders_page_viewed'
  | 'founders_availability_viewed'
  | 'founders_cta_clicked'
  | 'founders_standard_cta_clicked'
  | 'founders_instagram_clicked'
  | 'founders_form_started'
  | 'founders_form_submitted'
  | 'founders_form_error'
  | 'founders_application_result';

type Props = Record<string, string | number | boolean | null>;

export function trackFounders(event: FoundersEvent, props?: Props) {
  try {
    track(event, props);
  } catch {
    // Analytics never gets in the way of the page.
  }
  try {
    trackPostHog(event, props);
  } catch {
    // Kept apart from Vercel's, so one failing never stops the other.
  }
}
