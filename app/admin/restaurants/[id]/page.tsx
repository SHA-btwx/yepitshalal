import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { updateRestaurant, addVideo, deletePhoto, setPrimaryPhoto } from '@/lib/admin-actions';
import { PhotoUploader } from '@/components/PhotoUploader';
import { ConfirmSubmitButton } from '@/components/admin/ConfirmSubmitButton';
import { HalalBadge } from '@/components/HalalBadge';
import { ArrowUpRightIcon, StarIcon, TrashIcon, PlusIcon } from '@/components/icons';
import { AdminPage, Panel, Field, FIELD, BUTTON, BUTTON_SECONDARY } from '@/components/admin/ui';
import type { HalalClassification } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminRestaurantEditPage({ params }: { params: { id: string } }) {
  const supabase = createAdminSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, address, description, phone, website_url, menu_url, halal_classification')
    .eq('id', params.id)
    .maybeSingle();
  if (!restaurant) notFound();

  const [{ data: photos }, { data: videos }] = await Promise.all([
    supabase
      .from('restaurant_photos')
      .select('id, storage_path, is_primary')
      .eq('restaurant_id', restaurant.id)
      .order('is_primary', { ascending: false }),
    supabase
      .from('restaurant_videos')
      .select('id, provider, embed_url, caption')
      .eq('restaurant_id', restaurant.id),
  ]);

  const updateWithId = updateRestaurant.bind(null, restaurant.id);
  const addVideoWithId = addVideo.bind(null, restaurant.id);

  return (
    <AdminPage
      title={restaurant.name}
      description={
        <span className="inline-flex items-center gap-2">
          <HalalBadge
            classification={restaurant.halal_classification as HalalClassification}
            size="sm"
          />
          <span>Set by verification, not here.</span>
        </span>
      }
      action={
        <Link
          href={`/restaurant/${restaurant.slug}`}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
        >
          View listing
          <ArrowUpRightIcon className="h-4 w-4" />
        </Link>
      }
    >
      <div className="space-y-5">
        <Panel title="Details">
          <form action={updateWithId} className="space-y-4 px-5 py-4">
            <Field label="Name" htmlFor="name">
              <input id="name" name="name" defaultValue={restaurant.name} className={FIELD} />
            </Field>
            <Field label="Address" htmlFor="address">
              <input
                id="address"
                name="address"
                defaultValue={restaurant.address}
                className={FIELD}
              />
            </Field>
            <Field label="Description" htmlFor="description">
              <textarea
                id="description"
                name="description"
                defaultValue={restaurant.description ?? ''}
                rows={3}
                className={FIELD}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Phone" htmlFor="phone">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={restaurant.phone ?? ''}
                  className={FIELD}
                />
              </Field>
              <Field label="Website" htmlFor="website_url">
                <input
                  id="website_url"
                  name="website_url"
                  type="url"
                  defaultValue={restaurant.website_url ?? ''}
                  placeholder="https://"
                  className={FIELD}
                />
              </Field>
            </div>
            <Field label="Menu URL" htmlFor="menu_url">
              <input
                id="menu_url"
                name="menu_url"
                type="url"
                defaultValue={restaurant.menu_url ?? ''}
                placeholder="https://"
                className={FIELD}
              />
            </Field>
            <button type="submit" className={BUTTON}>
              Save details
            </button>
          </form>
        </Panel>

        <Panel title="Photos" action={<PhotoUploader restaurantId={restaurant.id} />}>
          <div className="px-5 py-4">
            {(photos ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No photos yet.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {(photos ?? []).map((photo) => (
                  <li
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-halal-unverifiedSoft"
                  >
                    <Image
                      src={photo.storage_path}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 33vw, 160px"
                      className="object-cover"
                    />
                    {photo.is_primary && (
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                        <StarIcon className="h-3 w-3" />
                        Main
                      </span>
                    )}
                    {/* focus-within, not just hover: these controls were
                        unreachable by keyboard inside a hover-only overlay. */}
                    <div className="absolute inset-0 flex items-end justify-center gap-1.5 bg-black/0 p-1.5 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100 group-focus-within:bg-black/45 group-focus-within:opacity-100">
                      {!photo.is_primary && (
                        <form action={setPrimaryPhoto.bind(null, restaurant.id, photo.id)}>
                          <button
                            type="submit"
                            title="Set as main photo"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition hover:bg-white"
                          >
                            <StarIcon className="h-4 w-4" />
                            <span className="sr-only">Set as main photo</span>
                          </button>
                        </form>
                      )}
                      <form action={deletePhoto.bind(null, restaurant.id, photo.id)}>
                        <ConfirmSubmitButton
                          message="Delete this photo? This cannot be undone."
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-halal-partialInk shadow-sm transition hover:bg-white"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span className="sr-only">Delete photo</span>
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="Food videos">
          <div className="px-5 py-4">
            {(videos ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No videos yet.</p>
            ) : (
              <ul className="space-y-2">
                {(videos ?? []).map((v) => (
                  <li key={v.id} className="flex items-center gap-2 text-sm">
                    <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-xs font-semibold capitalize text-ink/75">
                      {v.provider}
                    </span>
                    <a
                      href={v.embed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-accent-ink hover:underline"
                    >
                      {v.embed_url}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <form action={addVideoWithId} className="mt-4 space-y-3 border-t border-line pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem]">
                <Field label="Video URL" htmlFor="embed_url">
                  <input
                    id="embed_url"
                    name="embed_url"
                    type="url"
                    placeholder="YouTube / Instagram / TikTok"
                    className={FIELD}
                  />
                </Field>
                <Field label="Caption" htmlFor="caption">
                  <input id="caption" name="caption" className={FIELD} />
                </Field>
              </div>
              <button type="submit" className={BUTTON_SECONDARY}>
                <PlusIcon className="h-4 w-4" />
                Add video
              </button>
            </form>
          </div>
        </Panel>
      </div>
    </AdminPage>
  );
}
