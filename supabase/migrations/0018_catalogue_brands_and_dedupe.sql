-- 0018_catalogue_brands_and_dedupe
--
-- Stage 0 + 1 of the catalogue expansion: model chains properly, give every
-- record a lifecycle state, and build a deduplication review queue before any
-- second data source is ingested.
--
-- Why this has to land before more ingestion: scripts/import-osm.mjs
-- deduplicates only on source_reference_id (the OSM node id). It has no idea
-- whether an FSA row already describes the same restaurant, so running it today
-- would insert a second record for every establishment both sources know about.
-- Dedupe first, ingest second.
--
-- The central rule this encodes: one brand can have many locations, and each
-- physical location is independently verifiable. Nothing here touches
-- halal_classification, the verification tables, or the radius limits.

-- ============================================================================
-- Brands
-- ============================================================================

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  created_at timestamptz not null default now()
);

alter table public.brands enable row level security;
create policy brands_public_read on public.brands for select using (true);

-- ============================================================================
-- Catalogue lifecycle
-- ============================================================================

-- A closed restaurant is not deleted — we keep knowing it existed, and a source
-- dropping a record is not proof it closed. Anything uncertain lands in
-- needs_review rather than being auto-closed.
create type catalogue_status as enum (
  'active',
  'temporarily_closed',
  'permanently_closed',
  'needs_review'
);

alter table public.restaurants
  add column if not exists brand_id uuid references public.brands(id) on delete set null,
  -- The neighbourhood or street that distinguishes this branch from its
  -- siblings — "Peckham", "Old Kent Road". Never invented: derived from the
  -- address, or left null.
  add column if not exists branch_label text,
  add column if not exists catalogue_status catalogue_status not null default 'active',
  add column if not exists last_checked_at timestamptz;

create index if not exists restaurants_brand_idx on public.restaurants (brand_id);
create index if not exists restaurants_catalogue_status_idx on public.restaurants (catalogue_status)
  where catalogue_status <> 'active';

-- ============================================================================
-- Deduplication review queue
-- ============================================================================

create type dedupe_status as enum ('pending', 'merged', 'distinct', 'dismissed');

-- Candidate pairs only. Nothing in this table has been acted on: a pair sits
-- here until a human says "same place" or "different branches". We would rather
-- carry a temporary duplicate than silently merge two real restaurants.
create table if not exists public.catalogue_dedupe_candidates (
  id uuid primary key default gen_random_uuid(),
  restaurant_a uuid not null references public.restaurants(id) on delete cascade,
  restaurant_b uuid not null references public.restaurants(id) on delete cascade,
  -- 0-100. Scored on name, distance, postcode, phone and website agreement.
  score int not null,
  -- Which signals fired, so an admin can see *why* it was flagged.
  signals jsonb not null default '{}'::jsonb,
  status dedupe_status not null default 'pending',
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  -- Ordered pair, so the same two restaurants can only be queued once.
  constraint dedupe_pair_ordered check (restaurant_a < restaurant_b),
  constraint dedupe_pair_unique unique (restaurant_a, restaurant_b)
);

create index if not exists dedupe_pending_idx on public.catalogue_dedupe_candidates (score desc)
  where status = 'pending';

alter table public.catalogue_dedupe_candidates enable row level security;
-- No policies: admin-only, read and written through the service role.

-- ============================================================================
-- Coverage
-- ============================================================================

-- Answers "where are the gaps?" at the postcode-district level, which is the
-- granularity the ingestion scripts actually target.
create or replace view public.catalogue_coverage as
select
  coalesce(nullif(upper(regexp_replace(split_part(trim(postcode), ' ', 1), '[0-9].*$', '')), ''), '??')
    as district,
  coalesce(nullif(upper(split_part(trim(postcode), ' ', 1)), ''), '??') as outward,
  count(*) as total,
  count(*) filter (where catalogue_status = 'active') as active,
  count(*) filter (where catalogue_status = 'needs_review') as needs_review,
  count(*) filter (where catalogue_status = 'permanently_closed') as closed,
  count(*) filter (where halal_classification = 'unverified') as unverified,
  count(*) filter (where halal_classification <> 'unverified') as verified,
  count(*) filter (where brand_id is not null) as chain_branches
