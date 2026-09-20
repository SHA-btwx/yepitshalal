import Link from 'next/link';
import { CheckIcon, InfoIcon, XIcon } from './icons';
import { formatCheckedDate } from './HalalEvidencePanel';

// "Can I pray here, or do I need to go somewhere?"
//
// Worth asking before you sit down with a family, and nobody publishes it. So
// it comes from the people who go: the same form that takes a halal claim now
// takes this, and the answer carries who said it and when, the way every other
// fact on this site does.
//
// Three things it deliberately does not do. It never guesses from the cuisine
// or the name. It never shows silence as "no": nobody having told us is its
// own answer, and it is the one most places will have for a while. And it has
// nothing to do with the halal label, which is derived in the database from
// evidence about food and never reads these columns.

const SAID_BY: Record<string, string> = {
  owner: 'Someone who says they run it',
  staff: 'Someone who says they work there',
  customer: 'A customer',
  yepitshalal: 'We checked this ourselves',
};

const ANSWER: Record<string, { line: string; tone: 'yes' | 'no' }> = {
  prayer_room: { line: 'There is a prayer room here', tone: 'yes' },
  space: { line: 'There is somewhere to pray here, but not a dedicated room', tone: 'yes' },
  none: { line: 'There is nowhere to pray here', tone: 'no' },
};

export function PrayerAtRestaurant({
  facility,
  note,
  source,
  at,
  slug,
  placeName,
}: {
  facility: 'prayer_room' | 'space' | 'none' | null;
  note: string | null;
  source: string | null;
  at: string | null;
  slug: string;
  placeName: string;
}) {
  const answer = facility ? ANSWER[facility] : null;

  if (!answer) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-line px-4 py-3 text-[13px] leading-relaxed text-muted">
        <p className="flex items-start gap-2">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Nobody has told us</span> whether there is
            somewhere to pray inside {placeName}. That is not a no, it is a gap.{' '}
            <Link
              href={`/submit-restaurant?update=${slug}`}
              className="font-semibold text-accent-ink hover:underline"
            >
              Been? Tell us
            </Link>
          </span>
        </p>
      </div>
    );
  }

  const Mark = answer.tone === 'yes' ? CheckIcon : XIcon;

  return (
    <div
      className={`mt-4 rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
        answer.tone === 'yes' ? 'bg-halal-fullSoft text-halal-fullInk' : 'bg-sand text-ink/80'
      }`}
    >
      <p className="flex items-start gap-2">
        <Mark className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-semibold">{answer.line}.</span>
          {note && <> {note.replace(/\.$/, '')}.</>}{' '}
          <span className={answer.tone === 'yes' ? 'text-halal-fullInk/75' : 'text-subtle'}>
            {SAID_BY[source ?? ''] ?? 'Someone'} told us
            {at ? ` on ${formatCheckedDate(at)}` : ''}. We haven&apos;t confirmed it.
          </span>
        </span>
      </p>
    </div>
  );
}
