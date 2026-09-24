import Link from 'next/link';
import { ArrowRightIcon } from './icons';
import { ctaPrimary } from './cta';
import { Free } from './Free';

// The one support ask on the homepage, and deliberately short.
//
// It replaced the "P.S." block (2026-09-24), which made the case for support
// in two paragraphs at the foot of a page whose job is finding dinner. The
// case is now made properly on /yep-plus, one card at a time. Here there is
// only a question worth clicking on, and a button that says where it goes.
//
// The question is a real one, not a guilt trip: the search is free, and a
// reader can fairly wonder how. No urgency, no scarcity, no numbers.

export function SupportPrompt() {
  return (
    <section aria-labelledby="support-prompt-title" className="bg-sand-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="max-w-2xl">
          <h2
            id="support-prompt-title"
            className="text-balance font-display text-[1.45rem] font-semibold leading-snug text-ink sm:text-[1.8rem]"
          >
            Searching here is <Free>free</Free>, for everyone. So who pays for the checking?
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">It takes about a minute to find out.</p>
        </div>
        <Link href="/yep-plus" className={`${ctaPrimary} group shrink-0 self-start md:self-auto`}>
          See what support pays for
          <ArrowRightIcon className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
