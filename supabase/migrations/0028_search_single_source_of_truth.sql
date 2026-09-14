-- Search, counts and the paid-radius message from one query.
--
-- Before this:
--   * search_restaurants() ordered by its own output parameter distance_meters,
--     which is null inside the function body, so results were not sorted at
--     all, and LIMIT 100 then kept an arbitrary 100 rather than the nearest.
--   * The result count was however many rows came back, capped at 100.
--   * Nothing could say how many more places a larger radius would show.
--
-- Now search_candidates() is the only definition of "a place that matches this
-- search". search_restaurants() pages through it with the caller's radius
-- entitlement applied, and search_radius_counts() counts it at each tier. The
-- list, the count, the map and "Unlock N more" can therefore never disagree.

create or replace function public.search_candidates(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int,
  p_classification text[] default null,
  p_cuisine_ids int[] default null,
  p_query text default null
)
returns table (id uuid, distance_meters double precision, relevance int)
language sql
stable
set search_path = public
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g,
           nullif(lower(btrim(p_query)), '') as q,
           -- The query is matched literally: % and _ typed by a person are not wildcards.
           replace(replace(replace(nullif(lower(btrim(p_query)), ''), '\', '\\'), '%', '\%'), '_', '\_') as pat
  )
  select
    r.id,
    st_distance(r.location, o.g) as distance_meters,
    case
      when o.q is null then 0
      when lower(coalesce(b.name, r.name)) like o.pat || '%' then 3
      when lower(r.name) like '%' || o.pat || '%' or lower(coalesce(b.name, '')) like '%' || o.pat || '%' then 2
      else 1
    end as relevance
  from public.restaurants r
  left join public.brands b on b.id = r.brand_id
  cross join origin o
  where r.is_listed
    and st_dwithin(r.location, o.g, p_radius_meters)
    and (p_classification is null or r.halal_classification::text = any (p_classification))
    and (
      p_cuisine_ids is null
      or exists (select 1 from public.restaurant_cuisines rc where rc.restaurant_id = r.id and rc.cuisine_id = any (p_cuisine_ids))
    )
    and (
      o.q is null
      or lower(r.name) like '%' || o.pat || '%'
      or lower(coalesce(b.name, '')) like '%' || o.pat || '%'
      or lower(coalesce(r.branch_label, '')) like '%' || o.pat || '%'
      or lower(coalesce(r.cuisine_label, '')) like '%' || o.pat || '%'
      or exists (
        select 1 from public.restaurant_cuisines rc
        join public.cuisines c on c.id = rc.cuisine_id
        where rc.restaurant_id = r.id and lower(c.name) like '%' || o.pat || '%'
      )
    );
$$;

-- Internal: it applies no entitlement, so only the definer functions below call it.
revoke execute on function public.search_candidates(double precision, double precision, int, text[], int[], text)
  from public, anon, authenticated;

drop function if exists public.search_restaurants(double precision, double precision, int, text, text[], int[], text);

create or replace function public.search_restaurants(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int,
  p_mode text default 'current_location',
  p_classification text[] default null,
  p_cuisine_ids int[] default null,
  p_query text default null,
  p_limit int default 500,
  p_offset int default 0,
  p_sort text default 'distance'
)
returns table (
  id uuid, name text, slug text, address text,
  lat double precision, lng double precision,
  halal_classification text, distance_meters double precision,
  primary_photo_path text, cuisines text[],
  effective_radius_meters int, is_yep_plus boolean,
  brand_name text, branch_label text,
  halal_evidence_strength text, halal_summary text, cuisine_label text,
  opening_hours jsonb,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_yep_plus boolean := public.is_current_user_yep_plus();
  v_max int;
  v_radius int;
begin
  -- The entitlement, unchanged: 50 miles with Yep+, otherwise one mile from
  -- your own location or half a mile from a searched place.
  v_max := case
    when v_is_yep_plus then 80467
    when p_mode = 'current_location' then 1609
    else 805
  end;
  v_radius := least(coalesce(p_radius_meters, v_max), v_max);

  return query
  select
    r.id, r.name, r.slug, r.address,
    st_y(r.location::geometry), st_x(r.location::geometry),
    r.halal_classification::text,
    c.distance_meters,
    (select rp.storage_path from public.restaurant_photos rp
      where rp.restaurant_id = r.id and rp.is_primary limit 1),
    (select array_agg(cu.name order by cu.name) from public.restaurant_cuisines rc
      join public.cuisines cu on cu.id = rc.cuisine_id where rc.restaurant_id = r.id),
    v_radius, v_is_yep_plus,
    b.name, r.branch_label,
    r.halal_evidence_strength::text, r.halal_summary, r.cuisine_label,
    -- Hours travel with each result so a card can say "Open now" without a
    -- request per card. Only reliably sourced hours are ever stored.
    (select jsonb_agg(jsonb_build_object('day_of_week', oh.day_of_week, 'open_time', oh.open_time, 'close_time', oh.close_time, 'is_closed', oh.is_closed))
      from public.opening_hours oh where oh.restaurant_id = r.id),
    count(*) over ()
  from public.search_candidates(p_lat, p_lng, v_radius, p_classification, p_cuisine_ids, p_query) c
  join public.restaurants r on r.id = c.id
  left join public.brands b on b.id = r.brand_id
  order by
    -- A named search puts the name matches first; otherwise nearest first.
    -- "evidence" is an explicit choice the user makes, never a hidden weight.
    case when p_query is not null and btrim(p_query) <> '' then -c.relevance else 0 end,
    case when p_sort = 'evidence' then
      case r.halal_evidence_strength when 'strong' then 0 when 'moderate' then 1 else 2 end
    else 0 end,
    c.distance_meters asc,
    r.id
  limit greatest(least(coalesce(p_limit, 500), 1000), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.search_restaurants(double precision, double precision, int, text, text[], int[], text, int, int, text)
  to anon, authenticated;

/**
 * How many places the same search finds at each radius. Counts only, no
 * places, so it can be answered for radii the caller cannot open: that is what
 * lets the page say "Unlock 24 more within 2 miles" truthfully.
 */
create or replace function public.search_radius_counts(
  p_lat double precision,
  p_lng double precision,
  p_radii int[],
  p_classification text[] default null,
  p_cuisine_ids int[] default null,
  p_query text default null
)
returns table (radius_meters int, places bigint)
language sql
stable
security definer
set search_path = public
as $$
  -- One call per radius rather than filtering one wide result by distance, so
  -- each count is produced by exactly the radius test the search itself uses.
  select t.r, (
    select count(*)
    from public.search_candidates(p_lat, p_lng, t.r, p_classification, p_cuisine_ids, p_query)
  )
  from unnest(p_radii) as t(r)
  order by t.r;
$$;

grant execute on function public.search_radius_counts(double precision, double precision, int[], text[], int[], text)
  to anon, authenticated;

-- ============================================================================
-- The same definition everywhere else a place is counted or suggested
-- ============================================================================

-- Suggestions offer listed places only: a place we would not show in search is
-- not one to suggest either.
create or replace function public.suggest_restaurants(
  p_query text,
  p_limit int default 6
)
returns table (
  id uuid, name text, slug text, brand_name text, branch_label text, address text,
  postcode text, halal_classification text, cuisines text[], lat double precision,
  lng double precision, brand_branch_count int, score real
)
language sql
stable
set search_path = public
as $$
  with q as (
    select
      nullif(lower(btrim(p_query)), '') as t,
      replace(replace(replace(nullif(lower(btrim(p_query)), ''), '\', '\\'), '%', '\%'), '_', '\_') as pat
  ),
  brand_counts as (
    select r.brand_id, count(*)::int as n
    from public.restaurants r
    where r.brand_id is not null and r.is_listed
    group by r.brand_id
  ),
  matched as (
    select
      r.id, r.name, r.slug, b.name as brand_name, r.branch_label, r.address, r.postcode,
      r.halal_classification::text as hc,
      st_y(r.location::geometry) as lat, st_x(r.location::geometry) as lng,
      r.brand_id, coalesce(bc.n, 1) as brand_branch_count,
      greatest(
        case
          when lower(coalesce(b.name, r.name)) like q.pat || '%' then 1.00
          when lower(r.name) like q.pat || '%' then 0.97
          when lower(r.name) like '% ' || q.pat || '%' then 0.90
          when lower(coalesce(b.name, '')) like '% ' || q.pat || '%' then 0.90
          when lower(r.name) like '%' || q.pat || '%' then 0.72
          when lower(coalesce(b.name, '')) like '%' || q.pat || '%' then 0.72
          else 0
        end,
        similarity(lower(r.name), q.t),
        similarity(lower(coalesce(b.name, '')), q.t)
      )::real as score
    from public.restaurants r
    cross join q
    left join public.brands b on b.id = r.brand_id
    left join brand_counts bc on bc.brand_id = r.brand_id
    where q.t is not null
      and r.is_listed
      and (
        lower(r.name) like '%' || q.pat || '%'
        or lower(coalesce(b.name, '')) like '%' || q.pat || '%'
        or similarity(lower(r.name), q.t) > 0.3
        or similarity(lower(coalesce(b.name, '')), q.t) > 0.3
        or lower(coalesce(r.cuisine_label, '')) like q.pat || '%'
        or exists (
          select 1 from public.restaurant_cuisines rc
          join public.cuisines c on c.id = rc.cuisine_id
          where rc.restaurant_id = r.id and lower(c.name) like q.pat || '%'
        )
      )
  ),
  ranked as (
    select m.*, row_number() over (
      partition by coalesce(m.brand_id::text, m.id::text) order by m.score desc, length(m.name)
    ) as branch_rank
    from matched m
  )
  select
    rk.id, rk.name, rk.slug, rk.brand_name, rk.branch_label, rk.address, rk.postcode, rk.hc,
    (select array_agg(c.name order by c.name) from public.restaurant_cuisines rc
      join public.cuisines c on c.id = rc.cuisine_id where rc.restaurant_id = rk.id),
    rk.lat, rk.lng, rk.brand_branch_count, rk.score
  from ranked rk
  where rk.branch_rank <= 2
  order by rk.score desc, rk.brand_branch_count desc, length(rk.name)
  limit greatest(coalesce(p_limit, 6), 1);
$$;

grant execute on function public.suggest_restaurants(text, int) to anon, authenticated;

-- Nearby areas for an empty search. The promised count is produced by
-- search_candidates() at the destination radius, the same call the search on
-- arrival makes, so "9 places" is exactly what the visitor then sees.
create or replace function public.nearby_listing_areas(
  p_lat double precision,
  p_lng double precision,
  p_exclude_radius_meters int,
  p_destination_radius_meters int default 805,
  p_limit int default 3
)
returns table (outcode text, lat double precision, lng double precision, distance_meters int, places int)
language sql
stable
security definer
set search_path = public
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  ),
  candidates as (
    select r.location, upper(regexp_replace(r.postcode, '\s', '', 'g')) as pc, st_distance(r.location, o.g) as d
    from public.restaurants r, origin o
    where r.is_listed
      and r.postcode is not null
      and not st_dwithin(r.location, o.g, p_exclude_radius_meters)
      and st_dwithin(r.location, o.g, 8047)
  ),
  by_district as (
    select left(pc, length(pc) - 3) as outcode, min(d) as nearest,
           st_centroid(st_collect(location::geometry))::geography as anchor
    from candidates
    where length(pc) between 5 and 7
    group by 1
  ),
  counted as (
    select b.outcode, b.nearest, b.anchor,
      (select count(*)::int from public.search_candidates(
         st_y(b.anchor::geometry), st_x(b.anchor::geometry), p_destination_radius_meters, null, null, null)) as places
    from by_district b
  )
  select c.outcode, st_y(c.anchor::geometry), st_x(c.anchor::geometry),
         round(st_distance(c.anchor, o.g))::int, c.places
  from counted c, origin o
  where c.places > 0
  order by c.nearest
  limit greatest(coalesce(p_limit, 3), 1);
$$;

grant execute on function public.nearby_listing_areas(double precision, double precision, int, int, int) to anon, authenticated;
