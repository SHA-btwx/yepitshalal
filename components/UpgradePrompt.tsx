import Link from 'next/link';

export function UpgradePrompt({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href="/yep-plus"
        className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-accent-ink hover:shadow-md"
      >
        <div>
          <p className="text-sm font-semibold">Go further with Yep+</p>
          <p className="text-xs text-white/70">See halal spots anywhere · from £4.99/month</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          Upgrade
        </span>
      </Link>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-ink to-accent-ink p-6 text-center text-white shadow-sm">
      <p className="font-display text-lg font-semibold">Go further with Yep+</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-white/80">
        See halal restaurants anywhere in London, not just nearby.
      </p>
      <p className="mt-3 text-sm font-medium text-white/90">
        £4.99/month <span className="text-white/50">or</span> £39.99/year
      </p>
      <Link
        href="/yep-plus"
        className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink transition hover:bg-white/90 active:scale-[0.98]"
      >
        See what you get
      </Link>
    </div>
  );
}
