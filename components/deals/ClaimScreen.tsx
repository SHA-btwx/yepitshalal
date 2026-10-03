'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { HalalBadge } from '@/components/HalalBadge';
import { ctaPrimary } from '@/components/cta';
import { fieldInput, formError } from '@/components/form';
import { ArrowLeftIcon, CheckIcon } from '@/components/icons';
import { track } from '@/lib/analytics/posthog';
import { money } from '@/lib/deals/rules';
import type { HalalStatus } from '@/lib/types';

type Status = 'claimed' | 'redeemed' | 'expired' | 'void';

interface Props {
  code: string;
  status: Status;
  mine: boolean;
  expiresAt: string;
  redeemedAt: string | null;
  reported: boolean;
  title: string;
  minSpendPence: number;
  rules: string[];
  restaurant: { name: string; slug: string; label: HalalStatus | null };
}

const londonTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).replace(' ', '');

const londonDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' });

function timeLeft(expiresAt: string, now: number): string | null {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} min left`;
  return `${Math.max(minutes, 1)} min left`;
}

export function ClaimScreen(props: Props) {
  const { code, mine, restaurant } = props;
  const [status, setStatus] = useState<Status>(props.status);
  const [redeemedAt, setRedeemedAt] = useState(props.redeemedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const left = status === 'claimed' ? timeLeft(props.expiresAt, now) : null;
  const shown = status === 'claimed' && !left ? 'expired' : status;

  return (
    <div>
      <Link
        href={`/restaurant/${restaurant.slug}`}
        className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-accent-ink hover:underline"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {restaurant.name}
      </Link>

      <div
        className={clsx(
          'mt-3 overflow-hidden rounded-3xl border shadow-sm',
          shown === 'redeemed' ? 'border-accent bg-accent' : 'border-line bg-white'
        )}
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={shown} />
            {restaurant.label && (
              <span className={clsx('rounded-full px-2 py-0.5', shown === 'redeemed' && 'bg-white/85')}>
                <HalalBadge classification={restaurant.label} size="sm" />
              </span>
            )}
          </div>
          <h1 className="mt-3 text-balance font-display text-2xl font-semibold leading-tight text-ink">{props.title}</h1>
          <p className="mt-1 text-sm text-ink/75">at {restaurant.name}</p>

          {shown === 'redeemed' && redeemedAt ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/90 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                <CheckIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-ink">Deal confirmed</p>
                <p className="text-sm text-ink/80">
                  {londonTime(redeemedAt)}, {londonDay(redeemedAt)}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-paper p-4 text-center ring-1 ring-line">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-subtle">Your code</p>
              <p className="mt-1 font-mono text-[2.4rem] font-semibold leading-none tracking-[0.18em] text-ink" aria-label={code.split('').join(' ')}>
                {code.slice(0, 3)}
                <span className="inline-block w-3" aria-hidden="true" />
                {code.slice(3)}
              </p>
              <p className="mt-2 text-sm font-medium text-muted">{left ?? (shown === 'void' ? 'Stopped' : 'Ran out')}</p>
            </div>
          )}

          <ul className="mt-4 space-y-0.5 text-sm text-ink/75">
            {props.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        {shown === 'claimed' && mine && (
          <StaffConfirm
            code={code}
            minSpendPence={props.minSpendPence}
            onDone={(at) => {
              setStatus('redeemed');
              setRedeemedAt(at);
              track('deal_redeemed');
            }}
          />
        )}
      </div>

      {!mine && (
        <p className="mt-4 rounded-2xl bg-sand p-4 text-sm leading-relaxed text-ink ring-1 ring-sand-line">
          This code was made on another phone, so it only works there. Want your own?{' '}
          <Link href={`/restaurant/${restaurant.slug}`} className="font-semibold text-accent-ink underline">
            Get a code
          </Link>
          .
        </p>
      )}

      {mine && (shown === 'expired' || shown === 'void') && (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {shown === 'void' ? 'This code stopped after too many wrong PINs.' : 'Codes last 48 hours.'}{' '}
          <Link href={`/restaurant/${restaurant.slug}`} className="font-semibold text-accent-ink underline">
            Get a new code
          </Link>
        </p>
      )}

      {shown === 'claimed' && mine && (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          At the till, show this screen. Staff type their PIN to confirm. It is free for you.
        </p>
      )}

      {mine && shown !== 'void' && <Report code={code} already={props.reported} />}
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, [string, string]> = {
    claimed: ['Ready to use', 'bg-spice text-white'],
    redeemed: ['Used', 'bg-ink text-white'],
    expired: ['Ran out', 'bg-halal-unverifiedSoft text-halal-unverifiedInk'],
    void: ['Stopped', 'bg-halal-unverifiedSoft text-halal-unverifiedInk'],
  };
  const [label, tone] = map[status];
  return <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', tone)}>{label}</span>;
}

function StaffConfirm({ code, minSpendPence, onDone }: { code: string; minSpendPence: number; onDone: (at: string) => void }) {
  const [pin, setPin] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return setError('Type the 4 number PIN.');
    if (!confirmed) return setError('Tap the box first.');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/deals/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin, confirmed: true }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; redeemedAt?: string; message?: string; error?: string; triesLeft?: number }
        | null;
      if (body?.ok && body.redeemedAt) {
        onDone(body.redeemedAt);
        return;
      }
      setPin('');
      if (body?.error === 'wrong_pin' && typeof body.triesLeft === 'number') {
        setError(body.triesLeft > 0 ? `That PIN is wrong. ${body.triesLeft} tries left.` : 'That PIN is wrong. This code has stopped.');
        if (body.triesLeft === 0) setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(body?.message ?? 'Something went wrong. Nothing was charged. Try again.');
      }
    } catch {
      setError('No connection. Nothing was charged. Try again.');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="border-t border-line bg-sand-soft p-5 sm:p-6" autoComplete="off">
      <p className="font-display text-base font-semibold text-ink">For staff</p>
      <p className="mt-0.5 text-sm text-muted">Check the bill, then type your PIN. Cover the screen while you type.</p>

      <label htmlFor="staff-pin" className="mt-4 block text-sm font-medium text-ink">
        Staff PIN
      </label>
      <input
        id="staff-pin"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        className={`${fieldInput} mt-1.5 max-w-[10rem] text-center font-mono text-2xl tracking-[0.5em]`}
      />

      <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] font-medium text-ink">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-5 w-5 rounded border-black/25 accent-[#0F252B]"
        />
        {minSpendPence > 0 ? `The bill is at least ${money(minSpendPence)}` : 'I am giving this deal'}
      </label>

      {error && (
        <p role="alert" className={`${formError} mt-3`}>
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className={`${ctaPrimary} mt-4 w-full`}>
        {busy ? 'Checking…' : 'Confirm the deal'}
      </button>
    </form>
  );
}

function Report({ code, already }: { code: string; already: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>(already ? 'sent' : 'idle');
  const [message, setMessage] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    try {
      const res = await fetch('/api/deals/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, note }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (body?.ok) return setState('sent');
      setMessage(body?.message ?? 'Something went wrong. Try again.');
      setState('error');
    } catch {
      setMessage('No connection. Try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return <p className="mt-8 text-sm text-muted">Thanks for telling us. We read every report.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 min-h-[44px] text-sm font-semibold text-muted underline decoration-black/20 underline-offset-4 hover:text-ink"
      >
        They did not give me this deal
      </button>
    );
  }

  return (
    <form onSubmit={send} className="mt-8 rounded-2xl border border-line bg-white p-5">
      <label htmlFor="report-note" className="block text-sm font-medium text-ink">
        What happened? You can leave this empty.
      </label>
      <textarea
        id="report-note"
        rows={3}
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={`${fieldInput} mt-1.5`}
      />
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        We read every report. If three people say the same, we pause the deal and talk to the restaurant.
      </p>
      {state === 'error' && message && (
        <p role="alert" className={`${formError} mt-3`}>
          {message}
        </p>
      )}
      <button type="submit" disabled={state === 'busy'} className={`${ctaPrimary} mt-3`}>
        {state === 'busy' ? 'Sending…' : 'Send report'}
      </button>
    </form>
  );
}
