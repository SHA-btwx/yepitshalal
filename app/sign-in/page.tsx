import { Suspense } from 'react';
import { SignInForm } from '@/components/SignInForm';

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-ink/60">
        No password needed. We&apos;ll email you a link. Searching is free and never needs an
        account; sign in to support the site or to manage a restaurant you run.
      </p>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
