import { money } from './rules';

/**
 * The three deal templates an owner can pick, and the one place that turns
 * their answers into the headline a diner reads. Pure: no database, no
 * request, so the owner's preview and the stored title can never differ.
 */

export type Template = 'free_item' | 'percent_off' | 'quiet_hours';

export const TEMPLATES: { id: Template; name: string; example: string }[] = [
  { id: 'free_item', name: 'Something free', example: 'Free soft drink when you spend £15' },
  { id: 'percent_off', name: 'Money off', example: '10% off your bill' },
  { id: 'quiet_hours', name: 'Quiet hours', example: '15% off, Mon to Thu, 3pm to 5pm' },
];

export const PERCENT_CHOICES = [5, 10, 15, 20, 25] as const;

/** The database refuses these too (the CHECK on deals.item). */
export const HALAL_WORDS = /(halal|haram|zabi|hmc|hfa|certif)/i;

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface DealInput {
  kind: 'free_item' | 'percent_off';
  item: string | null;
  percentOff: number | null;
  minSpendPence: number;
  quietDays: number[] | null;
  quietStart: string | null;
  quietEnd: string | null;
}

export type Built = { ok: true; input: DealInput; title: string } | { ok: false; error: string };

/** "15:00" to "3pm", "15:30" to "3:30pm". */
export function clock(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

/** [1,2,3,4] to "Mon to Thu", [1,3,5] to "Mon, Wed, Fri", all seven to "every day". */
export function dayList(days: number[]): string {
  const sorted = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (sorted.length === 7) return 'every day';
  const run = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (run && sorted.length >= 3) return `${DAY_NAMES[sorted[0] - 1]} to ${DAY_NAMES[sorted[sorted.length - 1] - 1]}`;
  return sorted.map((d) => DAY_NAMES[d - 1]).join(', ');
}

export function quietLabel(days: number[] | null, start: string | null, end: string | null): string | null {
  if (!days || !start || !end) return null;
  return `${dayList(days)}, ${clock(start)} to ${clock(end)}`;
}

export function titleFor(input: DealInput): string {
  const spend = input.minSpendPence > 0 ? ` when you spend ${money(input.minSpendPence)}` : '';
  const when = quietLabel(input.quietDays, input.quietStart, input.quietEnd);
  const head =
    input.kind === 'free_item' ? `Free ${input.item}${spend}` : `${input.percentOff}% off your bill${spend}`;
  return when ? `${head}, ${when}` : head;
}

/** "Free drink" typed as the item becomes "drink"; spaces are tidied. */
export function tidyItem(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(a|an|one|1|free)\s+/i, '')
    .replace(/^free\s+/i, '')
    .replace(/[.!]+$/, '');
}

function pence(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').replace(/[£,\s]/g, '');
  if (!s) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Reads the template form. Every error is a sentence the owner can act on. */
export function buildDeal(form: FormData): Built {
  const template = String(form.get('template') ?? '') as Template;
  if (!['free_item', 'percent_off', 'quiet_hours'].includes(template)) {
    return { ok: false, error: 'Pick one of the three kinds of deal.' };
  }

  const minSpend = pence(form.get('min_spend'));
  if (minSpend === null) return { ok: false, error: 'Write the spend as a number, like 15 or 12.50.' };
  if (minSpend > 20000) return { ok: false, error: 'The spend can be £200 at most.' };

  if (template === 'free_item') {
    const item = tidyItem(String(form.get('item') ?? ''));
    if (item.length < 2) return { ok: false, error: 'Say what is free, like "soft drink" or "dessert".' };
    if (item.length > 40) return { ok: false, error: 'Keep what is free short: 40 letters at most.' };
    if (HALAL_WORDS.test(item)) {
      return {
        ok: false,
        error: 'Leave halal out of the deal. Your halal label shows next to it, and it comes only from a check.',
      };
    }
    if (minSpend < 500) return { ok: false, error: 'A free item needs a spend of at least £5.' };
    const input: DealInput = {
      kind: 'free_item',
      item,
      percentOff: null,
      minSpendPence: minSpend,
      quietDays: null,
      quietStart: null,
      quietEnd: null,
    };
    return { ok: true, input, title: titleFor(input) };
  }

  const percent = Number(form.get('percent'));
  if (!PERCENT_CHOICES.includes(percent as (typeof PERCENT_CHOICES)[number])) {
    return { ok: false, error: 'Pick how much off: 5, 10, 15, 20 or 25%.' };
  }

  let quietDays: number[] | null = null;
  let quietStart: string | null = null;
  let quietEnd: string | null = null;
  if (template === 'quiet_hours') {
    quietDays = form
      .getAll('days')
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
    quietDays = [...new Set(quietDays)].sort((a, b) => a - b);
    quietStart = String(form.get('start') ?? '');
    quietEnd = String(form.get('end') ?? '');
    if (!quietDays.length) return { ok: false, error: 'Pick at least one day.' };
    if (!TIME.test(quietStart) || !TIME.test(quietEnd)) return { ok: false, error: 'Pick a start time and an end time.' };
    if (quietStart >= quietEnd) return { ok: false, error: 'The end time must be after the start time.' };
  }

  const input: DealInput = {
    kind: 'percent_off',
    item: null,
    percentOff: percent,
    minSpendPence: minSpend,
    quietDays,
    quietStart,
    quietEnd,
  };
  return { ok: true, input, title: titleFor(input) };
}

/** The small print under a deal, in the same words everywhere. */
export function dealRules(d: { min_spend_pence: number; quiet_days: number[] | null; quiet_start: string | null; quiet_end: string | null }): string[] {
  const lines: string[] = [];
  if (d.min_spend_pence > 0) lines.push(`Your bill must be at least ${money(d.min_spend_pence)}.`);
  const when = quietLabel(d.quiet_days, d.quiet_start, d.quiet_end);
  if (when) lines.push(`Works ${when}.`);
  lines.push('Free to claim. No sign up.', 'One use a day. The code lasts 48 hours.');
  return lines;
}
