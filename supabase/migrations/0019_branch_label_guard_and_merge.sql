-- 0019_branch_label_guard_and_merge
--
-- Follow-ups applied while backfilling brands. Recorded here so the repo
-- describes production rather than trailing it.

-- ============================================================================
-- 1. A branch label has to be a place
-- ============================================================================
--
-- Enforced in the database, not in the ingestion script, because four separate
-- code paths derive these (a human-written "(Area)" suffix, the address
-- locality, a street fallback, and a collision refinement when one brand has
-- several branches in one neighbourhood). Each path is a chance to reintroduce
-- the same class of value, and "Morley's — Ground Floor" fails to distinguish a
-- branch just as completely as showing "Morley's" twice.
--
-- Nulls rather than raises: a missing label is harmless — the card falls back
-- to name plus distance — while a wrong one is actively misleading.
create or replace function public.normalise_branch_label()
returns trigger language plpgsql as $$
begin
  if new.branch_label is null then
    return new;
  end if;

  new.branch_label := nullif(btrim(new.branch_label), '');

  -- \y is a word boundary: without it, "shop" also rejects Bishopsgate.
  if new.branch_label is not null and (
       new.branch_label ~* '(ground floor|first floor|second floor|basement|\yunit\y|\yunits\y|\yshop\y|\ykiosk\y|\ystall\y|rear of|\ysuite\y|\ypremises\y|\ycommercial\y)'
    or new.branch_label ~ '^[0-9]'
    or length(new.branch_label) > 40
  ) then
    new.branch_label := null;
  end if;

  return new;
end;
$$;

drop trigger if exists restaurants_normalise_branch_label on public.restaurants;
create trigger restaurants_normalise_branch_label
  before insert or update of branch_label on public.restaurants
  for each row execute function public.normalise_branch_label();

-- ============================================================================
-- 2. Merging a duplicate must be reversible
-- ============================================================================
--
-- Resolving a duplicate does not delete a row. Recording which record
-- superseded which keeps the decision undoable, preserves the losing record's
-- provenance, and lets a later ingest that rediscovers the same business match
-- against it instead of creating a third copy.
alter table public.restaurants
  add column if not exists merged_into uuid references public.restaurants(id) on delete set null;

create index if not exists restaurants_merged_into_idx on public.restaurants (merged_into)
  where merged_into is not null;

-- ============================================================================
-- 3. restaurants_with_coords had a frozen column list
-- ============================================================================
--
-- Postgres expands `select r.*` at view-creation time, so this view still
-- described the pre-0018 table and silently omitted brand_id, branch_label,
-- catalogue_status, last_checked_at and merged_into. Anything reading the
-- catalogue through the view — including the restaurant detail page — could not
-- see them. It must be recreated after any column is added to restaurants.
drop view if exists public.restaurants_with_coords;

create view public.restaurants_with_coords as
select
  r.*,
  ST_Y(r.location::geometry) as lat,
  ST_X(r.location::geometry) as lng
from public.restaurants r;

grant select on public.restaurants_with_coords to anon, authenticated;

-- ============================================================================
-- 4. search_restaurants excludes merged records
-- ============================================================================
-- The full definition lives in 0018; this adds `merged_into is null` alongside
-- the existing closed-establishment filter. Radius rules are untouched.
create or replace function public.search_restaurants(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int,
  p_mode text default 'current_location',
  p_classification text[] default null,
  p_cuisine_ids int[] default null,
  p_query text default null
)
returns table (
  id uuid, name text, slug text, address text,
  lat double precision, lng double precision,
  halal_classification text, distance_meters double precision,
  primary_photo_path text, cuisines text[],
  effective_radius_meters int, is_yep_plus boolean,
  brand_name text, branch_label text
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_is_yep_plus boolean;
  v_max_radius int;
  v_effective_radius int;
begin
  v_is_yep_plus := public.is_current_user_yep_plus();

  if v_is_yep_plus then
    v_max_radius := 80467;
  elsif p_mode = 'current_location' then
    v_max_radius := 1609;
  else
    v_max_radius := 805;
  end if;

  v_effective_radius := least(coalesce(p_radius_meters, v_max_radius), v_max_radius);

  return query
  select
    r.id, r.name, r.slug, r.address,
    ST_Y(r.location::geometry), ST_X(r.location::geometry),
    r.halal_classification::text,
    st_distance(r.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography),
    (select rp.storage_path from public.restaurant_photos rp
      where rp.restaurant_id = r.id and rp.is_primary limit 1),
    (select array_agg(c.name order by c.name) from public.restaurant_cuisines rc
      join public.cuisines c on c.id = rc.cuisine_id where rc.restaurant_id = r.id),
    v_effective_radius, v_is_yep_plus,
    b.name, r.branch_label
  from public.restaurants r
  left join public.brands b on b.id = r.brand_id
  where st_dwithin(r.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, v_effective_radius)
    and r.catalogue_status <> 'permanently_closed'
    and r.merged_into is null
    and (p_classification is null or r.halal_classification::text = any(p_classification))
    and (p_cuisine_ids is null or exists (
      select 1 from public.restaurant_cuisines rc2
      where rc2.restaurant_id = r.id and rc2.cuisine_id = any(p_cuisine_ids)
    ))
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
  order by distance_meters asc
  limit 100;
end;
$$;

grant execute on function public.search_restaurants(double precision, double precision, int, text, text[], int[], text) to anon, authenticated;
