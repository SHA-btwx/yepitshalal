import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { PageBody } from '@/components/PageLayout';
import { inlineLink, noteWarm, sectionTitle } from '@/components/prose';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What YepItsHalal collects, why, how long it is kept, and how to ask for a copy or have it deleted.',
  alternates: { canonical: '/privacy' },
};

/**
 * Written from what the code actually does, not from a template. Every row of
 * the table below maps to a real route or table, so when one of them changes
 * this page has to change with it. The ones to watch:
 *
 *   /api/subscribe            subscribers
 *   /api/feedback             site_feedback
 *   /api/language-requests    language_requests
 *   /api/restaurants/submit   restaurant_submissions
 *   /api/verification-requests
 *   Supabase Auth             magic link, email only
 *
 * Still to add once ICO registration is done: the registered entity name,
 * trading address and registration number. That registration produces exactly
 * those details, which is why they are not guessed at here.
 */

const COLLECTED: [string, string, string][] = [
  [
    'Your email address',
    'If you sign in, ask to be told when we reach your area, send feedback and leave an address, ask for a language, submit a restaurant, or request a verification.',
    'Kept while your account exists, or until you ask us to remove it.',
  ],
  [
    'What you write to us',
    'Feedback, language requests, restaurant details you submit, and anything you send about your own restaurant.',
    'Kept for two years, so we can see whether we fixed the thing you told us about.',
  ],
  [
    'A one way hash of your IP address',
    'To stop one connection flooding the forms. We hash it with a secret and never store the address itself, so it cannot be turned back into your IP.',
    'Kept for 12 months alongside the submission it limited.',
  ],
  [
    'Payment details',
    'Handled entirely by Stripe. We never see or store your card. We keep the Stripe customer and subscription identifiers so we know you are a supporter.',
    'Kept while your support is active, then as long as tax rules require.',
  ],
  [
    'Photographs you upload',
    'Only if you manage a restaurant listing and choose to add pictures of it.',
    'Kept while the listing shows them.',
  ],
];

const PROCESSORS: [string, string, string][] = [
  ['Supabase', 'Database, sign in, and photo storage.', 'https://supabase.com/privacy'],
  ['Vercel', 'Hosting, and privacy friendly visitor analytics.', 'https://vercel.com/legal/privacy-policy'],
  ['Stripe', 'Payments, if you support us or buy a priority verification.', 'https://stripe.com/gb/privacy'],
  ['Resend', 'Delivering what you send through a form on this site to our own inbox, so a person reads it.', 'https://resend.com/legal/privacy-policy'],
];

const RIGHTS = [
  'Ask for a copy of everything we hold about you.',
  'Ask us to correct anything that is wrong.',
  'Ask us to delete it.',
  'Ask us to stop using it for something.',
  'Take your data elsewhere.',
  'Complain to the Information Commissioner, without telling us first.',
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero tone="sand" title="Privacy" lede="Searching for halal food should not cost you your privacy. This page says exactly what we collect, why, and how to get rid of it. It is short because we collect little." />
      <PageBody>
      <div>

      <div className={noteWarm}>
        <h2 className="font-display text-lg font-semibold text-ink">
          You can use the whole site without telling us who you are
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          Search, the map, every restaurant page and the prayer spaces work signed out.
          When you search near yourself, your location is sent to our server to find what
          is nearby and is then thrown away. We do not store it, and we do not build a
          history of where you have searched.
        </p>
      </div>

      <h2 className={`mt-12 ${sectionTitle}`}>What we collect</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Only when you do something that needs it. Nothing in this list is collected just
        by visiting.
      </p>
      <div className="mt-4 border-b border-line">
        {COLLECTED.map(([what, why, kept]) => (
          <div key={what} className="border-t border-line py-4">
            <h3 className="font-display text-base font-semibold text-ink">{what}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{why}</p>
            <p className="mt-2 text-xs leading-relaxed text-subtle">{kept}</p>
          </div>
        ))}
      </div>

      <h2 className={`mt-12 ${sectionTitle}`}>Why we are allowed to</h2>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
        <li>
          <span className="font-medium text-ink">Because you asked us to.</span> Signing in,
          submitting a restaurant, asking for a language, asking to be told when we reach
          your area. Consent, and you can withdraw it at any time.
        </li>
        <li>
          <span className="font-medium text-ink">Because we have a contract with you.</span>{' '}
          Supporting us, or buying a priority verification.
        </li>
        <li>
          <span className="font-medium text-ink">
            Because we have a legitimate interest.
          </span>{' '}
          Hashing an IP address to stop the forms being flooded, and counting visits so we
          know which pages are worth keeping. Both are the least intrusive way we could
          think of to do those things.
        </li>
      </ul>

      <h2 className={`mt-12 ${sectionTitle}`}>Cookies</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We do not use advertising or tracking cookies, and there is no cookie banner
        because there is nothing to ask you about. Our visitor analytics, from Vercel,
        does not use cookies and does not follow you between sites. If you sign in,
        Supabase sets a cookie that keeps you signed in. That is the only one, and it is
        there because you asked to be signed in.
      </p>

      <h2 className={`mt-12 ${sectionTitle}`}>Who else sees it</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We do not sell your data and we do not share it for advertising. These companies
        process it so the site can work:
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
        {PROCESSORS.map(([name, role, href]) => (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={inlineLink}
            >
              {name}
            </a>{' '}
            {role}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Some of them run servers outside the UK. Where that happens, the transfer relies
        on the safeguards in their agreements with us.
      </p>

      <h2 className={`mt-12 ${sectionTitle}`}>What you can ask for</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
        {RIGHTS.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Email{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className={inlineLink}
        >
          {CONTACT_EMAIL}
        </a>{' '}
        and we will answer within a month. You do not have to give a reason. If you would
        rather complain to the regulator, the Information Commissioner is at{' '}
        <a
          href="https://ico.org.uk/make-a-complaint/"
          target="_blank"
          rel="noopener noreferrer"
          className={inlineLink}
        >
          ico.org.uk
        </a>
        .
      </p>

      <h2 className={`mt-12 ${sectionTitle}`}>
        Restaurants are not covered by this page
      </h2>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">
        Information about a restaurant as a business, its address, its menu, what it says
        about halal, is not personal data and this page does not govern it. If you run a
        place and think we have something wrong,{' '}
        <Link href="/corrections" className={inlineLink}>
          tell us and we will fix it
        </Link>
        .
      </p>

      <p className="mt-10 border-t border-line pt-6 text-xs text-subtle">
        Last updated 23 September 2026. If we change how any of this works, we will change
        this page on the same day.
      </p>
      </div>
      </PageBody>
    </>
  );
}
