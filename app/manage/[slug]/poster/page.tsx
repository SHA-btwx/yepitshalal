import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { ManageTabs } from '@/components/manage/ManageTabs';
import { PrintButton } from '@/components/manage/PrintButton';
import { LogoLockup } from '@/components/Logo';
import { managedRestaurant } from '@/lib/deals/manage-access';
import { getDealState } from '@/lib/deals/data';
import { dealRules } from '@/lib/deals/terms';
import { money } from '@/lib/deals/rules';
import { SITE_URL } from '@/lib/site';
import { BLOCK_CLASS } from '@/lib/analytics/scrub';

// A poster for the window or the till, and a card for staff. The QR code
// opens the restaurant's page with ?src=qr, so claims from it are counted as
// in-store claims: always the 30p rate, never the £1 one.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Poster', robots: { index: false } };

export default async function PosterPage({ params }: { params: { slug: string } }) {
  const { restaurant } = await managedRestaurant(params.slug, 'poster');
  const state = await getDealState(restaurant.id);
  const deal = state?.deal && state.deal.status !== 'ended' ? state.deal : null;

  const url = `${SITE_URL}/restaurant/${restaurant.slug}?src=qr`;
  const qr = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#0F252B', light: '#FFFFFF' },
  });

  return (
    <div className={`${BLOCK_CLASS} mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10`}>
      {/* Only the poster and the card are printed. */}
      <style>{`@media print {
        header, footer, nav, .no-print { display: none !important; }
        body { background: #fff !important; }
        .print-page { break-after: page; box-shadow: none !important; border: none !important; }
      }`}</style>

      <div className="no-print">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Managing</p>
        <h1 className="font-display text-2xl font-semibold text-ink">{restaurant.name}</h1>
        <ManageTabs slug={restaurant.slug} active="poster" />
        <p className="mt-5 text-sm text-muted">
          Print this and put it where people wait. Scans from this poster cost you 30p, not £1.
        </p>
        <div className="mt-3">
          <PrintButton />
        </div>
      </div>

      <section className="print-page mx-auto mt-6 max-w-[560px] rounded-3xl border border-line bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="flex justify-center">
          <LogoLockup tone="light" />
        </div>
        <p className="mt-6 font-display text-[1.9rem] font-semibold leading-tight text-ink">
          {deal ? deal.title : `Find ${restaurant.name} on YepItsHalal`}
        </p>
        {deal && (
          <p className="mt-2 text-base text-muted">
            {dealRules(deal)
              .filter((l) => !l.startsWith('Free to claim'))
              .join(' ')}
          </p>
        )}
        <div
          className="mx-auto mt-6 w-[260px] max-w-full [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label={`QR code for ${restaurant.name} on YepItsHalal`}
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <p className="mt-4 text-lg font-semibold text-ink">
          {deal ? 'Scan with your phone camera to get your code' : 'Scan to see our halal information'}
        </p>
        <p className="mt-1 text-sm text-muted">Show the code at the till. Free, no sign up.</p>
      </section>

      <section className="print-page mx-auto mt-6 max-w-[560px] rounded-3xl border border-dashed border-black/20 bg-white p-8">
        <p className="font-display text-xl font-semibold text-ink">For staff: how to confirm a deal</p>
        <ol className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink">
          <li>
            <strong>1.</strong> The diner shows a YepItsHalal code on their phone.
          </li>
          <li>
            <strong>2.</strong> Check the bill is big enough{deal && deal.min_spend_pence > 0 ? ` (at least ${money(deal.min_spend_pence)})` : ''}.
          </li>
          <li>
            <strong>3.</strong> On their phone, type the PIN. Cover the screen while you type.
          </li>
          <li>
            <strong>4.</strong> Tick the box and tap <strong>Confirm the deal</strong>.
          </li>
          <li>
            <strong>5.</strong> The screen turns green. Give the deal.
          </li>
        </ol>
        <p className="mt-5 rounded-xl bg-sand p-3 text-sm text-ink">
          Your manager tells you the PIN. Never write it on this card.
        </p>
        <p className="mt-3 text-sm text-muted">
          Code already used today, or it ran out? The phone will say so. Then do not give the deal.
        </p>
      </section>
    </div>
  );
}
