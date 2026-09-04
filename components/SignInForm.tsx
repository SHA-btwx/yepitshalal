'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/yep-plus';
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
      <p className="mt-6 rounded-xl bg-halal-fullSoft px-4 py-3 text-sm text-halal-full">
        Check your inbox for a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-ink/40 focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {status === 'error' && <p className="text-sm text-halal-partial">Something went wrong — please try again.</p>}
    </form>
  );
}
