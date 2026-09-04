import { SparkleIcon, LockIcon } from './icons';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  yep_plus_only: boolean;
  is_early_access: boolean;
  voucher_code: string | null;
}

export function OffersList({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 className="font-display text-base font-semibold text-ink">Offers</h2>
      <ul className="mt-3 space-y-3">
        {offers.map((offer) => {
          const locked = offer.yep_plus_only && !offer.voucher_code;
          return (
            <li key={offer.id} className="rounded-xl border border-line p-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {offer.yep_plus_only && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    <SparkleIcon className="h-3 w-3" />
                    Yep+ exclusive
                  </span>
                )}
                {offer.is_early_access && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-ink">
                    Early access
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm font-semibold text-ink">{offer.title}</p>
              {offer.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{offer.description}</p>
              )}
              {offer.voucher_code ? (
                <p className="mt-2 inline-block rounded-lg bg-halal-fullSoft px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-halal-fullInk">
                  {offer.voucher_code}
                </p>
              ) : locked ? (
                <a
                  href="/yep-plus"
                  className="mt-2 inline-flex min-h-[32px] items-center gap-1.5 text-xs font-semibold text-accent-ink hover:underline"
                >
                  <LockIcon className="h-3.5 w-3.5" />
                  Unlock with Yep+
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
