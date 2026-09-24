import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignInForm } from '@/components/SignInForm';
import { PageHero } from '@/components/PageHero';
import { pageShell } from '@/components/prose';
import { Free } from '@/components/Free';

// It fell back to the site-wide title before, so every tab and history entry
// for it read "Find halal food near you".
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to YepItsHalal with a link sent to your email. No password needed.',
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <>
      <PageHero
        tone="sand"
        title="Sign in"
        lede={
          <>
            No password needed. We&apos;ll email you a link. Searching is <Free>free</Free> and never needs an
            account; sign in to support the site or to manage a restaurant you run.
          </>
        }
      />
      <div className={`${pageShell} pb-4 pt-10 sm:pt-12`}>
        <div className="max-w-sm">
          <Suspense fallback={null}>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
