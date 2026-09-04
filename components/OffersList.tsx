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
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="font-display text-base font-semibold text-ink">Offers</h2>
      <div className="mt-3 space-y-3">
        {offers.map((offer) => {
          const locked = offer.yep_plus_only && !offer.voucher_code;
          return (
            <div key={offer.id} className="rounded-xl border border-black/10 p-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {offer.yep_plus_only && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
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
              {offer.description && <p className="text-xs text-ink/55">{offer.description}</p>}
              {offer.voucher_code ? (
                <p className="mt-1.5 font-mono text-xs font-semibold text-halal-full">{offer.voucher_code}</p>
              ) : locked ? (
                <a href="/yep-plus" className="mt-1.5 inline-block text-xs font-semibold text-accent-ink">
                  Unlock with Yep+ →
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
