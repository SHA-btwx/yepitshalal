'use client';

// Loading lib/analytics/posthog is what starts PostHog, so this component only
// has to be on the page for every route to be counted. It renders nothing.
import '@/lib/analytics/posthog';

export function PostHogInit() {
  return null;
}
