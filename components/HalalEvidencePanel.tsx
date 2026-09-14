import Link from 'next/link';
import { HalalBadge } from './HalalBadge';
import { ArrowUpRightIcon, InfoIcon } from './icons';
import type { EvidenceStrength, HalalClassification, HalalEvidence } from '@/lib/types';

// The answer to "is this actually halal, and how do you know?", in the order a
// person asks it: what we say, why, who said it, and when.
//
// Nothing here makes a claim the evidence does not. The label comes from
// refresh_halal_status() in the database, and weak evidence can never produce
// more than Unverified.

export const LABEL_MEANING: Record<HalalClassification, string> = {
  fully_halal: 'Strong evidence that all the meat served here is halal.',
  halal_options: 'Halal food is served here, alongside food that is not halal.',
  unverified: "There are signs halal food is served here, but it hasn't been confirmed.",
};

const STRENGTH: Record<EvidenceStrength, { label: string; explain: string }> = {
  strong: {
    label: 'Strong',
    explain: 'Certification, our own check, or the restaurant clearly saying all its meat is halal.',
  },
  moderate: {
    label: 'Moderate',
    explain: "The restaurant's own words, but not specific about everything it serves.",
  },
  weak: {
    label: 'Weak',
    explain: 'From someone other than the restaurant, or a name or tag. Treat it as a lead.',
  },
};

const KIND_LABEL: Record<string, string> = {
  yepitshalal_check: 'Our check',
  certification: 'Certification',
  first_party_statement: "Restaurant's own words",
  certification_claim: 'Restaurant says it is certified',
  business_name: 'Business name',
  community_tag: 'OpenStreetMap',
  directory_category: 'Public place data',
  owner_submission: 'Sent to us by the owner',
  public_submission: 'Sent to us by a customer',
};

export function formatCheckedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function EvidenceItem({ e, lead = false }: { e: HalalEvidence; lead?: boolean }) {
  return (
    <div className={lead ? '' : 'border-t border-line pt-3'}>
      <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{KIND_LABEL[e.kind] ?? 'Evidence'}</p>
      {e.excerpt && (
        <blockquote className="mt-1.5 border-l-2 border-accent/40 pl-3 text-sm italic leading-relaxed text-ink/80">
          &ldquo;{e.excerpt}&rdquo;
        </blockquote>
      )}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-subtle">Source</dt>
        <dd className="min-w-0 text-ink/80">
          {e.source_url ? (
            <a
              href={e.source_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 font-medium text-accent-ink hover:underline"
            >
              <span className="truncate">{e.source_name}</span>
              <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            e.source_name
          )}
        </dd>
        <dt className="text-subtle">Checked</dt>
        <dd className="text-ink/80">
          <time dateTime={e.checked_at}>{formatCheckedDate(e.checked_at)}</time>
          {e.notes && e.kind === 'yepitshalal_check' && <span className="text-subtle"> · {e.notes}</span>}
        </dd>
        <dt className="text-subtle">Strength</dt>
        <dd className="text-ink/80">{STRENGTH[e.strength].label}</dd>
      </dl>
    </div>
  );
}

export function HalalEvidencePanel({
  classification,
  strength,
  summary,
  evidence,
  isListed,
  isSearchable = false,
  cuisine = null,
  slug,
}: {
  classification: HalalClassification;
  strength: EvidenceStrength | null;
  summary: string | null;
  evidence: HalalEvidence[];
  isListed: boolean;
  /** In search as a place not checked yet. */
  isSearchable?: boolean;
  cuisine?: string | null;
  slug: string;
}) {
  if (!isListed && isSearchable && !strength) {
    return (
      <section aria-labelledby="halal-status" className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="halal-status" className="font-display text-lg font-semibold text-ink">
            Halal status
          </h2>
          <HalalBadge classification="unknown" size="md" variant="solid" />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          We don&apos;t know yet whether this place serves halal food. Nobody has checked, and we
          haven&apos;t found anything it or anyone else has said about it.
        </p>
        <div className="mt-4 rounded-xl bg-paper p-4 text-sm leading-relaxed text-ink/80">
          <h3 className="font-semibold text-ink">Why it&apos;s on YepItsHalal</h3>
          <p className="mt-1">
            {cuisine
              ? `It's listed under ${cuisine}, a kind of food often served halal in London.`
              : 'Its name suggests food that is often served halal in London.'}{' '}
            That is a reason to ask, not an answer. Check with the restaurant before you order.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href={`/submit-restaurant?update=${slug}`} className="font-semibold text-accent-ink hover:underline">
            Know if it&apos;s halal? Tell us
          </Link>
          <Link href={`/restaurant/${slug}/verify`} className="font-semibold text-accent-ink hover:underline">
            Ask us to check it
          </Link>
          <Link href="/how-we-check" className="font-medium text-muted hover:text-ink hover:underline">
            How we label places
          </Link>
        </div>
      </section>
    );
  }

  if (!isListed || !strength) {
    return (
      <section aria-labelledby="halal-status" className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h2 id="halal-status" className="font-display text-lg font-semibold text-ink">
          Halal status
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {summary ??
            "We don't have any evidence that this place serves halal food, so it isn't shown in search. That doesn't mean it isn't halal. It means we can't tell you either way."}
        </p>
        <p className="mt-3 text-sm">
          <Link href={`/submit-restaurant?update=${slug}`} className="font-semibold text-accent-ink hover:underline">
            Know it serves halal food? Tell us
          </Link>
        </p>
      </section>
    );
  }

  const positive = evidence.filter((e) => e.claim !== 'not_halal');
  const [lead, ...rest] = positive;

  return (
    <section aria-labelledby="halal-status" className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="halal-status" className="font-display text-lg font-semibold text-ink">
          Halal status
        </h2>
        <HalalBadge classification={classification} size="md" variant="solid" />
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{LABEL_MEANING[classification]}</p>

      <div className="mt-4 rounded-xl bg-paper p-4">
        <h3 className="text-sm font-semibold text-ink">Why we say this</h3>
        {summary && <p className="mt-1 text-sm text-ink/80">{summary}.</p>}
        {lead && (
          <div className="mt-3">
            <EvidenceItem e={lead} lead />
          </div>
        )}
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
        <span>
          <span className="font-semibold text-ink/80">{STRENGTH[strength].label} evidence.</span>{' '}
          {STRENGTH[strength].explain}
          {classification === 'unverified' && ' Unverified never means not halal.'}
        </span>
      </p>

      {rest.length > 0 && (
        <details className="group mt-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-accent-ink hover:underline">
            {rest.length === 1 ? '1 more piece of evidence' : `${rest.length} more pieces of evidence`}
          </summary>
          <div className="mt-3 space-y-3">
            {rest.map((e) => (
              <EvidenceItem key={e.id} e={e} />
            ))}
          </div>
        </details>
      )}

      <p className="mt-4 text-xs text-muted">
        <Link href="/how-we-check" className="font-medium text-accent-ink hover:underline">
          How we label places
        </Link>
        {' · '}
        <Link href={`/submit-restaurant?update=${slug}`} className="font-medium text-accent-ink hover:underline">
          Something wrong? Tell us
        </Link>
      </p>
    </section>
  );
}