from public.restaurants
group by 1, 2;

-- ============================================================================
-- Search: brand-aware, closure-aware, and searchable by more than name
-- ============================================================================

-- Return type gains brand_name/branch_label, so this is a drop-and-create
-- rather than a replace. Inside one migration that is atomic — there is no
-- window where the function is missing.
--
-- The radius rules are copied across UNCHANGED: 1 mile current-location free,
-- 0.5 mile searched-location free, Yep+ lifted. This migration must not alter
-- the consumer model.
drop function if exists public.search_restaurants(double precision, double precision, int, text, text[], int[], text);

create function public.search_restaurants(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int,
  p_mode text default 'current_location',
  p_classification text[] default null,
  p_cuisine_ids int[] default null,
  p_query text default null
)
returns table (
  id uuid,
  name text,
  slug text,
  address text,
  lat double precision,
  lng double precision,
  halal_classification text,
  distance_meters double precision,
  primary_photo_path text,
  cuisines text[],
  effective_radius_meters int,
  is_yep_plus boolean,
  brand_name text,
  branch_label text
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_is_yep_plus boolean;
  v_max_radius int;
  v_effective_radius int;
begin
  v_is_yep_plus := public.is_current_user_yep_plus();

  if v_is_yep_plus then
    v_max_radius := 80467; -- 50 miles, top of the Yep+ selector; "Unlimited" handled client-side
  elsif p_mode = 'current_location' then
    v_max_radius := 1609; -- 1 mile hard cap, free tier
  else
    v_max_radius := 805; -- 0.5 mile hard cap, free tier
  end if;

  v_effective_radius := least(coalesce(p_radius_meters, v_max_radius), v_max_radius);

  return query
  select
    r.id,
    r.name,
    r.slug,
    r.address,
    ST_Y(r.location::geometry) as lat,
    ST_X(r.location::geometry) as lng,
    r.halal_classification::text,
    st_distance(r.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_meters,
    (select rp.storage_path from public.restaurant_photos rp
      where rp.restaurant_id = r.id and rp.is_primary limit 1) as primary_photo_path,
    (select array_agg(c.name order by c.name) from public.restaurant_cuisines rc
      join public.cuisines c on c.id = rc.cuisine_id where rc.restaurant_id = r.id) as cuisines,
    v_effective_radius as effective_radius_meters,
    v_is_yep_plus as is_yep_plus,
    b.name as brand_name,
    r.branch_label
  from public.restaurants r
  left join public.brands b on b.id = r.brand_id
  where st_dwithin(r.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, v_effective_radius)
    -- A closed restaurant must not be presented as somewhere you can eat.
    and r.catalogue_status <> 'permanently_closed'
    and (p_classification is null or r.halal_classification::text = any(p_classification))
    and (p_cuisine_ids is null or exists (
      select 1 from public.restaurant_cuisines rc2
      where rc2.restaurant_id = r.id and rc2.cuisine_id = any(p_cuisine_ids)
    ))
    -- Name was the only searchable field. A user looking for "Morley's" or
    -- "Peckham" or "biryani" or a postcode should all land somewhere sensible.
    and (
      p_query is null
      or r.name ilike '%' || p_query || '%'
      or b.name ilike '%' || p_query || '%'
      or r.branch_label ilike '%' || p_query || '%'
      or r.address ilike '%' || p_query || '%'
      or exists (
        select 1 from public.restaurant_cuisines rc3
        join public.cuisines c3 on c3.id = rc3.cuisine_id
        where rc3.restaurant_id = r.id and c3.name ilike '%' || p_query || '%'
      )
    )
  -- Distance first, exactly as before. Two branches of one chain inside the
  -- radius both appear; they are never collapsed into one result.
  order by distance_meters asc
  limit 100;
end;
$$;

grant execute on function public.search_restaurants(double precision, double precision, int, text, text[], int[], text) to anon, authenticated;
