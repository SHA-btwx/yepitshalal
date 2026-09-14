'use client';

import { useState } from 'react';
import { CheckIcon } from './icons';

/**
 * Shares the page with the phone's own share sheet, or copies the link where
 * there isn't one. Sending a place to whoever you're eating with is most of
 * how a restaurant page gets used.
 */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href.split('?')[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed, or not allowed here: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  return (
    <button type="button" onClick={share} className={className} aria-live="polite">
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4" />
          Link copied
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" />
            <path d="M5 12.5v6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 2-2v-6" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
