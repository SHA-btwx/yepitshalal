import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckIcon, HeartHandIcon, MapPinIcon, SealCheckIcon, SparkleIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Support YepItsHalal',
  description:
    'Searching for halal food is free for everyone, everywhere in London. Yep+ supporters pay for the checking, fund a meal every month through ShareTheMeal, and choose the area we check next. From £2.99 a month.',
  alternates: { canonical: '/yep-plus' },
};

// Nothing on this page may promise something that does not exist. Every line
// below is either already true (the site is free, the vote works, the badge is
// on the account page) or worded as the intention it is.

const FREE_FOR_EVERYONE = [
  'Every place we know about, anywhere in London',
  'Every halal label, and the evidence behind it',
  'The map, the areas, opening hours and photos',
  'No account needed',
];

const SUPPORTER_GETS: { title: string; body: string }[] = [
  {
    title: 'A meal, every month',
    body: 'For every month of support we receive, we donate a meal through ShareTheMeal, the UN World Food Programme’s hunger app.',
  },
  {
    title: 'You choose where we check next',
    body: 'Each month supporters vote for an area, and the winner goes to the top of our checking queue. You vote from your account page.',
  },
  {
    title: 'A supporter badge',
    body: 'Your account shows the month you started. Quiet, but it is yours.',
  },
  {
    title: 'First look at new things',
    body: 'New features reach supporters before anyone else, and we ask you first when we are not sure about something.',
  },
  {
    title: 'Nothing sold to you',
    body: 'If we ever carry sponsored messages to pay the bills, supporters will not see them.',
  },
];

function Notice({ tone, children }: { tone: 'good' | 'warn'; children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className={
        tone === 'good'
          ? 'mb-6 rounded-xl bg-halal-fullSoft px-4 py-3 text-sm font-medium text-halal-fullInk ring-1 ring-halal-full/20'
          : 'mb-6 rounded-xl bg-halal-partialSoft px-4 py-3 text-sm font-medium text-halal-partialInk ring-1 ring-halal-partial/20'
      }
    >
      {children}
    </p>
  );
}

export default function YepPlusPage({ searchParams }: { searchParams: { checkout?: string } }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      {searchParams.checkout === 'success' && (
        <Notice tone="good">
          Thank you. Your support is set up.{' '}
          <Link href="/account" className="underline underline-offset-2">
            See it on your account
          </Link>
          .
        </Notice>
      )}
      {searchParams.checkout === 'cancelled' && (
        <Notice tone="warn">No payment was taken. You can start any time.</Notice>
      )}
      {searchParams.checkout === 'not_configured' && (
        <Notice tone="warn">Support payments aren&apos;t switched on yet. Please check back soon.</Notice>
      )}

      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-ink">
          <SparkleIcon className="h-3.5 w-3.5" />
          Yep+
        </span>
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
          The food info is free. Always.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-[15px] leading-relaxed text-muted sm:text-base">
          Nobody should have to pay to find out whether their dinner is halal. There is no locked
          distance, no members-only listing and no paywall anywhere on this site. Yep+ is for people
          who want to pay for the work anyway, so that the rest of us never have to.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink">Free for everyone</h2>
        <ul className="mt-4 grid gap-2.5 text-sm text-ink/80 sm:grid-cols-2">
          {FREE_FOR_EVERYONE.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-halal-fullInk" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-2xl bg-paper p-6 ring-1 ring-line">
        <h2 className="font-display text-lg font-semibold text-ink">What your money actually does</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          Checking a restaurant is slow work: reading what a place says about its meat, phoning to
          ask what its website does not say, and recording the answer with its source so you can
          judge it yourself. Support pays for that, and for the servers and maps underneath it.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          Nothing here buys a label. A restaurant cannot pay to be called halal, and neither can you.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[1.15fr_1fr]">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink">What supporters get</h2>
          <ul className="mt-4 space-y-4">
            {SUPPORTER_GETS.map((s) => (
              <li key={s.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{s.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="self-start rounded-2xl border-2 border-ink bg-ink p-6 text-white shadow-lg shadow-black/10">
          <h2 className="font-display text-lg font-semibold">Become a supporter</h2>
          <p className="mt-2 text-2xl font-semibold">
            £2.99<span className="text-base font-normal text-white/70">/month</span>
          </p>
          <p className="text-sm text-white/75">
            or <span className="font-semibold text-white">£24/year</span>{' '}
            <span className="text-white/60">(£2 a month)</span>
          </p>
          <form action="/api/checkout/yep-plus" method="POST" className="mt-5 space-y-2">
            <button
              name="plan"
              value="annual"
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/90 active:scale-[0.98]"
            >
              Support: £24 a year
            </button>
            <button
              name="plan"
              value="monthly"
              className="w-full rounded-full border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              Support: £2.99 a month
            </button>
          </form>
          <p className="mt-3 text-center text-xs text-white/60">
            Cancel any time. Stop, and nothing disappears: you keep the whole site, like everyone else.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-sm sm:flex-row sm:items-start">
        <HeartHandIcon className="h-6 w-6 shrink-0 text-accent-ink" />
        <div>
          <h2 className="font-display text-base font-semibold text-ink">About the meal</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            We donate a meal through{' '}
            <a
              href="https://sharethemeal.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent-ink underline decoration-accent underline-offset-2 hover:text-ink"
            >
              ShareTheMeal
            </a>
            , the UN World Food Programme&apos;s hunger app, for every month of support we receive.
            That is us giving to them. They have not partnered with us and have not endorsed us.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-black/10 p-6 text-center">
        <MapPinIcon className="mx-auto h-6 w-6 text-subtle" />
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Not ready to pay? Helping is still free.{' '}
          <Link href="/submit-restaurant" className="font-semibold text-accent-ink underline underline-offset-2">
            Add a place we&apos;re missing
          </Link>{' '}
          or tell us when we have something wrong. That is worth as much as the money.
        </p>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-subtle">
        <SealCheckIcon className="h-4 w-4" />
        Payments are handled by Stripe. We never see your card details.
      </p>
    </div>
  );
}
