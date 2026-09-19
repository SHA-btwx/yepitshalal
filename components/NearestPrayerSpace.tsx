import Link from 'next/link';
import { ArrowUpRightIcon, MapPinIcon, NavigationIcon } from './icons';
import { formatMetres, walkingMinutes, type PrayerSpace } from '@/lib/prayerSpaces';

// "If I eat here, where do I pray afterwards?"
//
// The one place the prayer spaces meet the restaurants. It makes no claim about
// the food and the food makes no claim about it: this is a mosque that happens
// to be near, nothing more.
//
// The walk is an estimate from a straight-line distance and says so. A precise
// number would need a routing service we do not run, and a precise-looking
// number we cannot stand behind is worse than an honest "about".

export function NearestPrayerSpace({ spaces, placeName }: { spaces: PrayerSpace[]; placeName: string }) {
  if (!spaces.length) return null;
  const [nearest, ...rest] = spaces;

  return (
    <section aria-labelledby="prayer" className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 id="prayer" className="font-display text-lg font-semibold text-ink">
        Somewhere to pray nearby
      </h2>
      <p className="mt-1 text-sm text-muted">
        The closest we know of to {placeName}. Distances are in a straight line, so treat the walk as
        a rough idea.
      </p>

      <div className="mt-4 rounded-xl bg-paper p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-display text-base font-semibold text-ink">{nearest.name}</p>
          <p className="text-sm font-semibold text-accent-ink">
            about {walkingMinutes(nearest.distance_meters)} min walk
          </p>
        </div>
        <p className="mt-0.5 text-[13px] text-muted">
          {formatMetres(nearest.distance_meters)} away
          {nearest.address && ` · ${nearest.address}`}
          {!nearest.address && nearest.postcode && ` · ${nearest.postcode}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-accent-ink hover:underline"
          >
            <NavigationIcon className="h-4 w-4" aria-hidden="true" />
            Directions
          </a>
          {nearest.website_url && (
            <a
              href={nearest.website_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 font-medium text-muted hover:text-ink hover:underline"
            >
              Their website
              <ArrowUpRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {rest.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {rest.map((s) => (
            <li key={s.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate text-ink/80">{s.name}</span>
              <span className="shrink-0 text-muted">about {walkingMinutes(s.distance_meters)} min</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-subtle">
        <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          From OpenStreetMap, and not checked by us. Opening times vary, so ring ahead for a
          particular prayer.{' '}
          <Link href="/prayer-spaces" className="font-medium text-accent-ink hover:underline">
            All prayer spaces
          </Link>
        </span>
      </p>
    </section>
  );
}
