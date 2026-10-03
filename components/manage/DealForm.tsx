'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { choicePill, fieldHint, fieldInput, fieldLabel, formError, formSuccess } from '@/components/form';
import { ctaPrimary } from '@/components/cta';
import { saveDeal, type OwnerState } from '@/lib/deals/owner-actions';
import { PERCENT_CHOICES, TEMPLATES, titleFor, tidyItem, type Template } from '@/lib/deals/terms';
import { FEE_NEW_PENCE, FEE_REPEAT_PENCE, money } from '@/lib/deals/rules';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
});
const clockLabel = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${m}` : ''}${h >= 12 ? 'pm' : 'am'}`;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${ctaPrimary} w-full sm:w-auto`}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

/**
 * Pick a template, fill two or three blanks, see exactly what diners will
 * read, agree to the terms, start. The server builds the same headline from
 * the same fields (lib/deals/terms.ts), so the preview is the real thing.
 */
export function DealForm({
  restaurantId,
  hasPin,
  firstDeal,
  submitLabel,
}: {
  restaurantId: string;
  hasPin: boolean;
  firstDeal: boolean;
  submitLabel: string;
}) {
  const [state, action] = useFormState<OwnerState, FormData>(saveDeal, { status: 'idle' });
  const [template, setTemplate] = useState<Template>('free_item');
  const [item, setItem] = useState('soft drink');
  const [spend, setSpend] = useState('15');
  const [percent, setPercent] = useState(10);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4]);
  const [start, setStart] = useState('15:00');
  const [end, setEnd] = useState('17:00');

  const spendPence = Math.round((Number(spend.replace(/[£,\s]/g, '')) || 0) * 100);
  const preview = titleFor({
    kind: template === 'free_item' ? 'free_item' : 'percent_off',
    item: tidyItem(item) || '…',
    percentOff: percent,
    minSpendPence: spendPence,
    quietDays: template === 'quiet_hours' ? days : null,
    quietStart: template === 'quiet_hours' ? start : null,
    quietEnd: template === 'quiet_hours' ? end : null,
  });

  if (state.status === 'saved') {
    return (
      <p role="status" className={formSuccess}>
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="restaurant_id" value={restaurantId} />

      <fieldset>
        <legend className={fieldLabel}>What kind of deal?</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <label
              key={t.id}
              className="flex min-h-[44px] cursor-pointer flex-col rounded-2xl border border-black/15 bg-white p-4 transition hover:border-ink/30 has-[:checked]:border-ink has-[:checked]:ring-1 has-[:checked]:ring-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-ink"
            >
              <input
                type="radio"
                name="template"
                value={t.id}
                checked={template === t.id}
                onChange={() => setTemplate(t.id)}
                className="sr-only"
              />
              <span className="text-[15px] font-semibold text-ink">{t.name}</span>
              <span className="mt-0.5 text-xs text-muted">{t.example}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {template === 'free_item' && (
        <div>
          <label htmlFor="deal-item" className={fieldLabel}>
            What is free?
          </label>
          <input
            id="deal-item"
            name="item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            maxLength={40}
            placeholder="soft drink"
            className={fieldInput}
          />
          <p className={fieldHint}>One thing, in a few words. Leave halal out: your label shows next to the deal.</p>
        </div>
      )}

      {template !== 'free_item' && (
        <fieldset>
          <legend className={fieldLabel}>How much off?</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {PERCENT_CHOICES.map((p) => (
              <label key={p} className={choicePill}>
                <input
                  type="radio"
                  name="percent"
                  value={p}
                  checked={percent === p}
                  onChange={() => setPercent(p)}
                  className="sr-only"
                />
                {p}%
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {template === 'quiet_hours' && (
        <>
          <fieldset>
            <legend className={fieldLabel}>Which days?</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <label key={d} className={choicePill}>
                  <input
                    type="checkbox"
                    name="days"
                    value={i + 1}
                    checked={days.includes(i + 1)}
                    onChange={(e) =>
                      setDays((prev) => (e.target.checked ? [...prev, i + 1] : prev.filter((x) => x !== i + 1)))
                    }
                    className="sr-only"
                  />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <div>
              <label htmlFor="deal-start" className={fieldLabel}>
                From
              </label>
              <select id="deal-start" name="start" value={start} onChange={(e) => setStart(e.target.value)} className={fieldInput}>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {clockLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="deal-end" className={fieldLabel}>
                Until
              </label>
              <select id="deal-end" name="end" value={end} onChange={(e) => setEnd(e.target.value)} className={fieldInput}>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {clockLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="sm:max-w-xs">
        <label htmlFor="deal-spend" className={fieldLabel}>
          {template === 'free_item' ? 'Smallest bill' : 'Smallest bill (you can leave it at 0)'}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] text-muted sm:text-sm">£</span>
          <input
            id="deal-spend"
            name="min_spend"
            inputMode="decimal"
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
            className={`${fieldInput} pl-7`}
          />
        </div>
        {template === 'free_item' && <p className={fieldHint}>At least £5.</p>}
      </div>

      <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-subtle">Diners will see</p>
        <p className="mt-1 font-display text-lg font-semibold text-ink">{preview}</p>
      </div>

      {!hasPin && (
        <fieldset className="space-y-3">
          <legend className={fieldLabel}>Staff PIN</legend>
          <p className="-mt-1 text-sm text-muted">
            Staff type this on the diner&apos;s phone to say yes. Pick 4 numbers that are hard to guess. Not 1234 or 1111.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="new-password"
              aria-label="Staff PIN"
              placeholder="PIN"
              className={`${fieldInput} text-center font-mono tracking-[0.4em]`}
            />
            <input
              name="pin_again"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="new-password"
              aria-label="Staff PIN again"
              placeholder="Again"
              className={`${fieldInput} text-center font-mono tracking-[0.4em]`}
            />
          </div>
        </fieldset>
      )}

      <div className="rounded-2xl bg-sand p-4 text-sm leading-relaxed text-ink ring-1 ring-sand-line">
        <p>
          You pay only when your staff confirm a deal with the PIN: <strong>{money(FEE_NEW_PENCE)}</strong> for a new
          diner who found you on YepItsHalal, <strong>{money(FEE_REPEAT_PENCE)}</strong> for anyone else.
          {firstDeal ? ' We give you £10 of credit to start.' : ''}
        </p>
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[15px] text-ink">
        <input type="checkbox" name="accept" className="mt-1 h-5 w-5 shrink-0 accent-[#0F252B]" />
        <span>
          I agree to the{' '}
          <Link href="/deals/terms" target="_blank" className="font-semibold text-accent-ink underline">
            deal terms
          </Link>
          .
        </span>
      </label>

      {state.status === 'error' && (
        <p role="alert" className={formError}>
          {state.message}
        </p>
      )}

      <Submit label={submitLabel} />
    </form>
  );
}
