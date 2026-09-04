import { DAY_NAMES } from './types';
import type { OpeningHour } from './types';

const MIN_PER_DAY = 1440;
const WEEK = 7 * MIN_PER_DAY;

export interface OpenStatus {
  state: 'open' | 'closing_soon' | 'closed' | 'unknown';
  /** Short headline, e.g. "Open now" / "Closed". */
  label: string;
  /** Qualifier, e.g. "until 23:00" / "opens tomorrow 12:00". Absent when unknown. */
  detail?: string;
}

interface Interval {
  /** Minutes from Sunday 00:00 local. `end` may run past the end of the week. */
  start: number;
  end: number;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatTime(minuteOfWeek: number): string {
  const m = ((minuteOfWeek % WEEK) + WEEK) % WEEK;
  const h = Math.floor((m % MIN_PER_DAY) / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// A row whose close time is at or before its open time runs past midnight —
// 18:00–02:00 is one eight-hour interval, not a same-day negative one.
function buildIntervals(hours: OpeningHour[]): Interval[] {
  const intervals: Interval[] = [];
  for (const h of hours) {
    if (h.is_closed || !h.open_time || !h.close_time) continue;
    const base = h.day_of_week * MIN_PER_DAY;
    const start = base + toMinutes(h.open_time);
    let end = base + toMinutes(h.close_time);
    if (end <= start) end += MIN_PER_DAY;
    intervals.push({ start, end });
  }
  return intervals.sort((a, b) => a.start - b.start);
}

// Saturday-night intervals spill past the end of the week, so "now" is also
// tested a week later to catch early-Sunday-morning opening.
function contains(interval: Interval, t: number): boolean {
  return (t >= interval.start && t < interval.end) || (t + WEEK >= interval.start && t + WEEK < interval.end);
}

/**
 * Minutes elapsed since Sunday 00:00 *in London*. Read through Intl rather than
 * the runtime's own clock: the site is London-only but its server is not, so a
 * naive `new Date().getHours()` is an hour out for half the year.
 */
export function londonMinuteOfWeek(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));

  if (dayIndex < 0) return 0;
  return dayIndex * MIN_PER_DAY + hour * 60 + minute;
}

export function getOpenStatus(hours: OpeningHour[], now: Date = new Date()): OpenStatus {
  const intervals = buildIntervals(hours);
  if (intervals.length === 0) return { state: 'unknown', label: 'Hours not listed' };

  const t = londonMinuteOfWeek(now);
  const current = intervals.find((iv) => contains(iv, t));

  if (current) {
    // t < start means the match came from the wrapped test above (it is early
    // Sunday and the interval started late Saturday), so shift back a week.
    const closesAt = t < current.start ? current.end - WEEK : current.end;
    const minutesLeft = closesAt - t;
    if (minutesLeft <= 60) {
      return { state: 'closing_soon', label: 'Closing soon', detail: `closes ${formatTime(closesAt)}` };
    }
    return { state: 'open', label: 'Open now', detail: `until ${formatTime(closesAt)}` };
  }

  // Nearest future opening, wrapping around the end of the week.
  let bestDelta = Infinity;
  let bestStart = 0;
  for (const iv of intervals) {
    const delta = iv.start >= t ? iv.start - t : iv.start + WEEK - t;
    if (delta < bestDelta) {
      bestDelta = delta;
      bestStart = iv.start;
    }
  }

  const todayIndex = Math.floor(t / MIN_PER_DAY);
  const openDayIndex = Math.floor((bestStart % WEEK) / MIN_PER_DAY);
  const dayGap = (openDayIndex - todayIndex + 7) % 7;
  const when = dayGap === 0 ? '' : dayGap === 1 ? 'tomorrow ' : `${DAY_NAMES[openDayIndex]} `;

  return { state: 'closed', label: 'Closed', detail: `opens ${when}${formatTime(bestStart)}` };
}
