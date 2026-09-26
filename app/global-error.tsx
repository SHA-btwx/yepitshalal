'use client';

import NextError from 'next/error';
import { useEffect } from 'react';
import { reportError } from '@/lib/analytics/posthog';

// There is no error.tsx under app/, so every error a page throws while
// rendering ends up here in production. The page is as plain as the one Next
// shows by default; the difference is that PostHog is told, so a crash on
// someone's phone is something we can see rather than guess at.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
