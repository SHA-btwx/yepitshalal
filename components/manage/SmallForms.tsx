'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { fieldInput, formError } from '@/components/form';
import { ctaSecondarySm } from '@/components/cta';
import { changePin, setCap, type OwnerState } from '@/lib/deals/owner-actions';

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={ctaSecondarySm}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

function Result({ state }: { state: OwnerState }) {
  if (state.status === 'error') {
    return (
      <p role="alert" className={`${formError} mt-3`}>
        {state.message}
      </p>
    );
  }
  if (state.status === 'saved') {
    return (
      <p role="status" className="mt-3 text-sm font-medium text-accent-ink">
        {state.message}
      </p>
    );
  }
  return null;
}

export function PinForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useFormState<OwnerState, FormData>(changePin, { status: 'idle' });
  return (
    <form action={action} autoComplete="off">
      <input type="hidden" name="restaurant_id" value={restaurantId} />
      <div className="flex flex-wrap items-end gap-2">
        {(['pin', 'pin_again'] as const).map((name) => (
          <input
            key={name}
            name={name}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="new-password"
            aria-label={name === 'pin' ? 'New PIN' : 'New PIN again'}
            placeholder={name === 'pin' ? 'New PIN' : 'Again'}
            className={`${fieldInput} w-28 text-center font-mono tracking-[0.3em]`}
          />
        ))}
        <Save label="Change PIN" />
      </div>
      <Result state={state} />
    </form>
  );
}

export function CapForm({ restaurantId, capPounds }: { restaurantId: string; capPounds: number }) {
  const [state, action] = useFormState<OwnerState, FormData>(setCap, { status: 'idle' });
  return (
    <form action={action}>
      <input type="hidden" name="restaurant_id" value={restaurantId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-28">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] text-muted sm:text-sm">£</span>
          <input
            name="cap"
            inputMode="decimal"
            defaultValue={capPounds}
            aria-label="Most you pay in fees in a month, in pounds"
            className={`${fieldInput} pl-7`}
          />
        </div>
        <Save label="Save" />
      </div>
      <Result state={state} />
    </form>
  );
}
