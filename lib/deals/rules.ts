/**
 * The numbers behind Deals, the same ones deal_rule() holds in the database
 * (supabase/migrations/0052_deals.sql). The database is what enforces them;
 * these are for the words on the page. If one changes, both change, and so
 * does TERMS_VERSION: restaurants agreed to these numbers.
 */

export const TERMS_VERSION = 'deals-2026-10';

export const FEE_NEW_PENCE = 100;
export const FEE_REPEAT_PENCE = 30;
export const WELCOME_CREDIT_PENCE = 1000;
export const LOW_BALANCE_PENCE = 500;
export const CODE_HOURS = 48;
export const FIRST_VISIT_DAYS = 90;
export const DISPUTE_DAYS = 7;
export const REPORTS_TO_PAUSE = 3;
export const CAP_DEFAULT_PENCE = 5000;
export const CAP_MIN_PENCE = 1000;
export const CAP_MAX_PENCE = 50000;

/** Top up packs. The Stripe price for each comes from an environment variable. */
export const TOPUP_PACKS = [
  { pence: 2500, env: 'STRIPE_PRICE_DEAL_CREDIT_25' },
  { pence: 5000, env: 'STRIPE_PRICE_DEAL_CREDIT_50' },
] as const;

export type TopupPence = (typeof TOPUP_PACKS)[number]['pence'];

/** £1, 30p, £12.50. */
export function money(pence: number): string {
  const sign = pence < 0 ? '-' : '';
  const p = Math.abs(Math.round(pence));
  if (p < 100) return `${sign}${p}p`;
  const pounds = p / 100;
  return `${sign}£${Number.isInteger(pounds) ? pounds : pounds.toFixed(2)}`;
}

/** Always with pence, for a ledger column: £1.00, £0.30. */
export function moneyExact(pence: number): string {
  const sign = pence < 0 ? '-' : '';
  return `${sign}£${(Math.abs(pence) / 100).toFixed(2)}`;
}

/** What a diner meets, from deal_state(). */
export type DealStateName =
  | 'none'
  | 'ended'
  | 'paused'
  | 'not_listed'
  | 'no_pin'
  | 'no_credit'
  | 'cap_reached'
  | 'live';

export type PausedReason = 'owner' | 'reports' | 'admin';

export interface DealRow {
  id: string;
  restaurant_id: string;
  kind: 'free_item' | 'percent_off';
  item: string | null;
  percent_off: number | null;
  min_spend_pence: number;
  quiet_days: number[] | null;
  quiet_start: string | null;
  quiet_end: string | null;
  title: string;
  status: 'live' | 'paused' | 'ended';
  paused_reason: PausedReason | null;
  paused_at: string | null;
  ended_at: string | null;
  terms_version: string;
  accepted_at: string;
  created_at: string;
}

export interface DealState {
  state: DealStateName;
  deal: DealRow | null;
  balance_pence: number;
  held_pence: number;
  available_pence: number;
  month_fees_pence: number;
  cap_pence: number;
  has_pin: boolean;
}
