import { DAY_NAMES } from '@/lib/types';
import type { OpeningHour } from '@/lib/types';

export function OpeningHoursList({ hours }: { hours: OpeningHour[] }) {
  if (hours.length === 0) {
    return <p className="text-sm text-ink/40">Opening hours not yet added.</p>;
  }

  const today = new Date().getDay();
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));

  return (
    <ul className="space-y-1.5">
      {DAY_NAMES.map((name, i) => {
        const entry = byDay.get(i);
        const isToday = i === today;
        return (
          <li
            key={i}
            className={`flex justify-between text-sm ${isToday ? 'font-semibold text-ink' : 'text-ink/60'}`}
          >
            <span>{name}</span>
            <span>
              {!entry || entry.is_closed
                ? 'Closed'
                : `${entry.open_time?.slice(0, 5)} – ${entry.close_time?.slice(0, 5)}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
