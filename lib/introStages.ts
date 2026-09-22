/**
 * The four stages of the introduction, and the argument they make.
 *
 * This is the site's positioning compressed into about ninety seconds, in the
 * order the vault says the homepage already makes it: the problem with a halal
 * sign, the method that answers it, what it costs (nothing), and then the one
 * ask. It is AIDA, the same as the page underneath, because a visitor who
 * skips the introduction should not arrive at a different argument.
 *
 * Two rules it is written under, both standing:
 *
 *  - No invented proof. Every number below is queried from the live database,
 *    not estimated, and it includes the unflattering one. "Nobody from here has
 *    visited any of them" is the single most distinctive thing the site can say
 *    and the thing every competitor avoids saying, so it goes in stage two
 *    rather than being buried.
 *  - The ShareTheMeal line is us donating to them. Never a partnership, never
 *    an endorsement, and never a running total of meals, because nothing
 *    measures one.
 *
 * Stage four presents the supporter tier in full rather than teasing it: the
 * price, what it does, and what it explicitly does not unlock. The button goes
 * to /yep-plus rather than straight into a checkout. That is deliberate while
 * the Stripe price and the advertised price disagree, see lib/supporterPricing.
 */

export interface IntroStage {
  /** Short, for the progress rail and the aria label. */
  name: string;
  headline: string;
  body: string;
  /** Real figures only, each one queried rather than remembered. */
  facts?: { value: string; label: string }[];
  /** Stage four only. */
  cta?: { label: string; href: string };
  dismiss: string;
}

export function introStages(counts: {
  searchable: number;
  withEvidence: number;
  boroughs: number;
  prayerSpaces: number;
  checkedByUs: number;
}): IntroStage[] {
  const n = (v: number) => v.toLocaleString('en-GB');

  return [
    {
      name: 'The problem',
      headline: 'A “halal” sign is a claim, not an answer.',
      body: "It doesn't say who checked, or when, or what they actually looked at. Most places that list halal food simply repeat the sign back to you and leave the rest to hope.",
      dismiss: 'Skip',
    },
    {
      name: 'The method',
      headline: 'So we show our working.',
      body: 'Every place carries its label, the evidence underneath it, and the date that evidence was read. Where we do not know, it says so, and says why the place is on the list at all.',
      facts: [
        { value: n(counts.searchable), label: 'places in London' },
        { value: n(counts.withEvidence), label: 'with evidence on record' },
        { value: n(counts.checkedByUs), label: 'visited by us so far' },
      ],
      dismiss: 'Skip',
    },
    {
      name: 'What it costs',
      headline: 'Free, at any distance, with no account.',
      body: 'Search anywhere in London and see what each label rests on. Every listing also carries the nearest place to pray. There is no paywall on a halal answer and there will not be one.',
      facts: [
        { value: n(counts.boroughs), label: 'boroughs covered' },
        { value: n(counts.prayerSpaces), label: 'mosques on the map' },
        { value: '£0', label: 'to use, always' },
      ],
      dismiss: 'Skip',
    },
    {
      name: 'The ask',
      headline: 'Checking costs money. Searching never will.',
      body: 'Yep+ is £2.99 a month and unlocks absolutely nothing: no extra distance, no hidden listings, no members-only anything. It pays for the phone calls and the visits that turn a guess into evidence. Supporters also choose the area we check next, and we donate a meal through ShareTheMeal for every month of support.',
      cta: { label: 'See what support pays for', href: '/yep-plus' },
      dismiss: 'Start searching',
    },
  ];
}
