import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClaim } from '@/lib/deals/data';
import { readDeviceHash } from '@/lib/deals/device';
import { dealRules } from '@/lib/deals/terms';
import { BLOCK_CLASS } from '@/lib/analytics/scrub';
import { ClaimScreen } from '@/components/deals/ClaimScreen';

// The diner's code. It only works on the phone that claimed it: the page
// compares this phone's cookie with the one the code was made for. Never
// indexed, never recorded (staff type a PIN here).

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your deal code',
  robots: { index: false, follow: false },
};

export default async function DealCodePage({ params }: { params: { code: string } }) {
  const claim = await getClaim(params.code);
  if (!claim) notFound();
  const mine = !!claim.device_hash && readDeviceHash() === claim.device_hash;

  return (
    <div className={`${BLOCK_CLASS} mx-auto w-full max-w-md px-4 pb-16 pt-6 sm:pt-10`}>
      <ClaimScreen
        code={claim.code}
        status={claim.status}
        mine={mine}
        expiresAt={claim.expires_at}
        redeemedAt={claim.redeemed_at}
        reported={!!claim.reported_at}
        title={claim.deal.title}
        minSpendPence={claim.deal.min_spend_pence}
        rules={dealRules(claim.deal)}
        restaurant={claim.restaurant}
      />
    </div>
  );
}
