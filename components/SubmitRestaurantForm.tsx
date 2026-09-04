'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// text-[16px] on every input is deliberate: iOS Safari zooms the whole page
// when a focused field's text is smaller than 16px, and the user has to pinch
// back out after every field.
const FIELD_CLASS =
  'w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-[16px] text-ink placeholder:text-subtle transition focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm';
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-ink';

function Field({
  label,
  name,
  children,
  hint,
  ...props
}: {
  label: string;
  name: string;
  hint?: string;
  children?: never;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {props.required && (
          <span className="ml-0.5 text-halal-partialInk" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input id={id} name={name} aria-describedby={hintId} className={FIELD_CLASS} {...props} />
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

// Three mutually exclusive answers — so, a radio group. It was previously three
// unlabelled buttons with no pressed state, which a screen reader read as three
// unrelated controls called "yes", "no" and "unknown".
function TriToggle({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState<'yes' | 'no' | 'unknown'>('unknown');
  const labelId = useId();

  return (
    <div>
      <span id={labelId} className={LABEL_CLASS}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex gap-2">
        {(['yes', 'no', 'unknown'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            onClick={() => setValue(opt)}
            className={`inline-flex min-h-[40px] items-center rounded-lg border px-4 text-[13px] font-medium capitalize transition ${
              value === opt
                ? 'border-ink bg-ink text-white'
                : 'border-black/15 text-ink/75 hover:border-ink/30 hover:text-ink'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

export function SubmitRestaurantForm({ cuisines }: { cuisines: { id: number; name: string }[] }) {
  const router = useRouter();
  const cuisineId = useId();
  const certId = useId();
  const contactNameId = useId();
  const contactEmailId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/restaurants/submit', {
      method: 'POST',
      body: new FormData(e.currentTarget),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong — please try again.');
      // Move focus to the message: a failure announced only visually, at the
      // bottom of a long form, is a failure nobody sees.
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    router.push(`/restaurant/${json.slug}?submitted=true`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input
        type="text"
        name="company_website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <p className="text-xs text-muted">
        <span className="text-halal-partialInk" aria-hidden="true">
          *
        </span>{' '}
        Required
      </p>

      <Field label="Restaurant name" name="name" required placeholder="e.g. Al-Waha Grill House" />
      <Field label="Address" name="address" required placeholder="Street, area, postcode" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="020 7946 0000"
        />
        <div>
          <label htmlFor={cuisineId} className={LABEL_CLASS}>
            Cuisine
          </label>
          <select id={cuisineId} name="cuisine_id" className={FIELD_CLASS}>
            <option value="">Select…</option>
            {cuisines.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Website" name="website" type="url" inputMode="url" placeholder="https://" />
        <Field label="Instagram" name="instagram" placeholder="@yourrestaurant" />
      </div>

      <fieldset className="space-y-4 rounded-xl border border-black/15 p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Basic halal information</legend>
        <p className="-mt-1 text-xs leading-relaxed text-muted">
          Tell us what you know — &ldquo;Unknown&rdquo; is fine. This is your claim, not a
          verification.
        </p>
        <TriToggle name="all_meat_halal" label="Is all meat halal?" />
        <TriToggle name="serves_non_halal_meat" label="Do you serve any non-halal meat?" />
        <TriToggle name="serves_pork" label="Do you serve pork?" />
        <TriToggle name="serves_alcohol" label="Do you serve alcohol?" />
        <TriToggle name="has_certification" label="Do you hold halal certification?" />
        <div>
          <label htmlFor={certId} className={LABEL_CLASS}>
            Certification body
          </label>
          <input
            id={certId}
            name="certification_body"
            className={FIELD_CLASS}
            placeholder="e.g. HMC, HFA — if applicable"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-black/15 p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Your contact details</legend>
        <div>
          <label htmlFor={contactNameId} className={LABEL_CLASS}>
            Your name
          </label>
          <input
            id={contactNameId}
            name="contact_name"
            autoComplete="name"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor={contactEmailId} className={LABEL_CLASS}>
            Your email
          </label>
          <input
            id={contactEmailId}
            name="contact_email"
            type="email"
            autoComplete="email"
            className={FIELD_CLASS}
          />
        </div>
      </fieldset>

      {error && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl bg-halal-partialSoft px-4 py-3 text-sm font-medium text-halal-partialInk ring-1 ring-halal-partial/20"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit restaurant'}
      </button>
    </form>
  );
}
