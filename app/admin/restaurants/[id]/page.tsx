import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { updateRestaurant, addVideo, deletePhoto, setPrimaryPhoto } from '@/lib/admin-actions';
import { PhotoUploader } from '@/components/PhotoUploader';

export const dynamic = 'force-dynamic';

const FIELD_CLASS = 'w-full rounded-lg border border-black/10 px-3 py-2 text-sm';

export default async function AdminRestaurantEditPage({ params }: { params: { id: string } }) {
  const supabase = createAdminSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, address, description, phone, website_url, menu_url, halal_classification')
    .eq('id', params.id)
    .maybeSingle();
  if (!restaurant) notFound();

  const [{ data: photos }, { data: videos }] = await Promise.all([
    supabase
      .from('restaurant_photos')
      .select('id, storage_path, is_primary')
      .eq('restaurant_id', restaurant.id)
      .order('is_primary', { ascending: false }),
    supabase.from('restaurant_videos').select('id, provider, embed_url, caption').eq('restaurant_id', restaurant.id),
  ]);

  const updateWithId = updateRestaurant.bind(null, restaurant.id);
  const addVideoWithId = addVideo.bind(null, restaurant.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">{restaurant.name}</h1>
      <p className="text-sm text-ink/50">Status: {restaurant.halal_classification}</p>

      <form action={updateWithId} className="mt-6 space-y-3 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="font-semibold text-ink">Details</h2>
        <input name="name" defaultValue={restaurant.name} className={FIELD_CLASS} placeholder="Name" />
        <input name="address" defaultValue={restaurant.address} className={FIELD_CLASS} placeholder="Address" />
        <textarea
          name="description"
          defaultValue={restaurant.description ?? ''}
          className={FIELD_CLASS}
          placeholder="Description"
          rows={2}
        />
        <input name="phone" defaultValue={restaurant.phone ?? ''} className={FIELD_CLASS} placeholder="Phone" />
        <input
          name="website_url"
          defaultValue={restaurant.website_url ?? ''}
          className={FIELD_CLASS}
          placeholder="Website"
        />
        <input name="menu_url" defaultValue={restaurant.menu_url ?? ''} className={FIELD_CLASS} placeholder="Menu URL" />
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-accent-ink">
          Save details
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Photos</h2>
          <PhotoUploader restaurantId={restaurant.id} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {(photos ?? []).map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-halal-unverifiedSoft">
              <Image src={photo.storage_path} alt="" fill className="object-cover" />
              {photo.is_primary && (
                <span className="absolute left-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Main
                </span>
              )}
              <div className="absolute inset-0 flex items-end justify-center gap-1 bg-black/0 p-1 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                {!photo.is_primary && (
                  <form action={setPrimaryPhoto.bind(null, restaurant.id, photo.id)}>
                    <button className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold">Set main</button>
                  </form>
                )}
                <form action={deletePhoto.bind(null, restaurant.id, photo.id)}>
                  <button className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-halal-partial">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
          {(photos ?? []).length === 0 && <p className="col-span-full text-sm text-ink/40">No photos yet.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="font-semibold text-ink">Food videos</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink/60">
          {(videos ?? []).map((v) => (
            <li key={v.id}>
              {v.provider}: {v.embed_url}
            </li>
          ))}
          {(videos ?? []).length === 0 && <li className="text-ink/40">No videos yet.</li>}
        </ul>
        <form action={addVideoWithId} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input name="embed_url" placeholder="YouTube / Instagram / TikTok URL" className={`${FIELD_CLASS} flex-1`} />
          <input name="caption" placeholder="Caption (optional)" className={`${FIELD_CLASS} sm:w-48`} />
          <button className="shrink-0 rounded-full border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-ink hover:text-white">
            Add video
          </button>
        </form>
      </div>
    </div>
  );
}
