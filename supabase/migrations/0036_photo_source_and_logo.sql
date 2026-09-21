-- Recovered 2026-09-21 from production's migration history
-- (supabase_migrations.schema_migrations, version 20260919132024).
--
-- This was applied to the live database on 2026-09-19 but never saved to the
-- repo, which is why 0036 was a gap in the numbering. The statements below are
-- exactly what production ran. It is idempotent, so running it again against
-- production changes nothing.

-- Where a listing photo came from.
--
-- Places without a photo of their own show a labelled example of the kind of
-- food they serve. Most of them publish a picture of themselves on their own
-- website, in the tag that exists for other sites to show it. Taking that is
-- only defensible if every image can be traced back to the page it came from
-- and removed on request, which is what these columns are for.
--
-- is_logo separates a business's mark from a photograph: a logo is shown whole
-- on a plain background, never cropped to fill a card as though it were a
-- picture of the food.

alter table public.restaurant_photos
  add column if not exists source_url text,
  add column if not exists source_site text,
  add column if not exists is_logo boolean not null default false;

comment on column public.restaurant_photos.source_url is
  'The page this image was published on, for credit and for takedown requests.';
comment on column public.restaurant_photos.source_site is
  'Host of source_url, shown as the credit ("Photo from example.co.uk").';
