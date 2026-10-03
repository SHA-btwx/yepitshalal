'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { FIELD, BUTTON } from '@/components/admin/ui';
import { formError } from '@/components/form';
import { adjustCredit, type AdminDealState } from '@/lib/deals/admin-actions';

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={BUTTON}>
      {pending ? 'Saving…' : 'Save change'}
    </button>
  );
}

/** One form per page load: the token makes a second press post nothing. */
export function AdjustCreditForm({ restaurantId, token }: { restaurantId: string; token: string }) {
  const [state, action] = useFormState<AdminDealState, FormData>(adjustCredit, { status: 'idle' });
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="restaurant_id" value={restaurantId} />
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <label className="block text-sm font-medium text-ink">
          Amount, £
          <input name="amount" inputMode="decimal" placeholder="5 or -2.50" className={`${FIELD} mt-1`} />
        </label>
        <label className="block text-sm font-medium text-ink">
          Why (the owner sees this)
          <input name="note" maxLength={300} placeholder="Goodwill after a slow week" className={`${FIELD} mt-1`} />
        </label>
      </div>
      {state.status === 'error' && <p className={formError}>{state.message}</p>}
      {state.status === 'saved' && <p className="text-sm font-medium text-accent-ink">{state.message} Refresh to add another.</p>}
      <Save />
    </form>
  );
}
