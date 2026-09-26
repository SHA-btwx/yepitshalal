'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, m } from 'motion/react';
import { ArrowRightIcon, LockIcon } from '../icons';
import { LogoBadge } from '../Logo';
import { heroPrimary } from './styles';
import { useAvailability } from './AvailabilityProvider';
import { trackFounders, type FoundersEvent } from './track';
import { FOUNDER, FOUNDERS_CAP, isOpen, spotsLabel, spotsLeft } from '@/lib/founders';

// The pieces of /founders that show the live count, or change with it. Each
// reads the one shared reading in AvailabilityProvider, so the badge, the
// meter, the buttons and the form can never disagree with each other.

const ARRIVE = [0.22, 1.12, 0.36, 1] as const;

/**
 * A number that rolls when it changes: the old one lifts away, the new one
 * rises in. It only ever changes because a restaurant joined. Screen readers
 * get the plain number; the moving copies are hidden from them.
 */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span className={clsx('relative inline-block tabular-nums', className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-grid">
        <AnimatePresence initial={false}>
          <m.span
            key={value}
            className="[grid-area:1/1]"
            initial={{ opacity: 0, y: '0.5em' }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.42, ease: ARRIVE } }}
            exit={{ opacity: 0, y: '-0.5em', transition: { duration: 0.2, ease: 'easeIn' } }}
          >
            {value}
          </m.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

