'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import clsx from 'clsx';
import { NavigationIcon } from './icons';

// "Where can I pray, right now, from here?"
//
// Most people would reach for a maps app for this, and they should: a maps app
// knows about the traffic and the turnings and we do not. What this is for is
// the moment the question comes up while you are already here, deciding where
// to eat. One tap, your location, the nearest mosques in walking order.
//
// It asks the browser for a location and never stores one. If the person says
// no, or the browser cannot tell, it falls through to the borough list rather
// than nagging: a refusal is an answer, not an error to recover from.
//
// It says what it is doing the whole way, "Finding you…" while the browser
// locates, then "Finding mosques…" until the list is on screen, and the page
// it opens leads with the list (app/prayer-spaces, 2026-09-24).

export function NearestMosqueButton({
  label = 'Find the nearest mosque',
  variant = 'solid',
  className,
}: {
  label?: string;
  /** 'onDark' is for the forest page header, where a dark button would vanish. */
  variant?: 'solid' | 'quiet' | 'onDark';
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'locating' | 'refused'>('idle');
  const [searching, startSearch] = useTransition();

  function locate() {
    if (!('geolocation' in navigator)) {
      router.push('/prayer-spaces');
      return;
    }
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setState('idle');
        startSearch(() => router.push(`/prayer-spaces?lat=${latitude.toFixed(5)}&lng=${longitude.toFixed(5)}&label=you`));
      },
      () => {
        setState('refused');
        router.push('/prayer-spaces');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  return (
    <button
      type="button"
      onClick={locate}
      disabled={state === 'locating' || searching}
      aria-live="polite"
      className={clsx(
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-70',
        variant === 'solid' && 'bg-ink text-white hover:bg-accent-ink',
        variant === 'quiet' && 'border border-line bg-white text-ink hover:border-ink/30',
        variant === 'onDark' && 'min-h-[48px] bg-white px-6 text-ink shadow-sm hover:-translate-y-px hover:bg-sand-soft hover:shadow-md',
        className
      )}
    >
      <NavigationIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {state === 'locating' ? 'Finding you…' : searching ? 'Finding mosques…' : label}
    </button>
  );
}
