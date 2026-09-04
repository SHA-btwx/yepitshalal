import { Suspense } from 'react';
import { SignInForm } from '@/components/SignInForm';

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-ink/60">
        No password needed — we&apos;ll email you a link. This is only needed for Yep+ membership;
        browsing and searching never require an account.
      </p>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
