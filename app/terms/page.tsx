import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { PageBody } from '@/components/PageLayout';
import { inlineLink, noteWarm, sectionTitle } from '@/components/prose';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms',
  description:
    'The terms you agree to by using YepItsHalal: what we promise, what we do not, and how supporting us works.',
  alternates: { canonical: '/terms' },
};

/**
 * Two things here are load bearing and should not be softened without thinking
 * about why they are worded this way.
 *
 * 1. The halal disclaimer. It has to be prominent and honest, because the whole
 *    site rests on people trusting a label. Overclaiming here would undo the
 *    care taken everywhere else, and underclaiming would make the site useless.
 *
 * 2. The supporter section. Yep+ unlocks nothing, and promising in the terms
 *    that finding halal food never goes behind a paywall is what keeps it from
 *    being sold as access. The wording is Shabir's, framed as a promise about
 *    what stays free rather than a shrug about what Yep+ lacks. If Yep+ ever
 *    does unlock something, this is one of the places that has to change.
 *
 * Still to add once ICO registration settles the entity: the registered name,
 * trading address and company number, if there is one.
 */

export default function TermsPage() {
  return (
    <>
      <PageHero tone="sand" title="Terms" lede="The rules for using YepItsHalal. We have kept them in plain English, because terms nobody can read are not really terms." />
      <PageBody>
      <div>

      <div className={noteWarm}>
        <h2 className="font-display text-lg font-semibold text-ink">
          The most important thing on this page
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          YepItsHalal tells you what we have found out about a restaurant. It is not a
          halal certification, and we are not a certifying body. We can be wrong, sources
          go out of date, and a kitchen can change its supplier the day after we check.
          <span className="font-semibold text-ink">
            {' '}
            Ask the restaurant.
          </span>{' '}
          Our label is a starting point for that question, not a substitute for it.
        </p>
      </div>

      <h2 className={`mt-12 ${sectionTitle}`}>Using the site</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Search, browse and read as much as you like, signed in or not, for free. You may
        not scrape the site wholesale, resell the data, or use it to build a competing
        listing. Some of what we show comes from open data that carries its own licence
        terms, credited on{' '}
        <Link href="/how-we-check" className={inlineLink}>
          how we check
        </Link>{' '}
        and{' '}
        <Link href="/image-credits" className={inlineLink}>
          image credits
        </Link>
        .
      </p>

      <h2 className={`mt-12 ${sectionTitle}`}>
        What we promise about halal information
      </h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
        <li>We never invent a halal fact. If we do not know, the page says we do not know.</li>
        <li>
          Unverified and Not checked yet mean we have not checked. Neither means a place is
          not halal.
        </li>
        <li>Every label says where the evidence came from and when we last looked.</li>
        <li>
          If you tell us a label is wrong, we take it down while we check. See{' '}
          <Link
            href="/corrections"
            className={inlineLink}
          >
            corrections
          </Link>
          .
        </li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        What we cannot promise is that a restaurant has not changed since we looked, or
        that a restaurant told us the truth.
      </p>

      <h2 className={`mt-12 ${sectionTitle}`}>
        If you add something
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Submissions, feedback and photos are reviewed by a person before anything is
        listed. Send only things that are true and that are yours to send. By uploading a
        photo you confirm you have the right to it and let us show it on the listing. We
        can remove anything, and we will remove anything we find is wrong.
      </p>

      <h2 className={`mt-12 ${sectionTitle}`}>Supporting us</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Yep+ is support, not access.{' '}
        <span className="font-medium text-ink">
          We don&apos;t put finding halal food behind a paywall, and we never will
        </span>
        . Not the listings, not the labels, not how far you can look. What you get is a
        meal donated every month through ShareTheMeal, a vote on the area we check next, a
        supporter badge, early access to new things, and no sponsored messages.
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
        <li>It renews monthly or yearly until you cancel, at the price shown when you join.</li>
        <li>
          You can cancel any time from your account, in a couple of clicks, and keep the
          benefits until the period you have paid for ends.
        </li>
        <li>
          The meal donation is us giving to ShareTheMeal. We are not partnered with, or
          endorsed by, ShareTheMeal or the World Food Programme.
        </li>
        <li>
          Payments are handled by Stripe. We never see your card.
        </li>
      </ul>

      <h2 className={`mt-12 ${sectionTitle}`}>
        Priority verification
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Paying for a priority verification buys a place at the front of the queue and a
        prompt, careful check.{' '}
        <span className="font-medium text-ink">It does not buy a particular result.</span>{' '}
        If we check and cannot confirm a place is halal, the page will say so, and the fee
        is not refundable for that reason. If we fail to review it within the time we
        promised, through our own fault, you can have your money back.
      </p>

      <h2 className={`mt-12 ${sectionTitle}`}>Where we stand</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We are in Beta and we say so on the site. Things break, coverage is uneven, and
        London is the only city so far. We are not liable for a decision you make about
        where to eat, beyond what the law does not let us exclude, which includes anything
        caused by our own negligence. Nothing here affects your statutory rights as a
        consumer.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        These terms are governed by the law of England and Wales, and the courts of
        England and Wales have jurisdiction.
      </p>

      <h2 className={`mt-12 ${sectionTitle}`}>Reaching us</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className={inlineLink}
        >
          {CONTACT_EMAIL}
        </a>
        . For how we handle your data, see{' '}
        <Link href="/privacy" className={inlineLink}>
          privacy
        </Link>
        .
      </p>

      <p className="mt-10 border-t border-line pt-6 text-xs text-subtle">
        Last updated 21 September 2026.
      </p>
      </div>
      </PageBody>
    </>
  );
}
