-- Somewhere to pray: hours for the mosques, and a prayer room at a restaurant.
--
-- Two small additions, both about the same question a person actually has:
-- "if I eat here, where do I pray, and will it be open?"
--
-- 1. prayer_spaces gains the two OpenStreetMap time tags. Almost no mosque in
--    OSM carries them (5 of 248 at the time of writing), which is itself worth
--    saying on the page: a mosque listed as open may not be, and the only
--    reliable answer is the mosque's own phone or website. We store the raw
--    tag, never a parsed "open now", because a wrong "open now" for maghrib is
--    worse than no answer at all.
--
-- 2. restaurants gains a prayer facility, reported by whoever told us and
--    dated, the same shape as every other fact here. null is "nobody has told
--    us", which the site shows as exactly that, never as "no". It is not
--    evidence about food and must never touch a halal label: refresh_halal_status
--    does not read these columns.

alter table public.prayer_spaces
  add column if not exists opening_hours text,
  add column if not exists service_times text;

comment on column public.prayer_spaces.opening_hours is
  'Raw OpenStreetMap opening_hours tag. Shown as-is with a caveat, never parsed into an open/closed state.';
comment on column public.prayer_spaces.service_times is
  'Raw OpenStreetMap service_times tag: when prayers are held, where a mapper recorded it.';

alter table public.restaurants
  add column if not exists prayer_facility text
    check (prayer_facility in ('prayer_room', 'space', 'none')),
  add column if not exists prayer_facility_note text,
  add column if not exists prayer_facility_source text
    check (prayer_facility_source in ('owner', 'staff', 'customer', 'yepitshalal')),
  add column if not exists prayer_facility_at timestamptz;

comment on column public.restaurants.prayer_facility is
  'prayer_room = a room set aside; space = somewhere you can pray, not a dedicated room; none = told there is nowhere. null = nobody has told us.';

alter table public.restaurant_submissions
  add column if not exists prayer_facility text
    check (prayer_facility in ('prayer_room', 'space', 'none')),
  add column if not exists prayer_facility_note text;

-- nearest_prayer_spaces() returns a fixed column list, so it is recreated to
-- carry the times. Same body otherwise.
drop function if exists public.nearest_prayer_spaces(double precision, double precision, integer, integer);

create function public.nearest_prayer_spaces(
  p_lat double precision,
  p_lng double precision,
  p_limit integer default 3,
  p_radius_meters integer default 3000
)
returns table (
  id uuid,
  name text,
  slug text,
  address text,
  postcode text,
  borough text,
  kind text,
  website_url text,
  phone text,
  opening_hours text,
  service_times text,
  has_womens_area boolean,
  wheelchair boolean,
  lat double precision,
  lng double precision,
  distance_meters double precision
)
language sql
stable
set search_path to 'public'
as $$
  select
    p.id, p.name, p.slug, p.address, p.postcode, p.borough,
    p.kind, p.website_url, p.phone, p.opening_hours, p.service_times,
    p.has_womens_area, p.wheelchair,
    st_y(p.location::geometry), st_x(p.location::geometry),
    st_distance(p.location, st_makepoint(p_lng, p_lat)::geography)
  from public.prayer_spaces p
  where st_dwithin(p.location, st_makepoint(p_lng, p_lat)::geography, greatest(least(coalesce(p_radius_meters, 3000), 40000), 100))
  order by p.location <-> st_makepoint(p_lng, p_lat)::geography
  limit greatest(least(coalesce(p_limit, 3), 50), 1);
$$;

grant execute on function public.nearest_prayer_spaces(double precision, double precision, integer, integer) to anon, authenticated;

-- restaurants_with_coords lists its columns explicitly, so the new ones are
-- appended to it (checked_by_us was missing too, from 0037).
create or replace view public.restaurants_with_coords as
 select id, owner_id, name, slug, description, location, address, postcode, phone, email,
    website_url, menu_url, halal_classification, data_source, source_reference_id,
    source_attribution_text, created_at, updated_at, brand_id, branch_label, catalogue_status,
    last_checked_at,
    st_y(location::geometry) as lat,
    st_x(location::geometry) as lng,
    merged_into, is_listed, halal_evidence_strength, halal_summary, halal_checked_at, socials,
    borough, cuisine_label, is_candidate, has_negative_evidence, is_searchable,
    checked_by_us, prayer_facility, prayer_facility_note, prayer_facility_source, prayer_facility_at
   from restaurants r;
