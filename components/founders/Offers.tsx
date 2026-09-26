import clsx from 'clsx';
import { CheckIcon } from '../icons';
import { Free } from '../Free';

// What each kind of restaurant gets, in one place, so the hero, the benefits,
// the form and its answer all say the same thing.
//
// The line between the two lists is the promise this page makes: nothing in
// FOUNDER_ONLY is ever offered to a standard listing, and nothing in STANDARD
// is presented as a Founder perk. The reel numbers are the ones the database
// enforces: reel_allowance_free (1) and reel_allowance_founder (3), 0050.

type Tone = 'light' | 'dark';

export function standardOffer(tone: Tone = 'light'): React.ReactNode[] {
  return [
    <>
      A <Free tone={tone}>free</Free> listing and profile in the London directory
    </>,
    <>Your location and opening hours</>,
    <>Your menu</>,
    <>Your halal information, with the evidence behind your label</>,
    <>
      <Free tone={tone}>1 free reel</Free> on your page, and in Discover when it opens
    </>,
  ];
}

// A free listing is not on this list: every restaurant gets one, Founder or
// not, and saying otherwise would suggest listings might one day cost money.
// Listings, halal information and search stay free for everyone.
export function founderOnly(tone: Tone = 'light'): React.ReactNode[] {
  return [
    <>A Founder number, from 1 to 100, and the status for life</>,
    <>
      <Free tone={tone}>3 reel slots, free forever</Free>, instead of 1
    </>,
    // "Priority" is about when, never where: Discover's order has no paid or
    // perk-based ranking (lib/reels.ts), so Founders' reels are reviewed and
    // live first when it opens, and are shown by the same rules as anyone's.
    <>Your reels reviewed first when Discover opens</>,
    <>Your food promoted on YepItsHalal&apos;s own channels</>,
    <>A direct WhatsApp and Instagram line to Shabir</>,
  ];
}

export function OfferList({
  items,
  tone = 'light',
  className,
}: {
  items: React.ReactNode[];
  tone?: Tone;
  className?: string;
}) {
  return (
    <ul className={clsx('space-y-2.5 text-[15px] leading-snug', tone === 'dark' ? 'text-white/85' : 'text-ink/80', className)}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <CheckIcon
            className={clsx('mt-0.5 h-[18px] w-[18px] shrink-0', tone === 'dark' ? 'text-accent-onDark' : 'text-accent-ink')}
            strokeWidth={2}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
