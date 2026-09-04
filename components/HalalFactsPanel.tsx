import type { HalalFactsPublic, TriState } from '@/lib/types';

function triLabel(value: TriState, yesLabel = 'Yes', noLabel = 'No'): string {
  if (value === true) return yesLabel;
  if (value === false) return noLabel;
  return 'Unknown';
}

function toneFor(value: TriState, positiveWhenFalse: boolean): 'good' | 'warn' | 'neutral' {
  if (value === null) return 'neutral';
  const isGood = positiveWhenFalse ? value === false : value === true;
  return isGood ? 'good' : 'warn';
}

const TONE_CLASSES: Record<'good' | 'warn' | 'neutral', string> = {
  good: 'text-halal-full',
  warn: 'text-halal-partial',
  neutral: 'text-ink/40',
};

function Row({ label, value, tone }: { label: string; value: string; tone: 'good' | 'warn' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between border-b border-black/5 py-2.5 last:border-0">
      <span className="text-sm text-ink/70">{label}</span>
      <span className={`text-sm font-semibold ${TONE_CLASSES[tone]}`}>{value}</span>
    </div>
  );
}

export function HalalFactsPanel({ facts }: { facts: HalalFactsPublic | null }) {
  const allMeatHalal = facts?.all_meat_halal ?? null;
  const halalFoodLabel =
    allMeatHalal === true ? 'All' : allMeatHalal === false ? 'Selected options' : 'Unknown';
  const halalFoodTone: 'good' | 'warn' | 'neutral' =
    allMeatHalal === true ? 'good' : allMeatHalal === false ? 'warn' : 'neutral';

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="font-display text-base font-semibold text-ink">Halal information</h2>
      <div className="mt-2">
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
      </div>
      {facts?.certification_body && (
        <p className="mt-3 text-xs text-ink/45">Certified by {facts.certification_body}.</p>
      )}
      <p className="mt-3 text-xs text-ink/40">
        We only show what we actually know. &quot;Unknown&quot; doesn&apos;t mean &quot;no.&quot;
      </p>
    </div>
  );
}
