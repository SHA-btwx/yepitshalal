import { FEE_NEW_PENCE, FEE_REPEAT_PENCE, type DealState } from './rules';

// Words for the admin Deals screens. Admin only, so plainer than the owner
// page but still no database names on screen.

export type Tone = 'neutral' | 'good' | 'warn' | 'accent' | 'ink';

export function stateTag(s: DealState | null): { label: string; tone: Tone } {
  if (!s) return { label: 'Unknown', tone: 'neutral' };
  switch (s.state) {
    case 'live':
      return { label: 'Live', tone: 'good' };
    case 'paused':
      return s.deal?.paused_reason === 'reports'
        ? { label: 'Paused: 3 reports', tone: 'warn' }
        : s.deal?.paused_reason === 'admin'
          ? { label: 'Paused by us', tone: 'warn' }
          : { label: 'Paused by owner', tone: 'neutral' };
    case 'no_credit':
      return { label: 'Out of credit', tone: 'warn' };
    case 'cap_reached':
      return { label: 'Monthly cap reached', tone: 'neutral' };
    case 'no_pin':
      return { label: 'No staff PIN', tone: 'warn' };
    case 'not_listed':
      return { label: 'Listing hidden or closed', tone: 'neutral' };
    case 'ended':
      return { label: 'Ended', tone: 'neutral' };
    default:
      return { label: 'No deal', tone: 'neutral' };
  }
}

export function ledgerKind(row: { kind: string; amount_pence: number; claim_id: string | null }): string {
  switch (row.kind) {
    case 'grant':
      return 'Welcome credit';
    case 'topup':
      return 'Card top up';
    case 'refund':
      return 'Stripe refund';
    case 'fee':
      return row.amount_pence === -FEE_NEW_PENCE
        ? 'Fee, new diner'
        : row.amount_pence === -FEE_REPEAT_PENCE
          ? 'Fee, return or poster'
          : 'Fee, cut to cap or credit';
    default:
      return row.claim_id ? 'Fee given back' : 'Admin change';
  }
}

export const signed = (pence: number, money: (p: number) => string) =>
  pence > 0 ? `+${money(pence)}` : `-${money(-pence)}`;

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
