'use client';

import { useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckIcon } from './icons';

export function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/yep-plus';
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setStatus(error ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return (
      <p
        role="status"
        className="mt-6 flex items-start gap-2 rounded-xl bg-halal-fullSoft px-4 py-3 text-sm font-medium text-halal-fullInk ring-1 ring-halal-full/20"
      >
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
        Check your inbox for a sign-in link. It expires in an hour.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      {/* A visible label, not just a placeholder: the placeholder disappears the
          moment someone starts typing, taking the field's meaning with it. */}
      <div>
        <label htmlFor={emailId} className="block text-sm font-medium text-ink">
          Email address
        </label>
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          enterKeyHint="send"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          // 16px: anything smaller makes iOS Safari zoom the page on focus.
          className="mt-1.5 w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-[16px] text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {status === 'error' && (
        <p role="alert" className="text-sm font-medium text-halal-partialInk">
          Something went wrong — please try again.
        </p>
      )}
    </form>
  );
}
