import { createAdminSupabase } from '@/lib/supabase/admin';
import { createOffer, deleteOffer } from '@/lib/admin-actions';
import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton';
import { TrashIcon } from '@/components/icons';
import { AdminPage, Panel, List, Row, Field, Tag, FIELD, BUTTON } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Yep+ offers' };

interface OfferRow {
  id: string;
  title: string;
  description: string | null;
  yep_plus_only: boolean;
  is_early_access: boolean;
  voucher_code: string | null;
  restaurants: { name: string } | null;
}

export default async function AdminOffersPage() {
  const supabase = createAdminSupabase();
  const [{ data: offers }, { data: restaurants }] = await Promise.all([
    supabase
      .from('offers')
      .select(
        'id, title, description, yep_plus_only, is_early_access, voucher_code, restaurants(name)'
      )
      .order('created_at', { ascending: false }),
    supabase.from('restaurants').select('id, name').order('name'),
  ]);

  const rows = (offers ?? []) as unknown as OfferRow[];

  return (
    <AdminPage
      title="Yep+ offers"
      description={
        <>
          The basic concept only — no redemption or payment system. Voucher codes are hidden
          from non-Yep+ users automatically via <code className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-[0.8em]">offers_public</code>.
        </>
      }
    >
      <div className="space-y-5">
        <Panel title="New offer">
          <form action={createOffer} className="space-y-4 px-5 py-4">
            <Field label="Title" htmlFor="offer-title">
              <input
                id="offer-title"
                name="title"
                required
                placeholder="e.g. 20% off your bill"
                className={FIELD}
              />
            </Field>

            <Field label="Description" htmlFor="offer-description">
              <textarea id="offer-description" name="description" rows={2} className={FIELD} />
            </Field>

            <Field
              label="Restaurant"
              htmlFor="offer-restaurant"
              hint="Leave as platform-wide to show the offer everywhere."
            >
              <select id="offer-restaurant" name="restaurant_id" className={FIELD}>
                <option value="">Platform-wide (no specific restaurant)</option>
                {(restaurants ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Voucher code" htmlFor="offer-voucher" hint="Optional.">
              <input id="offer-voucher" name="voucher_code" className={FIELD} />
            </Field>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Visibility</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/80">
                <label className="inline-flex min-h-[36px] items-center gap-2">
                  <input
                    type="checkbox"
                    name="yep_plus_only"
                    defaultChecked
                    className="h-4 w-4 accent-accent-ink"
                  />
                  Yep+ exclusive
                </label>
                <label className="inline-flex min-h-[36px] items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_early_access"
                    className="h-4 w-4 accent-accent-ink"
                  />
                  Early access
                </label>
              </div>
            </fieldset>

            <button type="submit" className={BUTTON}>
              Create offer
            </button>
          </form>
        </Panel>

        <Panel title="All offers" action={<Tag>{rows.length}</Tag>}>
          <List empty="No offers yet.">
            {rows.map((o) => (
              <Row key={o.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{o.title}</p>
                  <p className="truncate text-xs text-muted">
                    {o.restaurants?.name ?? 'Platform-wide'}
                    {o.voucher_code ? ` · code ${o.voucher_code}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {o.yep_plus_only ? <Tag tone="ink">Yep+ only</Tag> : <Tag>All users</Tag>}
                  {o.is_early_access && <Tag tone="accent">Early access</Tag>}
                  <form action={deleteOffer.bind(null, o.id)}>
                    <ConfirmSubmitButton
                      message={`Delete the offer “${o.title}”? This cannot be undone.`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-halal-partialInk transition hover:bg-halal-partialSoft"
                    >
                      <TrashIcon className="h-[18px] w-[18px]" />
                      <span className="sr-only">Delete offer</span>
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </Row>
            ))}
          </List>
        </Panel>
      </div>
    </AdminPage>
  );
}
