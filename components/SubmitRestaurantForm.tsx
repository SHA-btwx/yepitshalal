'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckIcon } from './icons';

// text-[16px] on every input is deliberate: iOS Safari zooms the whole page
// when a focused field's text is smaller than 16px, and the user has to pinch
// back out after every field.
const FIELD_CLASS =
  'w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-[16px] text-ink placeholder:text-subtle transition focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent-ink/20 sm:text-sm';
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-ink';

function Field({
  label,
  name,
  hint,
  ...props
}: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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

function Choice({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  const labelId = useId();
  return (
    <fieldset>
      <legend id={labelId} className={LABEL_CLASS}>
        {label}
        {required && (
          <span className="ml-0.5 text-halal-partialInk" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-black/15 px-3.5 text-[14px] text-ink/80 transition has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white hover:border-ink/30"
          >
            <input type="radio" name={name} value={opt.value} required={required} className="sr-only" />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: "Don't know" },
];

export interface ExistingPlace {
  slug: string;
  name: string;
  address: string;
  postcode: string;
  phone: string;
  website: string;
  cuisine: string;
}

export function SubmitRestaurantForm({
  cuisines,
  existing = null,
}: {
  cuisines: { id: number; name: string }[];
  /** Set when suggesting an edit to a place we already have. */
  existing?: ExistingPlace | null;
}) {
  const cuisineId = useId();
  const notesId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; duplicate: { name: string; slug: string } | null } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch('/api/restaurants/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.');
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      setDone({ name: String(data.name), duplicate: json.duplicate ?? null });
      requestAnimationFrame(() => {
        doneRef.current?.focus();
        doneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      setError('Something went wrong sending the form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl border border-line bg-white p-6 shadow-sm focus:outline-none"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <CheckIcon className="h-5 w-5" />
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold text-ink">Thanks, we&apos;ve got it</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {existing
            ? `We check every suggestion before it changes a listing, so ${existing.name} won't update straight away.`
            : `We check every restaurant before it appears on YepItsHalal, so ${done.name} won't show up straight away.`}{' '}
          If you left an email, we may get in touch with a question.
        </p>
        {done.duplicate && !existing && (
          <p className="mt-3 rounded-xl bg-halal-partialSoft px-4 py-3 text-sm text-halal-partialInk ring-1 ring-halal-partial/20">
            We may already list this restaurant as{' '}
            <Link href={`/restaurant/${done.duplicate.slug}`} className="font-semibold underline">
              {done.duplicate.name}
            </Link>
            . We&apos;ll use your details to update it if it&apos;s the same place.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink"
          >
            Back to search
          </Link>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate={false}>
      <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {existing && <input type="hidden" name="update_slug" value={existing.slug} />}

      <p className="text-xs text-muted">
        <span className="text-halal-partialInk" aria-hidden="true">*</span> Required
      </p>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink">The restaurant</h2>
        <Field label="Restaurant name" name="name" required minLength={2} maxLength={120} autoComplete="organization" defaultValue={existing?.name} />
        <Field label="Street address" name="address" required minLength={5} maxLength={300} autoComplete="street-address" placeholder="Number and street" defaultValue={existing?.address} />
        <Field
          label="Postcode"
          name="postcode"
          required
          maxLength={10}
          autoComplete="postal-code"
          hint="We use this to place it on the map, so it needs to be the restaurant's full postcode."
          defaultValue={existing?.postcode}
          className={`${FIELD_CLASS} uppercase sm:max-w-[12rem]`}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            hint="How we check: we ring and ask."
            defaultValue={existing?.phone}
          />
          <div>
            <label htmlFor={cuisineId} className={LABEL_CLASS}>
              Cuisine
            </label>
            <select id={cuisineId} name="cuisine" className={FIELD_CLASS} defaultValue={cuisines.some((c) => c.name === existing?.cuisine) ? existing!.cuisine : ''}>
              <option value="">Choose one</option>
              {cuisines.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Website" name="website" type="url" inputMode="url" placeholder="https://" defaultValue={existing?.website} />
          <Field label="Instagram" name="instagram" placeholder="@handle" />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-black/10 p-4 sm:p-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Halal information</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Tell us what you know. We show where information came from, so a listing from a form
            stays marked as not yet checked until we can confirm it.
          </p>
        </div>
        <Choice
          name="halal_claim"
          label="What best describes the food?"
          options={[
            { value: 'fully_halal', label: 'All meat is halal' },
            { value: 'halal_options', label: 'Some halal options' },
            { value: 'unknown', label: 'Not sure' },
          ]}
        />
        <Choice name="serves_pork" label="Is pork served?" options={YES_NO} />
        <Choice name="serves_alcohol" label="Is alcohol served?" options={YES_NO} />
        <Field label="Halal certifier, if any" name="certification_body" placeholder="For example HMC or HFA" maxLength={80} />
        <Field
          label="Link that shows it"
          name="evidence_url"
          type="url"
          inputMode="url"
          placeholder="https://"
          hint="A menu, certificate or post that mentions halal. This is what lets us check it quickly."
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink">About you</h2>
        <Choice
          name="relationship"
          label="How do you know this restaurant?"
          required
          options={[
            { value: 'owner', label: 'I run it' },
            { value: 'staff', label: 'I work there' },
            { value: 'customer', label: "I've eaten there" },
          ]}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Your name" name="contact_name" required autoComplete="name" minLength={2} maxLength={100} />
          <Field
            label="Your email"
            name="contact_email"
            type="email"
            required
            autoComplete="email"
            maxLength={200}
            hint="Only used to ask about this listing. Never published, never sold."
          />
        </div>
        <div>
          <label htmlFor={notesId} className={LABEL_CLASS}>
            Anything else we should know?
          </label>
          <textarea id={notesId} name="notes" rows={3} maxLength={1000} className={FIELD_CLASS} />
        </div>
      </section>

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
        {submitting ? 'Sending…' : existing ? 'Send the edit for review' : 'Send for review'}
      </button>
    </form>
  );
}
