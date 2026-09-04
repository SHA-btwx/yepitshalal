import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/require-admin';
import { AdminNav } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

// Admin is behind an auth check, but a stray crawler following a leaked link
// should still be told not to index it.
export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
