import clsx from 'clsx';
import { ClockIcon } from './icons';
import { getOpenStatus } from '@/lib/openingStatus';
import type { OpeningHour } from '@/lib/types';

const TONE: Record<string, string> = {
  open: 'bg-halal-fullSoft text-halal-fullInk ring-halal-full/20',
  closing_soon: 'bg-halal-partialSoft text-halal-partialInk ring-halal-partial/20',
  closed: 'bg-halal-unverifiedSoft text-halal-unverifiedInk ring-halal-unverified/20',
  unknown: 'bg-halal-unverifiedSoft text-halal-unverifiedInk ring-halal-unverified/20',
};

export function OpenStatusBadge({
  hours,
  className,
  showDetail = true,
}: {
  hours: OpeningHour[];
  className?: string;
  showDetail?: boolean;
}) {
  const status = getOpenStatus(hours);
  if (status.state === 'unknown') return null;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        TONE[status.state],
        className
      )}
    >
      <ClockIcon className="h-3.5 w-3.5" />
      {status.label}
      {showDetail && status.detail && (
        <span className="font-medium opacity-80">· {status.detail}</span>
      )}
    </span>
  );
}