/** One event when the page opens: whether spots were open, and how they got here. */
export function FoundersPageView() {
  const { availability, source } = useAvailability();
  useEffect(() => {
    trackFounders('founders_page_viewed', {
      state: availability ? (isOpen(availability) ? 'open' : 'full') : 'unknown',
      remaining: availability ? spotsLeft(availability) : null,
      source,
    });
    // Once per page view, with the count as it was on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** The pill at the top of the page: private, and how many are left. */
export function SpotsBadge() {
  const { availability } = useAvailability();
  const full = availability ? !isOpen(availability) : false;

  return (
    <p className="inline-flex max-w-full animate-fade-up items-center gap-2.5 rounded-full bg-white/10 py-1.5 pl-3 pr-3.5 text-[13px] font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm">
      <LockIcon className="h-4 w-4 shrink-0 text-accent-onDark" />
      <span className="whitespace-nowrap">{full ? 'Founder spots are full' : 'Private Founder access'}</span>
      {availability && !full && (
        <>
          <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-white/25" />
          <span className="whitespace-nowrap text-accent-onDark">
            {availability.claimed === 0 ? (
              <>All {availability.cap} spots open</>
            ) : (
              <>
                <AnimatedNumber value={spotsLeft(availability)} /> of {availability.cap} left
              </>
            )}
          </span>
        </>
      )}
    </p>
  );
}

/** The count in a sentence, for the benefits heading. */
export function SpotsInline() {
  const { availability } = useAvailability();
  if (!availability) return <>Reserved for the first {FOUNDERS_CAP} London food businesses.</>;
  if (!isOpen(availability)) return <>All {availability.cap} spots have been claimed.</>;
  if (availability.claimed === 0) {
    return (
      <>
        Reserved for the first {availability.cap}.{' '}
        <strong className="font-semibold text-ink">All {availability.cap} are still open.</strong>
      </>
    );
  }
  return (
    <>
      Reserved for the first {availability.cap}:{' '}
      <strong className="font-semibold text-ink">
        <AnimatedNumber value={spotsLeft(availability)} /> {spotsLeft(availability) === 1 ? 'spot' : 'spots'} still open.
      </strong>
    </>
  );
}

/**
 * The count as a picture: one square per spot, filled for each restaurant
 * that has joined. Real squares for real sign-ups, nothing else.
 */
export function SpotsMeter({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { availability } = useAvailability();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const dark = tone === 'dark';

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || seen.current) return;
        seen.current = true;
        io.disconnect();
        trackFounders('founders_availability_viewed', {
          remaining: availability ? spotsLeft(availability) : null,
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
    // Once per visit, with the count as it stood when it was seen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!availability) {
    return (
      <div ref={ref} className={clsx('rounded-2xl p-6', dark ? 'bg-white/[0.06] ring-1 ring-white/15' : 'bg-white ring-1 ring-sand-line')}>
        <p className={clsx('font-display text-xl font-semibold', dark ? 'text-white' : 'text-ink')}>
          The live count didn&apos;t load just now.
        </p>
        <p className={clsx('mt-2 text-[15px] leading-relaxed', dark ? 'text-white/75' : 'text-muted')}>
          Refresh the page to try again. Your claim doesn&apos;t depend on it: the moment you send the
          form, our database decides which spot is yours.
        </p>
      </div>
    );
  }

  const { claimed, cap } = availability;
  const left = spotsLeft(availability);
  const full = left === 0;

  return (
    <div ref={ref}>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={clsx(
            'font-display text-[4.25rem] font-semibold leading-none tracking-[-0.03em] sm:text-[5.5rem]',
            dark ? 'text-white' : 'text-ink'
          )}
        >
          <AnimatedNumber value={full ? cap : left} />
        </span>
        <span className={clsx('font-display text-xl font-semibold sm:text-2xl', dark ? 'text-white' : 'text-ink')}>
          {full ? `of ${cap} Founder spots taken` : `of ${cap} Founder spots left`}
        </span>
      </p>

      <div
        role="img"
        aria-label={`${claimed} of ${cap} Founder spots claimed`}
        className="mt-6 grid max-w-[16.5rem] grid-cols-10 gap-1.5 sm:max-w-[23rem] sm:gap-2"
      >
        {Array.from({ length: cap }, (_, i) => (
          <span
            key={i}
            className={clsx(
              'aspect-square rounded-[5px] transition-[background-color,box-shadow,transform] duration-500 ease-arrive',
              i < claimed
                ? clsx('scale-100', dark ? 'bg-accent' : 'bg-forest')
                : clsx('scale-[0.9]', dark ? 'bg-white/[0.06] ring-1 ring-inset ring-white/15' : 'bg-white ring-1 ring-inset ring-sand-line')
            )}
          />
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {spotsLabel(availability)}
      </p>
      <p className={clsx('mt-4 max-w-md text-sm leading-relaxed', dark ? 'text-white/75' : 'text-muted')}>
        {full
          ? 'Every square is a restaurant that joined early. Thank you to all of them.'
          : 'Each filled square is a business that has joined. The number is read live from our database, and it only moves when a business does.'}
      </p>
    </div>
  );
}

/**
 * The invitation itself, as a card, beside the words on a large screen: the
 * logo, whose invitation it is, and the hundred spots as they stand.
 */
export function InvitationCard() {
  const { availability } = useAvailability();
  const claimed = availability?.claimed ?? 0;
  const cap = availability?.cap ?? 100;

  return (
    <div className="w-full max-w-[25rem] rotate-[-1.5deg] transition-transform duration-500 ease-out hover:rotate-0">
    <div className="ground-light relative animate-fade-up rounded-[28px] bg-white p-8 text-ink shadow-[0_2px_6px_rgba(4,24,30,0.2),0_40px_80px_-30px_rgba(4,24,30,0.7)] [animation-delay:160ms]">
      <div className="flex items-start justify-between gap-4">
        <LogoBadge size={88} decorative className="h-[88px] w-[88px] drop-shadow-[0_6px_10px_rgba(11,47,58,0.25)]" />
        <p className="pt-1 text-right text-xs font-semibold leading-relaxed text-subtle">
          By invitation of
          <br />
          {FOUNDER.name}
        </p>
      </div>
      <p className="mt-7 font-display text-[1.95rem] font-semibold leading-[1.05] tracking-[-0.015em]">
        The 100 Founders Club
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        For London&apos;s halal restaurants, cafes and food stalls. Free, for life.
      </p>
      <div className="mt-6 border-t border-line pt-5">
        <div aria-hidden="true" className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
          {Array.from({ length: cap }, (_, i) => (
            <span
              key={i}
              className={clsx('aspect-square rounded-[2px]', i < claimed ? 'bg-forest' : 'bg-sand ring-1 ring-inset ring-sand-line')}
            />
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold text-ink">
          {availability ? spotsLabel(availability) : 'Spots are limited to 100'}
        </p>
      </div>
    </div>
    </div>
  );
}

/** A link that says which part of the page was used, and nothing about who. */
export function TrackedLink({
  event,
  props,
  ...rest
}: { event: FoundersEvent; props?: Record<string, string | number | boolean | null> } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...rest} onClick={() => trackFounders(event, props)} />;
}

/** The hero's main button: claim while spots are left, list for free after. */
export function ClaimCta({ id, where }: { id?: string; where: string }) {
  const { availability } = useAvailability();
  const full = availability ? !isOpen(availability) : false;
  return (
    <a
      id={id}
      href="#claim"
      onClick={() => trackFounders(full ? 'founders_standard_cta_clicked' : 'founders_cta_clicked', { where })}
      className={clsx(heroPrimary, 'min-h-[52px] w-full text-[15px] sm:w-auto')}
    >
      {full ? 'List my restaurant for free' : 'Claim your Founder spot'}
      <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
    </a>
  );
}

/**
 * On a phone, once the first button has scrolled away, the way to claim stays
 * in reach at the bottom of the screen. It steps aside while the form is on
 * screen, and for good once somebody has scrolled past it.
 */
export function StickyClaimBar() {
  const { availability } = useAvailability();
  const [show, setShow] = useState(false);
  const full = availability ? !isOpen(availability) : false;

  useEffect(() => {
    const hero = document.getElementById('hero-cta');
    const claim = document.getElementById('claim');
    if (!hero || !claim || typeof IntersectionObserver === 'undefined') return;
    let heroGone = false;
    let claimShowing = false;
    let pastClaim = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroGone = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === claim) {
          claimShowing = e.isIntersecting;
          pastClaim = !e.isIntersecting && e.boundingClientRect.top < 0;
        }
      }
      setShow(heroGone && !claimShowing && !pastClaim);
    });
    io.observe(hero);
    io.observe(claim);
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={clsx(
        'fixed inset-x-0 bottom-0 z-40 transition duration-300 ease-out sm:hidden',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      )}
    >
      <div className="ground-dark flex items-center gap-3 border-t border-white/10 bg-forest-deep/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-white/85">
          {availability ? (full ? 'Founder spots are full. Listing stays free.' : spotsLabel(availability)) : 'Private Founder access'}
        </p>
        <a
          href="#claim"
          tabIndex={show ? 0 : -1}
          onClick={() => trackFounders(full ? 'founders_standard_cta_clicked' : 'founders_cta_clicked', { where: 'sticky' })}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-forest-deep transition active:scale-[0.985]"
        >
          {full ? 'List for free' : 'Claim your spot'}
          <ArrowRightIcon className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
