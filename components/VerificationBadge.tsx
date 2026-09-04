import { SealCheckIcon, InfoIcon } from './icons';
import type { HalalFactsPublic } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function VerificationBadge({ facts }: { facts: HalalFactsPublic | null }) {
  if (!facts?.last_verified_at) {
    return (
      <div className="flex items-start gap-2.5 text-sm text-muted">
        <InfoIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-subtle" />
        <span>
          <span className="font-semibold text-ink">Not yet verified by YepItsHalal.</span> The
          restaurant may well be halal — we simply haven&apos;t checked it ourselves.
        </span>
      </div>
    );
  }

  const isStale = facts.verification_state === 'due' || facts.verification_state === 'overdue';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-halal-fullInk">
        <SealCheckIcon className="h-[18px] w-[18px]" />
        YepItsHalal Verified
      </span>
      <span className="text-sm text-muted">
        Last checked{' '}
        <time dateTime={facts.last_verified_at}>{formatDate(facts.last_verified_at)}</time>
      </span>
      {isStale && (
        <span className="rounded-full bg-halal-partialSoft px-2 py-0.5 text-xs font-semibold text-halal-partialInk ring-1 ring-halal-partial/20">
          Review due
        </span>
      )}
    </div>
  );
}
