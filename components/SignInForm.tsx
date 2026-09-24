'use client';

import { useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckIcon } from './icons';
import { fieldInput, fieldLabel, formError, formSuccess } from './form';
import { ctaPrimary } from './cta';
import { Appear, Swap } from './motion/Swap';

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

  return (
    <Swap id={status === 'sent' ? 'sent' : 'form'}>
      {status === 'sent' ? (
        <p role="status" className={`${formSuccess} flex items-start gap-2 font-medium`}>
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
          Check your inbox for a sign-in link. It expires in an hour.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* A visible label, not just a placeholder: the placeholder disappears the
              moment someone starts typing, taking the field's meaning with it. */}
          <div>
            <label htmlFor={emailId} className={fieldLabel}>
              Email address
            </label>
            <input
              id={emailId}
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              inputMode="email"
              enterKeyHint="send"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={fieldInput}
            />
          </div>
          <button type="submit" disabled={status === 'sending'} className={`${ctaPrimary} w-full`}>
            {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <Appear show={status === 'error'}>
            <p role="alert" className={formError}>
              Something went wrong. Please try again.
            </p>
          </Appear>
        </form>
      )}
    </Swap>
  );
}
