/**
 * What a diner or the till sees for each answer the database gives. Short
 * words, one idea each, and what to do next.
 */

export const CLAIM_ERRORS: Record<string, string> = {
  not_found: 'This deal is not running any more.',
  ended: 'This deal has ended.',
  paused: 'This deal is paused right now. Try again another day.',
  not_listed: 'This deal is not running right now.',
  no_pin: 'This deal is not ready yet. Try again soon.',
  used_today: 'You used this deal here today. Come back tomorrow.',
  no_credit: 'This deal is paused right now. Try again soon.',
  cap_reached: 'This deal is full for this month. Try again next month.',
  rate_limited: 'Lots of codes came from this connection. Wait a bit, then try again.',
  failed: 'Something went wrong. Try again.',
};

export const REDEEM_ERRORS: Record<string, string> = {
  not_found: 'We cannot find this code.',
  wrong_phone: 'This code was made on another phone. Open it on that phone.',
  expired: 'This code ran out. Codes last 48 hours. You can get a new one.',
  void: 'This code stopped working after too many wrong PINs. You can get a new one tomorrow.',
  outside_hours: 'This deal only works at the times shown. Try again then.',
  used_today: 'This phone used the deal here today. Come back tomorrow.',
  no_pin: 'The restaurant has not set a PIN yet.',
  pin_locked: 'Too many wrong PINs. The PIN is locked for 30 minutes. The owner can set a new one.',
  wrong_pin: 'That PIN is wrong.',
  not_confirmed: 'Tap the box to say the bill is big enough.',
  rate_limited: 'Too many tries from this connection. Wait an hour, then try again.',
  failed: 'Something went wrong. Nothing was charged. Try again.',
};

export const REPORT_ERRORS: Record<string, string> = {
  not_found: 'We cannot find this code.',
  wrong_phone: 'Only the phone that got this code can report it.',
  void: 'This code was stopped, so it cannot be reported.',
  failed: 'Something went wrong. Try again.',
};

/** Owner facing, for the errors start_deal and friends raise. */
export function ownerError(message: string | undefined, hint: string | undefined): string {
  if (hint) return hint;
  const m = message ?? '';
  if (/check constraint/i.test(m)) {
    return 'Something in the deal is not allowed. Keep it short, and leave halal out of it.';
  }
  if (/deals_one_open_per_restaurant/.test(m)) return 'You already have a deal. Refresh the page.';
  return 'That did not save. Try again.';
}
