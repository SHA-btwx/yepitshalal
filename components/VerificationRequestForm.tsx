'use client';

import { useState } from 'react';

export function VerificationRequestForm({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function requestVerification(queueType: 'free' | 'priority') {
    setSubmitting(true);
    setResult(null);
    const res = await fetch('/api/verification-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId, queueType, contactName: name, contactEmail: email }),
    });
    const json = await res.json();
    if (!res.ok) {
      setSubmitting(false);
      setResult({ ok: false, message: json.error ?? 'Something went wrong.' });
      return;
    }
    if (json.checkoutUrl) {
      window.location.href = json.checkoutUrl;
      return;
    }
    setSubmitting(false);
    setResult({
      ok: true,
      message:
        json.status === 'queued'
          ? "You're in today's free verification queue — no guaranteed timeframe, but we'll be in touch."
          : "Today's 3 free verification slots are full — you're first in line for tomorrow, no need to resubmit.",
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink/60">
        Requesting verification for <strong className="text-ink">{restaurantName}</strong>.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-ink/40 focus:outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Your email"
          className="rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-ink/40 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/10 p-4">
          <h3 className="text-sm font-semibold text-ink">Free verification</h3>
          <p className="mt-1 text-xs text-ink/55">
            Joins the normal queue. No guaranteed timeframe — we process roughly 3 free
            verifications a day.
          </p>
          <button
            onClick={() => requestVerification('free')}
            disabled={submitting}
            className="mt-3 w-full rounded-full border border-ink px-4 py-2 text-xs font-semibold text-ink transition hover:bg-ink hover:text-white disabled:opacity-60"
          >
            Request free verification
          </button>
        </div>

        <div className="rounded-2xl border-2 border-ink bg-ink/[0.02] p-4">
          <h3 className="text-sm font-semibold text-ink">Priority Verification — £30</h3>
          <p className="mt-1 text-xs text-ink/55">
            Moves you ahead of the free queue. Target: reviewed within 48 working hours.
            Payment purchases priority, not a favourable outcome.
          </p>
          <button
            onClick={() => requestVerification('priority')}
            disabled={submitting}
            className="mt-3 w-full rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
          >
            Pay £30 for Priority Verification
          </button>
        </div>
      </div>

      {result && (
        <p className={`text-sm ${result.ok ? 'text-halal-full' : 'text-halal-partial'}`}>{result.message}</p>
      )}
    </div>
  );
}
