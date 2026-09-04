import clsx from 'clsx';
import { DAY_NAMES } from '@/lib/types';
import { londonMinuteOfWeek } from '@/lib/openingStatus';
import type { OpeningHour } from '@/lib/types';

export function OpeningHoursList({ hours }: { hours: OpeningHour[] }) {
  if (hours.length === 0) {
    return <p className="text-sm text-muted">Opening hours not yet added.</p>;
  }

  // Server-rendered, so "today" has to come from London's clock, not the
  // runtime's — otherwise the highlighted row is wrong for an hour either side
  // of midnight, and all summer.
  const today = Math.floor(londonMinuteOfWeek() / 1440);
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));

  return (
    <ul className="space-y-1">
      {DAY_NAMES.map((name, i) => {
        const entry = byDay.get(i);
        const isToday = i === today;
        const closed = !entry || entry.is_closed;
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
            <span className={clsx('tabular-nums', closed && !isToday && 'text-subtle')}>
              {closed
                ? 'Closed'
                : `${entry!.open_time?.slice(0, 5)} – ${entry!.close_time?.slice(0, 5)}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
