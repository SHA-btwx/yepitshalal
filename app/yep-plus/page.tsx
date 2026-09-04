import type { Metadata } from 'next';
import { CheckIcon, SparkleIcon, HeartHandIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Yep+',
  description:
    'Yep+ removes the distance limit on halal restaurant search across London and unlocks member-only deals. From £4.99/month.',
};

const FREE_FEATURES = [
  'Find restaurants near you',
  'Map view',
  'Restaurant details',
  'Halal info',
  'Photos and videos',
  'Search by name or food type',
  'See restaurants up to 1 mile away',
  'Or 0.5 miles when you search another place',
];

const PLUS_FEATURES = [
  'Everything in Free',
  'See restaurants anywhere in London',
  'Special deals just for members',
  'Member discount codes',
  'See new things first',
];

export default function YepPlusPage({ searchParams }: { searchParams: { checkout?: string } }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      {searchParams.checkout === 'not_configured' && (
        <p
          role="alert"
          className="mb-6 rounded-xl bg-halal-partialSoft px-4 py-3 text-sm font-medium text-halal-partialInk ring-1 ring-halal-partial/20"
        >
          Yep+ payments aren&apos;t switched on yet — please check back soon.
        </p>
      )}

      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-ink">
          <SparkleIcon className="h-3.5 w-3.5" />
          Yep+
        </span>
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
          No limits. Just halal food.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-muted sm:text-base">
          Halal info is always free for everyone. Yep+ just removes the distance limit and unlocks
          member-only deals.
        </p>
        <p className="mx-auto mt-5 flex max-w-md items-start justify-center gap-2 text-sm leading-relaxed text-ink/75">
          <HeartHandIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent-ink" />
          <span>
            Every Yep+ subscription funds a meal through{' '}
            <a
              href="https://sharethemeal.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent-ink underline decoration-accent underline-offset-2 hover:text-ink"
            >
              ShareTheMeal
            </a>
            , the UN World Food Programme&apos;s hunger charity.
          </span>
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink">Yep Free</h2>
          <p className="mt-1 text-2xl font-semibold text-ink">£0</p>
          <ul className="mt-5 space-y-2.5 text-sm text-ink/80">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-halal-fullInk" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl border-2 border-ink bg-ink p-6 text-white shadow-lg shadow-black/10">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
            Best value: Annual
          </span>
          <h2 className="font-display text-lg font-semibold">Yep+</h2>
          <p className="mt-1 text-2xl font-semibold">
            £4.99<span className="text-base font-normal text-white/70">/month</span>
          </p>
          <p className="text-sm text-white/75">
            or <span className="font-semibold text-white">£39.99/year</span>{' '}
            <span className="text-white/60">(save about a third)</span>
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-white/90">
            {PLUS_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-onDark" />
                {f}
              </li>
            ))}
          </ul>
          <form action="/api/checkout/yep-plus" method="POST" className="mt-6 space-y-2">
            <button
              name="plan"
              value="annual"
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/90 active:scale-[0.98]"
            >
              Get Yep+ annual — £39.99/year
            </button>
            <button
              name="plan"
              value="monthly"
              className="w-full rounded-full border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              Get Yep+ monthly — £4.99/month
            </button>
          </form>
          <p className="mt-3 text-center text-xs text-white/60">Cancel any time.</p>
        </div>
      </div>
    </div>
  );
}
