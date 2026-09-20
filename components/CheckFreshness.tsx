import { SealCheckIcon, InfoIcon } from './icons';
import type { HalalFactsPublic } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// When we checked, and whether that check has gone quiet since.
//
// The mark beside the restaurant's name says somebody from YepItsHalal did the
// work. This says when they did it, which is the part that expires: a place
// checked two years ago that has changed hands since is not a place we have
// checked, and a true answer with no date on it is how it turns into a wrong
// one. So the facts below are dated rather than left standing as if they were
// permanent.
//
// verification_state is worked out in restaurant_halal_facts_public from
// next_review_due_at, so 'due' and 'overdue' arrive on their own instead of
// waiting for somebody here to notice.

export function CheckFreshness({ facts }: { facts: HalalFactsPublic | null }) {
  if (!facts?.last_verified_at) {
    return (
      <p className="mt-1.5 flex items-start gap-2 text-[13px] leading-relaxed text-muted">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
        <span>
          <span className="font-semibold text-ink">Nobody from YepItsHalal has been here.</span>{' '}
          The place may well be halal. We just haven&apos;t checked it ourselves.
        </span>
      </p>
    );
  }

  const checkedOn = (
    <time dateTime={facts.last_verified_at}>{formatDate(facts.last_verified_at)}</time>
  );

  // We went and still came away unsure. Worth saying plainly, because the rows
  // underneath are the little we did establish, not a finished answer.
  if (facts.verification_state === 'unable_to_verify') {
    return (
      <p className="mt-1.5 flex items-start gap-2 text-[13px] leading-relaxed text-muted">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-halal-partial" aria-hidden="true" />
        <span>
          <span className="font-semibold text-ink">We tried, and couldn&apos;t confirm it.</span>{' '}
          Last attempt {checkedOn}.
        </span>
      </p>
    );
  }

  const isStale = facts.verification_state === 'due' || facts.verification_state === 'overdue';

  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
      <span className="inline-flex items-center gap-1.5 font-semibold text-halal-fullInk">
        <SealCheckIcon className="h-4 w-4" aria-hidden="true" />
        Checked by us
      </span>
      <span>{checkedOn}</span>
      {isStale && (
        <span className="rounded-full bg-halal-partialSoft px-2 py-0.5 text-[11px] font-semibold text-halal-partialInk ring-1 ring-halal-partial/20">
          Due another check
        </span>
      )}
    </p>
  );
}
