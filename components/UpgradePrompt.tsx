import Link from 'next/link';
import { SparkleIcon, ArrowRightIcon } from './icons';

export function UpgradePrompt({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href="/yep-plus"
        className="group flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-accent-ink hover:shadow-md"
      >
        <span className="flex items-start gap-2.5">
          <SparkleIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent-onDark" />
          <span>
            <span className="block text-sm font-semibold">Go further with Yep+</span>
            <span className="block text-xs text-white/75">
              Halal spots anywhere in London · from £4.99/month
            </span>
          </span>
        </span>
        <ArrowRightIcon className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
      </Link>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-ink to-accent-ink p-6 text-center text-white shadow-sm">
      <SparkleIcon className="mx-auto h-6 w-6 text-accent-onDark" />
      <p className="mt-2 font-display text-lg font-semibold">That distance is a Yep+ thing</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-white/85">
        Free covers what&apos;s nearby. Yep+ shows halal restaurants anywhere in London.
      </p>
      <p className="mt-3 text-sm font-medium text-white">
        £4.99/month <span className="text-white/60">or</span> £39.99/year
      </p>
      <Link
        href="/yep-plus"
        className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-sm font-semibold text-ink transition hover:bg-white/90 active:scale-[0.98]"
      >
        See what you get
      </Link>
    </div>
  );
}
