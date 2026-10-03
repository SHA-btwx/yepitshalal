import { HalalBadge } from '@/components/HalalBadge';
import { dealRules } from '@/lib/deals/terms';
import type { DealRow } from '@/lib/deals/rules';
import type { HalalStatus } from '@/lib/types';
import { ClaimButton } from './ClaimButton';

/**
 * A restaurant's deal, on its page. The restaurant's own halal label sits
 * right beside it, from the same place the rest of the page gets it: a deal
 * never changes a label, and a reader should never have to wonder.
 */
export function DealCard({ deal, label }: { deal: DealRow; label: HalalStatus | null }) {
  return (
    <section
      aria-labelledby="deal-title"
      className="mt-5 rounded-2xl border border-spice/25 bg-white p-5 shadow-sm ring-1 ring-spice/10 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-spice px-2.5 py-0.5 text-xs font-semibold text-white">Deal</span>
        {label && <HalalBadge classification={label} size="sm" />}
      </div>
      <h2 id="deal-title" className="mt-3 text-balance font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">
        {deal.title}
      </h2>
      <ul className="mt-2 space-y-0.5 text-sm text-muted">
        {dealRules(deal).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="mt-4">
        <ClaimButton dealId={deal.id} restaurantId={deal.restaurant_id} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-subtle">
        The deal comes from the restaurant. It does not change the halal label, which only comes from a check.
      </p>
    </section>
  );
}
