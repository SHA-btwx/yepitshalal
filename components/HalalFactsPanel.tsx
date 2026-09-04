import clsx from 'clsx';
import { CheckIcon, WarningIcon, InfoIcon } from './icons';
import type { HalalFactsPublic, TriState } from '@/lib/types';

type Tone = 'good' | 'warn' | 'neutral';

function triLabel(value: TriState, yesLabel = 'Yes', noLabel = 'No'): string {
  if (value === true) return yesLabel;
  if (value === false) return noLabel;
  return 'Unknown';
}

function toneFor(value: TriState, positiveWhenFalse: boolean): Tone {
  if (value === null) return 'neutral';
  const isGood = positiveWhenFalse ? value === false : value === true;
  return isGood ? 'good' : 'warn';
}

const TONE_CLASSES: Record<Tone, string> = {
  good: 'text-halal-fullInk',
  warn: 'text-halal-partialInk',
  neutral: 'text-subtle',
};

// Each answer carries a glyph as well as a colour: green-vs-amber alone is the
// exact pairing colour-blind readers lose. The 'warn' glyph is a warning sign
// rather than a cross, because these answers are already yes/no words — a cross
// beside the word 'Yes' reads as a contradiction, a warning sign reads as
// 'worth knowing', which is what an amber row actually means.
const TONE_ICON: Record<Tone, typeof CheckIcon> = {
  good: CheckIcon,
  warn: WarningIcon,
  neutral: InfoIcon,
};

function Row({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const Icon = TONE_ICON[tone];
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-ink/75">{label}</dt>
      <dd className={clsx('flex items-center gap-1.5 text-sm font-semibold', TONE_CLASSES[tone])}>
        <Icon className="h-4 w-4 shrink-0" />
        {value}
      </dd>
    </div>
  );
}

export function HalalFactsPanel({ facts }: { facts: HalalFactsPublic | null }) {
  const allMeatHalal = facts?.all_meat_halal ?? null;
  const halalFoodLabel =
    allMeatHalal === true ? 'All' : allMeatHalal === false ? 'Selected options' : 'Unknown';
  const halalFoodTone: Tone =
    allMeatHalal === true ? 'good' : allMeatHalal === false ? 'warn' : 'neutral';

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-ink">Halal information</h2>
      <dl className="mt-2">
        <Row label="Halal food" value={halalFoodLabel} tone={halalFoodTone} />
        <Row
          label="Alcohol"
          value={triLabel(facts?.serves_alcohol ?? null)}
          tone={toneFor(facts?.serves_alcohol ?? null, true)}
        />
        <Row
          label="Pork"
          value={triLabel(facts?.serves_pork ?? null)}
          tone={toneFor(facts?.serves_pork ?? null, true)}
        />
        <Row
          label="Non-halal meat"
          value={triLabel(facts?.serves_non_halal_meat ?? null)}
          tone={toneFor(facts?.serves_non_halal_meat ?? null, true)}
        />
        <Row
          label="Halal certification"
          value={triLabel(facts?.has_certification ?? null, 'Certified', 'Not certified')}
          tone={toneFor(facts?.has_certification ?? null, false)}
        />
      </dl>
      {facts?.certification_body && (
        <p className="mt-3 text-xs text-muted">Certified by {facts.certification_body}.</p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        We only show what we actually know. &ldquo;Unknown&rdquo; doesn&apos;t mean
        &ldquo;no.&rdquo;
      </p>
    </div>
  );
}
