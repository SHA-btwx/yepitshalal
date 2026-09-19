import clsx from 'clsx';
import { SealCheckIcon } from './icons';

// The one mark on this site that means a person from YepItsHalal did something:
// went, rang, or read the certificate. Nothing else earns it. A restaurant
// saying it is certified does not, a website saying its meat is halal does not,
// and a tag on a map does not.
//
// It is deliberately absent everywhere today, because we have not checked
// anything yet. A badge that appeared on 11,000 listings the day the site
// launched would mean nothing at all; this one is worth having because it is
// empty until the work is done. See migration 0037 for where the flag is set.

export function CheckedByUsBadge({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent-ink font-semibold text-white',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className
      )}
      title="Somebody from YepItsHalal checked this place in person"
    >
      <SealCheckIcon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
      Checked by us
    </span>
  );
}
