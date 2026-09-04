'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FIELD_CLASS =
  'w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-ink/80';

function TriToggle({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState<'yes' | 'no' | 'unknown'>('unknown');
  return (
    <div>
      <span className={LABEL_CLASS}>{label}</span>
      <div className="flex gap-1.5">
        {(['yes', 'no', 'unknown'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setValue(opt)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
              value === opt ? 'border-ink bg-ink text-white' : 'border-black/10 text-ink/60 hover:border-ink/30'
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/restaurants/submit', { method: 'POST', body: new FormData(e.currentTarget) });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong — please try again.');
      return;
    }
    router.push(`/restaurant/${json.slug}?submitted=true`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" />

      <div>
        <label className={LABEL_CLASS}>Restaurant name *</label>
        <input name="name" required className={FIELD_CLASS} placeholder="e.g. Al-Waha Grill House" />
      </div>
      <div>
        <label className={LABEL_CLASS}>Address *</label>
        <input name="address" required className={FIELD_CLASS} placeholder="Street, area, postcode" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Phone</label>
          <input name="phone" className={FIELD_CLASS} placeholder="020 7946 0000" />
        </div>
        <div>
          <label className={LABEL_CLASS}>Cuisine</label>
          <select name="cuisine_id" className={FIELD_CLASS}>
            <option value="">Select…</option>
            {cuisines.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Website</label>
          <input name="website" type="url" className={FIELD_CLASS} placeholder="https://" />
        </div>
        <div>
          <label className={LABEL_CLASS}>Instagram</label>
          <input name="instagram" className={FIELD_CLASS} placeholder="@yourrestaurant" />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-black/10 p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Basic halal information</legend>
        <p className="-mt-1 text-xs text-ink/45">
          Tell us what you know — &quot;Unknown&quot; is fine. This is your claim, not a verification.
        </p>
        <TriToggle name="all_meat_halal" label="Is all meat halal?" />
        <TriToggle name="serves_non_halal_meat" label="Do you serve any non-halal meat?" />
        <TriToggle name="serves_pork" label="Do you serve pork?" />
        <TriToggle name="serves_alcohol" label="Do you serve alcohol?" />
        <TriToggle name="has_certification" label="Do you hold halal certification?" />
        <input name="certification_body" className={FIELD_CLASS} placeholder="Certification body (e.g. HMC, HFA) — if applicable" />
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-black/10 p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Your contact details</legend>
        <input name="contact_name" className={FIELD_CLASS} placeholder="Your name" />
        <input name="contact_email" type="email" className={FIELD_CLASS} placeholder="Your email" />
      </fieldset>

      {error && <p className="text-sm text-halal-partial">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit restaurant'}
      </button>
    </form>
  );
}
