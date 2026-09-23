import type { Metadata } from 'next';
import Link from 'next/link';
import { HalalBadge } from '@/components/HalalBadge';

export const metadata: Metadata = {
  title: 'How we label halal places',
  description:
    'What Fully Halal, Halal Options, Unverified and Worth asking mean on YepItsHalal, where the evidence comes from, and what we do not know.',
  alternates: { canonical: '/how-we-check' },
};

const LABELS = [
  {
    classification: 'fully_halal' as const,
    needs: 'Strong evidence that all the meat served is halal.',
    examples: 'Halal certification we have confirmed, our own check, or the restaurant clearly saying all its meat is halal with nothing on its site suggesting otherwise.',
  },
  {
    classification: 'halal_options' as const,
    needs: 'Halal food is served, but so is food that is not halal.',
    examples: 'The restaurant says it has halal options or a halal menu, or its site mentions halal food alongside pork or non-halal meat.',
  },
  {
    classification: 'unverified' as const,
    needs: 'There are signs of halal food, but not enough to say more.',
    examples: 'A mention of halal on its website, "halal" in its name, a community tag on OpenStreetMap, or a halal category in public place data.',
  },
  {
    classification: 'unknown' as const,
    needs: 'It serves a kind of food often halal in London, and nobody has checked it.',
    examples: 'A kebab shop, a Pakistani grill, a peri peri chicken shop. It is why the place is here at all, and it is a reason to ask, not an answer. Places that say they are not halal are never shown.',
  },
];

const SOURCES = [
  ["The restaurant's own website", 'We read what restaurants publish about themselves and quote it, with a link and the date we read it.'],
  ['Certification', 'Only shown as certification when it has been confirmed with the certifier. A restaurant saying it is certified is shown as exactly that.'],
  ['Our own checks', 'When we have checked a place ourselves, the page says how and when.'],
  ['OpenStreetMap', 'Community mappers sometimes tag places as halal. Useful, but it counts as weak evidence.'],
  ['Public place data', 'Datasets from the Overture Maps Foundation sometimes categorise places as halal. Also weak evidence.'],
  ['People who tell us', 'Owners and customers can send us details. We review every submission, and a listing that rests on one alone stays Unverified until something stronger arrives.'],
];

export default function HowWeCheckPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-balance font-display text-3xl font-semibold text-ink sm:text-4xl">
        How we label halal places
      </h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted">
        Every place tells you what we know, how we know it, and when it was checked. If we
        don&apos;t know something, we say so.
      </p>

      {/* The single most important thing a visitor could misunderstand, at the
          top of the page that exists to prevent that misunderstanding. */}
      <div className="mt-6 rounded-2xl border-2 border-halal-unverified/25 bg-halal-unverifiedSoft p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          We haven&apos;t visited any of these restaurants yet
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
          Everything on this site so far comes from what restaurants publish about themselves and
          from open data: their own websites, OpenStreetMap, and the Food Standards Agency&apos;s
          hygiene register. Nobody from YepItsHalal has walked into a kitchen, rung a manager or
          read a certificate. We are starting with what can be gathered honestly at scale, and
          saying exactly where it came from.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
          When that changes for a place, you will see it. A listing we have checked ourselves
          carries a <span className="font-semibold text-accent-ink">Checked by us</span> badge in
          search results and on its page, with the date and what we did. No badge means no visit,
          however confident the label above it looks.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">What each label means</h2>
        <dl className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          {LABELS.map(({ classification, needs, examples }) => (
            <div key={classification} className="px-5 py-4">
              <dt>
                <HalalBadge classification={classification} size="md" />
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed">
                <p className="font-medium text-ink">{needs}</p>
                <p className="mt-1 text-muted">{examples}</p>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Unverified and Worth asking never mean a place isn&apos;t halal. When a restaurant, or a
          person who mapped it, says it doesn&apos;t serve halal food, we don&apos;t show it at all.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Where the evidence comes from</h2>
        <ul className="mt-4 space-y-3">
          {SOURCES.map(([title, body]) => (
            <li key={title} className="rounded-xl border border-line bg-white px-4 py-3">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Photos</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          When a restaurant hasn&apos;t sent us its own photos, we show a picture of the kind of food it
          serves, marked as an example. It is never the restaurant&apos;s own dish. Who took each one,
          and its licence, is on the{' '}
          <Link href="/image-credits" className="font-semibold text-accent-ink hover:underline">
            image credits
          </Link>{' '}
          page.
        </p>
      </section>

      {/* Two different questions, kept apart here as they are everywhere else:
          one of them is about meat, the other is about a room. */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Somewhere to pray</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Mosques and prayer spaces come from OpenStreetMap, the same open source as much of the
          restaurant data, and none of it touches a halal label: a mosque being near a restaurant
          says nothing about that restaurant&apos;s food. Hardly any of them carry opening times, a
          mosque listed as open may still be locked, and the doors being open is not the same as
          jamaat, so ring ahead for a particular prayer.{' '}
          <Link href="/prayer-spaces" className="font-semibold text-accent-ink hover:underline">
            All prayer spaces
          </Link>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Whether a restaurant has somewhere to pray inside comes from the people who go, through
          the same form as everything else. It shows who told us and when, and it is never
          confirmed by us unless the page says so. Nobody having told us is shown as exactly that,
          never as a no.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">What a label can&apos;t tell you</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Standards differ. Some people only eat hand-slaughtered meat, some avoid places that
          serve alcohol, and restaurants change suppliers. A label is a starting point built from
          the evidence we can see. The kitchen is the only one who can tell you for certain, so
          ask them.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Restaurant locations and details come from the Food Standards Agency food hygiene
          register (Open Government Licence), OpenStreetMap contributors (ODbL) and the Overture
          Maps Foundation.
        </p>
      </section>

      <p className="mt-10 text-sm">
        <Link href="/submit-restaurant" className="font-semibold text-accent-ink hover:underline">
          Spotted something wrong, or run a restaurant? Tell us
        </Link>
      </p>
    </div>
  );
}
