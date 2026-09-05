import type { Metadata } from 'next';
import Link from 'next/link';
import { SparkleIcon, CheckIcon, SealCheckIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'For restaurants',
  description:
    'How reels work on YepItsHalal — every restaurant gets one free, partners get more room to show what they serve.',
};

const FREE = [
  'Your listing, with halal information',
  '1 reel, live on your page',
  'That reel is eligible for Discovery',
  'Request verification',
];

const PARTNER = [
  'More reels — signature dishes, prep, atmosphere, new menu items',
  'Every reel is independently eligible for Discovery',
  'A "Latest from you" section on your restaurant page',
  'Seasonal and promotional content, swapped whenever you like',
];

export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-ink">
          <SparkleIcon className="h-3.5 w-3.5" />
          For restaurants
        </span>
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
          Show people what you actually serve.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-[15px] leading-relaxed text-muted sm:text-base">
          A photo tells someone a restaurant exists. A reel shows them the food coming out of your
          kitchen — which is what people are really deciding on.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink">Free</h2>
          <p className="mt-1 text-sm text-muted">Every listed restaurant, no cost.</p>
          <ul className="mt-5 space-y-2.5 text-sm text-ink/80">
            {FREE.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-halal-fullInk" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border-2 border-ink bg-ink p-6 text-white shadow-lg shadow-black/10">
          <h2 className="font-display text-lg font-semibold">Partner</h2>
          <p className="mt-1 text-sm text-white/75">More room to sell the place.</p>
          <ul className="mt-5 space-y-2.5 text-sm text-white/90">
            {PARTNER.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-onDark" />
                {f}
              </li>
            ))}
          </ul>
          {/* No price stated: none exists in the product spec yet, and inventing
              one on a live site would be a commitment nobody has made. */}
          <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/85">
            Partnerships are being set up restaurant by restaurant while we get this right. Get in
            touch and we will talk it through.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-white/60 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <SealCheckIcon className="h-5 w-5 text-accent-ink" />
          What a partnership does not buy
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          It has no effect on your halal classification, on whether you get verified, or on how
          quickly your verification is reviewed. Those work the same way for every restaurant on
          the platform, paying or not. Reels are reviewed before they go live either way. Paying
          buys room to market yourself — nothing about how we describe your food.
        </p>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/submit-restaurant"
          className="inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink"
        >
          Add your restaurant
        </Link>
      </div>
    </div>
  );
}
