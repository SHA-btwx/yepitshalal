import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Something wrong? Tell us',
  description:
    'How to correct a halal label, a detail, or a photo on YepItsHalal, and what we promise to do about it.',
  alternates: { canonical: '/corrections' },
};

/**
 * This page exists for two reasons that point the same way.
 *
 * The product reason: a directory that publishes what it does not know has to
 * make it easy to be told it is wrong, or the honesty is decoration.
 *
 * The legal reason: publishing something false about a named business that
 * costs it custom is defamation or malicious falsehood. A published, promptly
 * honoured correction route is the cheapest protection available, and the
 * absence of one is what turns a mistake into a claim. Do not remove it, and
 * do not let the response times here become untrue.
 */

const STEPS: [string, string][] = [
  [
    'Tell us what is wrong',
    'Email us with the restaurant name and what we have got wrong. A link to the page helps. You do not need to prove anything to start this off, and you do not need to be the owner.',
  ],
  [
    'We take it seriously the same day',
    'If the complaint is that we have called a place halal when it is not, or implied it is not when it is, we remove the label first and work it out afterwards. Nobody should eat something because of a mistake of ours while we deliberate.',
  ],
  [
    'We check it properly',
    'Against the restaurant itself wherever possible, using the same method as everything else on the site.',
  ],
  [
    'We tell you what we did',
    'Within five working days, whether we changed it or not, and why. If we were wrong, the page says when it was corrected.',
  ],
];

export default function CorrectionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
        Something wrong? Tell us
      </h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted">
        We publish what we know and say when we have not checked. That only works if it is
        easy to tell us we have got something wrong, so this is the page for it.
      </p>

      <div className="mt-6 rounded-2xl border-2 border-halal-full/25 bg-halal-fullSoft p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          If we have the halal status wrong, we take the label down first
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          We do not leave a disputed halal label up while we investigate. It comes down,
          the page says it is being checked, and it only goes back up when we are sure.
          You do not need to send evidence to get that far.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Email us</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          One address, read by a person.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Correction`}
          className="mt-3 inline-flex min-h-[44px] items-center font-display text-lg font-semibold text-accent-ink underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold text-ink">What happens next</h2>
      <ol className="mt-4 space-y-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
              Step {i + 1} of {STEPS.length}
            </p>
            <h3 className="mt-1 font-display text-base font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 font-display text-xl font-semibold text-ink">
        If you would rather not be listed at all
      </h2>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">
        Say so and we will remove the listing. We will ask you to confirm you speak for
        the restaurant, because otherwise anyone could remove anyone. We will not argue
        with you about it, and we will not ask you to buy anything to make it happen.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold text-ink">Other things to fix</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
        <li>A wrong address, phone number, or opening hours.</li>
        <li>
          A photo that is yours and should not be here, or one labelled as an example
          photo that is being taken for the real thing.
        </li>
        <li>A place that has closed, moved, or changed hands.</li>
        <li>Two listings for the same place.</li>
        <li>Anything on a prayer space page.</li>
      </ul>

      <p className="mt-8 text-pretty text-sm leading-relaxed text-muted">
        If you want to look after your listing yourself instead,{' '}
        <Link
          href="/submit-restaurant"
          className="font-medium text-accent-ink underline underline-offset-2"
        >
          claim it here
        </Link>
        . And if you want to understand how a label gets set before you dispute it,{' '}
        <Link
          href="/how-we-check"
          className="font-medium text-accent-ink underline underline-offset-2"
        >
          this is how we check
        </Link>
        .
      </p>
    </div>
  );
}
