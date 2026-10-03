import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { PageBody } from '@/components/PageLayout';
import { inlineLink, noteWarm, sectionTitle } from '@/components/prose';
import { INBOX } from '@/lib/site';
import {
  CAP_DEFAULT_PENCE,
  CAP_MAX_PENCE,
  CAP_MIN_PENCE,
  DISPUTE_DAYS,
  FEE_NEW_PENCE,
  FEE_REPEAT_PENCE,
  FIRST_VISIT_DAYS,
  REPORTS_TO_PAUSE,
  TERMS_VERSION,
  WELCOME_CREDIT_PENCE,
  money,
} from '@/lib/deals/rules';

// The one page a restaurant agrees to when it starts a deal. Its version,
// TERMS_VERSION, is stored with every deal (deals.terms_version) with the
// time it was accepted. Change a number here and the version changes too, and
// owners agree again before their next deal.

export const metadata: Metadata = {
  title: 'Deal terms for restaurants',
  description: 'What it costs to run a deal on YepItsHalal, and the rules for it, on one page.',
  robots: { index: false, follow: true },
};

const p = 'mt-2 text-[15px] leading-relaxed text-muted';

export default function DealTermsPage() {
  return (
    <>
      <PageHero
        tone="sand"
        title="Deal terms for restaurants"
        lede="What a deal costs and the rules for it, on one page. Version 2026-10."
      />
      <PageBody>
        <div>
          <div className={noteWarm}>
            <h2 className="font-display text-lg font-semibold text-ink">A deal never changes your halal label</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Your halal label comes only from our checks. A deal does not change it, and it does not move you up or down
              in search. Your label shows next to your deal. Do not mention halal in your deal.
            </p>
          </div>

          <h2 className={`mt-12 ${sectionTitle}`}>What you pay</h2>
          <ul className={`${p} list-disc space-y-1 pl-5`}>
            <li>
              <strong className="text-ink">{money(FEE_NEW_PENCE)}</strong> when a new diner who found you on YepItsHalal
              uses your deal. New means their phone has not used your deal in the last {FIRST_VISIT_DAYS} days.
            </li>
            <li>
              <strong className="text-ink">{money(FEE_REPEAT_PENCE)}</strong> for everyone else. That includes return visits
              and anyone who scans your own poster in your restaurant.
            </li>
            <li>We only charge when your staff type your PIN and confirm the deal. No PIN, no charge.</li>
            <li>
              You never pay more than your monthly cap. It starts at {money(CAP_DEFAULT_PENCE)}. You can set it from{' '}
              {money(CAP_MIN_PENCE)} to {money(CAP_MAX_PENCE)}.
            </li>
            <li>Joining is free. There is no contract. You can stop any time.</li>
          </ul>

          <h2 className={`mt-12 ${sectionTitle}`}>Credit</h2>
          <ul className={`${p} list-disc space-y-1 pl-5`}>
            <li>We give you {money(WELCOME_CREDIT_PENCE)} of credit the first time you start a deal. Once per restaurant.</li>
            <li>You pay for more credit by card, through Stripe. Fees come out of your credit.</li>
            <li>When your credit is under {money(FEE_NEW_PENCE)}, your deal pauses. It starts again by itself when you top up.</li>
            <li>We email you when your credit is low, and every Monday with how your deal did.</li>
            <li>
              If you stop, you can ask us for any credit you paid for and did not use. We pay it back to your card. The free
              credit cannot be paid out.
            </li>
          </ul>

          <h2 className={`mt-12 ${sectionTitle}`}>Your side of it</h2>
          <ul className={`${p} list-disc space-y-1 pl-5`}>
            <li>Give the deal to anyone who shows a working code and meets the spend.</li>
            <li>Keep your PIN private. Change it when staff leave.</li>
            <li>Codes people already have keep working for 48 hours, even if you pause or end your deal.</li>
            <li>
              If {REPORTS_TO_PAUSE} diners tell us they did not get your deal, we pause it and talk to you before it starts
              again.
            </li>
          </ul>

          <h2 className={`mt-12 ${sectionTitle}`}>Mistakes</h2>
          <p className={p}>
            If a fee was taken by mistake, tell us within {DISPUTE_DAYS} days and we can give it back as credit. If we ever
            change these prices, we email you first, and you agree again before your next deal.
          </p>

          <h2 className={`mt-12 ${sectionTitle}`}>Everything else</h2>
          <p className={p}>
            Our main{' '}
            <Link href="/terms" className={inlineLink}>
              terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className={inlineLink}>
              privacy page
            </Link>{' '}
            also apply. Questions:{' '}
            <a href={`mailto:${INBOX.info}`} className={inlineLink}>
              {INBOX.info}
            </a>
            .
          </p>

          <p className="mt-10 border-t border-line pt-6 text-xs text-subtle">Version {TERMS_VERSION}. 3 October 2026.</p>
        </div>
      </PageBody>
    </>
  );
}
