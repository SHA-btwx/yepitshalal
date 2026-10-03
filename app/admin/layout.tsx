import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/require-admin';
import { AdminNav } from '@/components/admin/AdminNav';
import { BLOCK_CLASS } from '@/lib/analytics/scrub';
import { waitingCounts } from '@/lib/admin/stats';

export const dynamic = 'force-dynamic';

// Admin is behind an auth check, but a stray crawler following a leaked link
// should still be told not to index it.
export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const counts = await waitingCounts();
  // Submitters' email addresses and messages: session recordings show all of
  // admin as an empty box (BLOCK_CLASS in lib/analytics/scrub.ts).
  return (
    <div className={`${BLOCK_CLASS} lg:flex lg:items-start`}>
      <AdminNav counts={counts} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
