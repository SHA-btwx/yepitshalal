import type { HalalFactsPublic } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function VerificationBadge({ facts }: { facts: HalalFactsPublic | null }) {
  if (!facts?.last_verified_at) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink/50">
        <span>⚪</span>
        <span>Not yet verified by YepItsHalal</span>
      </div>
    );
  }

  const isStale = facts.verification_state === 'due' || facts.verification_state === 'overdue';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-halal-full">
        <span>✓</span>
        <span>YepItsHalal Verified</span>
      </div>
      <span className="text-sm text-ink/50">Verified: {formatDate(facts.last_verified_at)}</span>
      {isStale && (
        <span className="rounded-full bg-halal-partialSoft px-2 py-0.5 text-xs font-medium text-halal-partial">
          Review due
        </span>
      )}
    </div>
  );
}
