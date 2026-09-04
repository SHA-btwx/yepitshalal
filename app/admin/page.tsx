import Link from 'next/link';

export default function AdminHome() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Admin</h1>
      <p className="mt-1 text-sm text-ink/55">
        This surface has no auth gate yet — add a role check before deploying anywhere public.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/admin/queue" className="rounded-2xl border border-black/10 bg-white p-5 hover:border-ink/30">
          <h2 className="font-display font-semibold text-ink">Verification queue</h2>
          <p className="mt-1 text-sm text-ink/55">Free + priority requests, assign, review, publish.</p>
        </Link>
        <Link href="/admin/restaurants" className="rounded-2xl border border-black/10 bg-white p-5 hover:border-ink/30">
          <h2 className="font-display font-semibold text-ink">Restaurants</h2>
          <p className="mt-1 text-sm text-ink/55">View, edit, and manage the restaurant database.</p>
        </Link>
        <Link href="/admin/offers" className="rounded-2xl border border-black/10 bg-white p-5 hover:border-ink/30">
          <h2 className="font-display font-semibold text-ink">Yep+ offers</h2>
          <p className="mt-1 text-sm text-ink/55">Create and manage exclusive member offers.</p>
        </Link>
        <Link href="/admin/subscriptions" className="rounded-2xl border border-black/10 bg-white p-5 hover:border-ink/30">
          <h2 className="font-display font-semibold text-ink">Subscriptions</h2>
          <p className="mt-1 text-sm text-ink/55">Basic visibility of Yep+ members.</p>
        </Link>
      </div>
    </div>
  );
}
