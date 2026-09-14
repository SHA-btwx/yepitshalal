import clsx from 'clsx';
import { DAY_NAMES } from '@/lib/types';
import { londonMinuteOfWeek } from '@/lib/openingStatus';
import type { OpeningHour } from '@/lib/types';

const SOURCE_LABEL: Record<string, string> = {
  osm: 'OpenStreetMap contributors',
  owner: 'the restaurant',
  admin: 'YepItsHalal',
};

export function OpeningHoursList({
  hours,
}: {
  hours: (OpeningHour & { source?: string | null; checked_at?: string | null })[];
}) {
  if (hours.length === 0) {
    return <p className="text-sm text-muted">We don&apos;t have reliable opening hours for this place yet.</p>;
  }

  // Server-rendered, so "today" has to come from London's clock, not the
  // runtime's. Otherwise the highlighted row is wrong for an hour either side
  // of midnight, and all summer.
  const today = Math.floor(londonMinuteOfWeek() / 1440);

  // Several periods a day are normal (lunch and dinner service), so a day is a
  // list, not a single row.
  const byDay = new Map<number, OpeningHour[]>();
  for (const h of hours) byDay.set(h.day_of_week, [...(byDay.get(h.day_of_week) ?? []), h]);

  const source = hours.find((h) => h.source)?.source;
  const checked = hours.find((h) => h.checked_at)?.checked_at;

  return (
    <div>
      <ul className="space-y-1">
        {DAY_NAMES.map((name, i) => {
          const periods = (byDay.get(i) ?? []).filter((p) => !p.is_closed && p.open_time && p.close_time);
          const isToday = i === today;
          return (
            <li
              key={i}
              className={clsx(
                'flex justify-between gap-4 rounded-md px-2 py-1 text-sm',
                isToday ? 'bg-accent-soft font-semibold text-ink' : 'text-muted'
              )}
            >
              <span>
                {name}
                {isToday && <span className="sr-only"> (today)</span>}
              </span>
              <span className={clsx('text-right tabular-nums', periods.length === 0 && !isToday && 'text-subtle')}>
                {periods.length === 0
                  ? 'Closed'
                  : periods.map((p) => `${p.open_time!.slice(0, 5)}–${p.close_time!.slice(0, 5)}`).join(', ')}
              </span>
            </li>
          );
        })}
      </ul>
      {source && (
        <p className="mt-2 px-2 text-xs text-subtle">
          Hours from {SOURCE_LABEL[source] ?? source}
          {checked &&
            `, checked ${new Date(checked).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          . Check with the restaurant before a special trip.
        </p>
      )}
    </div>
  );
}
