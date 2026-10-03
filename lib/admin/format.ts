// Small formatters shared by the admin's server pages and its chart components.
// No imports, so a client component can use them without pulling server code in.

const TZ = 'Europe/London';

/** 1,284 / 12.9K / 1.2M. Below 10,000 the whole number is easier to read. */
export function compact(n: number): string {
  if (Math.abs(n) < 10_000) return n.toLocaleString('en-GB');
  return new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** "3 Sep" from "2026-09-03". */
export function shortDay(isoDay: string): string {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
}

/** "Thu 3 Sep" from "2026-09-03". */
export function longDay(isoDay: string): string {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  });
}

/** "2 hours ago", "yesterday", then a date. */
export function ago(iso: string, now = Date.now()): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
}

/** "3 Oct 2026, 14:05", in London time. */
export function stamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

/** Round axis ticks: 0, then steps of 1, 2 or 5 times a power of ten. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return ticks;
}
