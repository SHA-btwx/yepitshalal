import { notFound } from 'next/navigation';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { publishVerification } from '@/lib/admin-actions';

export const dynamic = 'force-dynamic';

const FIELD_CLASS = 'rounded-lg border border-black/10 px-3 py-2 text-sm';

function TriSelect({ name, label, defaultValue }: { name: string; label: string; defaultValue?: boolean | null }) {
  const value = defaultValue === true ? 'yes' : defaultValue === false ? 'no' : 'unknown';
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink/70">{label}</span>
      <select name={name} defaultValue={value} className={FIELD_CLASS}>
        <option value="yes">Yes</option>
        <option value="no">No</option>
        <option value="unknown">Unknown</option>
      </select>
    </label>
  );
}

export default async function ReviewVerificationPage({ params }: { params: { id: string } }) {
  const supabase = createAdminSupabase();
  const { data: request } = await supabase
    .from('verification_requests')
    .select('id, queue_type, status, contact_name, contact_email, restaurant_id, restaurants(id, name, slug, halal_classification)')
    .eq('id', params.id)
    .maybeSingle();

  if (!request) notFound();

  const { data: claims } = await supabase
    .from('restaurant_claims')
    .select('*')
    .eq('restaurant_id', request.restaurant_id)
    .order('submitted_at', { ascending: false })
    .limit(1);

  const claim = claims?.[0];
  const restaurant = request.restaurants as unknown as {
    id: string;
    name: string;
    slug: string;
    halal_classification: string;
  };

  const publishWithId = publishVerification.bind(null, request.id);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">{restaurant.name}</h1>
      <p className="text-sm text-ink/55">
        {request.queue_type === 'priority' ? '£30 Priority' : 'Free'} request · currently{' '}
        <strong>{restaurant.halal_classification}</strong>
      </p>

      {claim && (
        <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 text-sm">
          <h2 className="font-semibold text-ink">Restaurant&apos;s own claim</h2>
          <p className="mt-1 text-ink/60">
            All meat halal: {String(claim.all_meat_halal)} · Non-halal meat:{' '}
            {String(claim.serves_non_halal_meat)} · Pork: {String(claim.serves_pork)} · Alcohol:{' '}
            {String(claim.serves_alcohol)} · Certified: {String(claim.has_certification)}{' '}
            {claim.certification_body ? `(${claim.certification_body})` : ''}
          </p>
          {claim.evidence_note && <p className="mt-1 text-ink/50">{claim.evidence_note}</p>}
        </div>
      )}

      <form action={publishWithId} className="mt-6 space-y-4 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="font-semibold text-ink">Verified facts</h2>
        <TriSelect name="all_meat_halal" label="All meat halal?" defaultValue={claim?.all_meat_halal} />
        <TriSelect name="serves_non_halal_meat" label="Serves non-halal meat?" defaultValue={claim?.serves_non_halal_meat} />
        <TriSelect name="serves_pork" label="Serves pork?" defaultValue={claim?.serves_pork} />
        <TriSelect name="serves_alcohol" label="Serves alcohol?" defaultValue={claim?.serves_alcohol} />
        <TriSelect name="has_certification" label="Halal certified?" defaultValue={claim?.has_certification} />
        <input
          name="certification_body"
          defaultValue={claim?.certification_body ?? ''}
          placeholder="Certification body"
          className={`${FIELD_CLASS} w-full`}
        />
        <textarea
          name="notes"
          placeholder="Internal verification notes (never shown publicly)"
          className={`${FIELD_CLASS} w-full`}
          rows={3}
        />

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Classification</label>
          <select name="classification" required className={`${FIELD_CLASS} w-full`}>
            <option value="fully_halal">🟢 Fully Halal</option>
            <option value="halal_options">🟡 Halal Options</option>
            <option value="unverified">⚪ Unable to Verify</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-ink"
        >
          Publish result
        </button>
      </form>
    </div>
  );
}
