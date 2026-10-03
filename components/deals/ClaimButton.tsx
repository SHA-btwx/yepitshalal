'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ctaPrimary } from '@/components/cta';
import { track } from '@/lib/analytics/posthog';

/**
 * Claim a deal. No account: the server gives this phone a cookie and a code,
 * then the code screen opens.
 *
 * A visit that arrived from the restaurant's own in-store QR (?src=qr) is
 * remembered for this tab, so walking around the site first still counts as
 * a QR claim. That is the restaurant's cheaper rate, never ours.
 */
export function ClaimButton({ dealId, restaurantId }: { dealId: string; restaurantId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrKey = `yih_qr_${restaurantId}`;

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('src') === 'qr') sessionStorage.setItem(qrKey, '1');
    } catch {
      // Storage can be blocked. The URL is checked again on tap.
    }
  }, [qrKey]);

  function source(): 'qr' | 'site' {
    try {
      if (new URLSearchParams(window.location.search).get('src') === 'qr') return 'qr';
      if (sessionStorage.getItem(qrKey) === '1') return 'qr';
    } catch {
      // fall through
    }
    return 'site';
  }

  async function claim() {
    setBusy(true);
    setError(null);
    const src = source();
    try {
      const res = await fetch('/api/deals/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, source: src }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; code?: string; existing?: boolean; message?: string } | null;
      if (body?.ok && body.code) {
        track('deal_claimed', { source: src, again: !!body.existing });
        router.push(`/deal/${body.code}`);
        return;
      }
      setError(body?.message ?? 'Something went wrong. Try again.');
    } catch {
      setError('No connection. Try again.');
    }
    setBusy(false);
  }

  return (
    <div>
      <button type="button" onClick={claim} disabled={busy} className={`${ctaPrimary} w-full sm:w-auto`}>
        {busy ? 'Getting your code…' : 'Get my code'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-halal-partialInk">
          {error}
        </p>
      )}
    </div>
  );
}
