import { createAdminSupabase } from '@/lib/supabase/admin';
import { createOffer, deleteOffer } from '@/lib/admin-actions';

export const dynamic = 'force-dynamic';

const FIELD_CLASS = 'w-full rounded-lg border border-black/10 px-3 py-2 text-sm';

export default async function AdminOffersPage() {
  const supabase = createAdminSupabase();
  const [{ data: offers }, { data: restaurants }] = await Promise.all([
    supabase
      .from('offers')
      .select('id, title, description, yep_plus_only, is_early_access, voucher_code, restaurants(name)')
      .order('created_at', { ascending: false }),
    supabase.from('restaurants').select('id, name').order('name'),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Yep+ offers</h1>
      <p className="text-sm text-ink/55">
        The basic concept only — no redemption/payment system. Voucher codes are hidden from
        non-Yep+ users automatically via <code>offers_public</code>.
      </p>

      <form action={createOffer} className="mt-6 space-y-3 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="font-semibold text-ink">New offer</h2>
        <input name="title" required placeholder="Title — e.g. 20% off your bill" className={FIELD_CLASS} />
        <textarea name="description" placeholder="Description" className={FIELD_CLASS} rows={2} />
        <select name="restaurant_id" className={FIELD_CLASS}>
          <option value="">Platform-wide (no specific restaurant)</option>
          {(restaurants ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input name="voucher_code" placeholder="Voucher code (optional)" className={FIELD_CLASS} />
        <div className="flex items-center gap-4 text-sm text-ink/70">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="yep_plus_only" defaultChecked /> Yep+ exclusive
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="is_early_access" /> Early access
          </label>
        </div>
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-accent-ink">
          Create offer
        </button>
      </form>

      <div className="mt-6 divide-y divide-black/5 rounded-2xl border border-black/10 bg-white">
        {(offers ?? []).map((o: any) => (
          <div key={o.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium text-ink">{o.title}</p>
              <p className="text-xs text-ink/45">
                {o.restaurants?.name ?? 'Platform-wide'} · {o.yep_plus_only ? 'Yep+ only' : 'All users'}
                {o.is_early_access ? ' · Early access' : ''}
              </p>
            </div>
            <form action={deleteOffer.bind(null, o.id)}>
              <button className="text-xs font-medium text-halal-partial hover:underline">Delete</button>
            </form>
          </div>
        ))}
        {(offers ?? []).length === 0 && <p className="p-4 text-sm text-ink/40">No offers yet.</p>}
      </div>
    </div>
  );
}
