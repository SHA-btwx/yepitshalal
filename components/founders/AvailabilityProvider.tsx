'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isOpen, type Availability } from '@/lib/founders';

// The live Founder count, shared by everything on /founders that shows it.
//
// The server reads it from the database for every page load, so the first
// paint is already true. After that it is read again whenever it could have
// gone stale: when the tab comes back into view, when the page is restored
// from the back button, when somebody starts the form, once a minute while the
// page is on screen, and from the answer to a claim. None of this decides
// anything: a claim is settled by the database, and the number here only ever
// reflects what the database last said.
//
// When the programme fills (or a released spot opens it again) the
// server-rendered parts of the page change too, so the page refreshes its
// server content in place. What somebody has typed is kept.

const POLL_MS = 60_000;

interface AvailabilityContextValue {
  /** Null when the count could not be read. */
  availability: Availability | null;
  /** Read the count again now. */
  refresh: () => Promise<Availability | null>;
  /** Take a count the server has just returned. */
  apply: (next: Availability) => void;
  /** How the visitor arrived (?src=), if the link said. */
  source: string | null;
}

const AvailabilityContext = createContext<AvailabilityContextValue | null>(null);

export function AvailabilityProvider({
  initial,
  source,
  children,
}: {
  initial: Availability | null;
  source: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [availability, setAvailability] = useState<Availability | null>(initial);
  const last = useRef<Availability | null>(initial);

  const apply = useCallback(
    (next: Availability) => {
      const prev = last.current;
      last.current = next;
      setAvailability(next);
      if (prev && isOpen(prev) !== isOpen(next)) router.refresh();
    },
    [router]
  );

  // A server refresh brings a new reading with it; it wins.
  useEffect(() => {
    if (initial && (initial.claimed !== last.current?.claimed || initial.cap !== last.current?.cap)) {
      apply(initial);
    }
  }, [initial, apply]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/founders', { cache: 'no-store' });
      if (!res.ok) return null;
      const json = (await res.json()) as Partial<Availability>;
      if (typeof json.claimed !== 'number' || typeof json.cap !== 'number') return null;
      const next = { claimed: json.claimed, cap: json.cap };
      apply(next);
      return next;
    } catch {
      return null;
    }
  }, [apply]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onShow);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onShow);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <AvailabilityContext.Provider value={{ availability, refresh, apply, source }}>
      {children}
    </AvailabilityContext.Provider>
  );
}

export function useAvailability(): AvailabilityContextValue {
  const ctx = useContext(AvailabilityContext);
  if (!ctx) throw new Error('useAvailability must be used inside AvailabilityProvider');
  return ctx;
}
