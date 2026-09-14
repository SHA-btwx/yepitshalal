-- Search can include places nobody has checked yet.
--
-- Every function keeps its old behaviour unless the caller passes
-- p_include_candidates = true, so the deployed site is unaffected until the
-- code that shows "Not checked yet" ships. Each result carries halal_status:
-- fully_halal, halal_options, unverified, or unknown for a place with no
-- evidence at all. halal_classification is unchanged for older callers.

drop function if exists public.search_restaurants(double precision, double precision, int, text, text[], int[], text, int, int, text);
drop function if exists public.search_radius_counts(double precision, double precision, int[], text[], int[], text);
drop function if exists public.nearby_listing_areas(double precision, double precision, int, int, int);
drop function if exists public.suggest_restaurants(text, int);
drop function if exists public.listing_boroughs();
drop function if exists public.borough_listings(text);
drop function if exists public.search_candidates(double precision, double precision, int, text[], int[], text);

create function public.search_candidates(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int,
  p_classification text[] default null,
  p_cuisine_ids int[] default null,
  p_query text default null,
  p_include_candidates boolean default false
)
returns table (id uuid, distance_meters double precision, relevance int, halal_status text)
language sql
stable
set search_path = public
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g,
           nullif(lower(btrim(p_query)), '') as q,
           replace(replace(replace(nullif(lower(btrim(p_query)), ''), '\', '\\'), '%', '\%'), '_', '\_') as pat
  ),
  places as (
    select r.*,
      case when r.halal_evidence_strength is null then 'unknown' else r.halal_classification::text end as status
    from public.restaurants r
    where case when p_include_candidates then r.is_searchable else r.is_listed end
  )
  select
    r.id,
    st_distance(r.location, o.g) as distance_meters,
    case
      when o.q is null then 0
      when lower(coalesce(b.name, r.name)) like o.pat || '%' then 3
      when lower(r.name) like '%' || o.pat || '%' or lower(coalesce(b.name, '')) like '%' || o.pat || '%' then 2
      else 1
    end as relevance,
    r.status
  from places r
  left join public.brands b on b.id = r.brand_id
  cross join origin o
  where st_dwithin(r.location, o.g, p_radius_meters)
    and (p_classification is null or r.status = any (p_classification))
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

revoke execute on function public.search_candidates(double precision, double precision, int, text[], int[], text, boolean)
  from public, anon, authenticated;

create function public.search_restaurants(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int,
  p_mode text default 'current_location',
  p_classification text[] default null,
  p_cuisine_ids int[] default null,
  p_query text default null,
  p_limit int default 500,
  p_offset int default 0,
  p_sort text default 'distance',
  p_include_candidates boolean default false
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
  total_count bigint,
  halal_status text,
  postcode text
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
    (select jsonb_agg(jsonb_build_object('day_of_week', oh.day_of_week, 'open_time', oh.open_time, 'close_time', oh.close_time, 'is_closed', oh.is_closed))
      from public.opening_hours oh where oh.restaurant_id = r.id),
    count(*) over (),
    c.halal_status,
    r.postcode
  from public.search_candidates(p_lat, p_lng, v_radius, p_classification, p_cuisine_ids, p_query, p_include_candidates) c
  join public.restaurants r on r.id = c.id
  left join public.brands b on b.id = r.brand_id
  order by
    -- A named search puts name matches first.
    case when p_query is not null and btrim(p_query) <> '' then -c.relevance else 0 end,
    -- "evidence": the strongest label first, places not checked last, then nearest.
    case when p_sort = 'evidence' then
      case c.halal_status when 'fully_halal' then 0 when 'halal_options' then 1 when 'unverified' then 2 else 3 end
    else 0 end,
    c.distance_meters asc,
    r.id
  limit greatest(least(coalesce(p_limit, 500), 1000), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.search_restaurants(double precision, double precision, int, text, text[], int[], text, int, int, text, boolean)
  to anon, authenticated;

-- How many places the same search finds at each radius, and how many of those
-- have halal evidence, so "Unlock 40 more places, 12 with halal evidence" is
-- true on both counts.
create function public.search_radius_counts(
  p_lat double precision,
  p_lng double precision,
  p_radii int[],
  p_classification text[] default null,
  p_cuisine_ids int[] default null,
  p_query text default null,
  p_include_candidates boolean default false
)
returns table (radius_meters int, places bigint, with_evidence bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.r, x.places, x.with_evidence
  from unnest(p_radii) as t(r)
  cross join lateral (
    select count(*) as places, count(*) filter (where c.halal_status <> 'unknown') as with_evidence
    from public.search_candidates(p_lat, p_lng, t.r, p_classification, p_cuisine_ids, p_query, p_include_candidates) c
  ) x
  order by t.r;
$$;

grant execute on function public.search_radius_counts(double precision, double precision, int[], text[], int[], text, boolean)
  to anon, authenticated;

create function public.suggest_restaurants(
  p_query text,
  p_limit int default 6,
  p_include_candidates boolean default false
)
returns table (
  id uuid, name text, slug text, brand_name text, branch_label text, address text,
  postcode text, halal_classification text, cuisines text[], lat double precision,
  lng double precision, brand_branch_count int, score real, halal_status text
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
  pool as (
    select r.* from public.restaurants r
    where case when p_include_candidates then r.is_searchable else r.is_listed end
  ),
  brand_counts as (
    select r.brand_id, count(*)::int as n
    from pool r
    where r.brand_id is not null
    group by r.brand_id
  ),
  matched as (
    select
      r.id, r.name, r.slug, b.name as brand_name, r.branch_label, r.address, r.postcode,
      r.halal_classification::text as hc,
      case when r.halal_evidence_strength is null then 'unknown' else r.halal_classification::text end as status,
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
    from pool r
    cross join q
    left join public.brands b on b.id = r.brand_id
    left join brand_counts bc on bc.brand_id = r.brand_id
    where q.t is not null
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
    rk.lat, rk.lng, rk.brand_branch_count, rk.score, rk.status
  from ranked rk
  where rk.branch_rank <= 2
  -- Equal matches: places with evidence before places not checked.
  order by rk.score desc, (rk.status = 'unknown'), rk.brand_branch_count desc, length(rk.name)
  limit greatest(coalesce(p_limit, 6), 1);
$$;

grant execute on function public.suggest_restaurants(text, int, boolean) to anon, authenticated;

create function public.nearby_listing_areas(
  p_lat double precision,
  p_lng double precision,
  p_exclude_radius_meters int,
  p_destination_radius_meters int default 805,
  p_limit int default 3,
  p_include_candidates boolean default false
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
    where case when p_include_candidates then r.is_searchable else r.is_listed end
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
         st_y(b.anchor::geometry), st_x(b.anchor::geometry), p_destination_radius_meters, null, null, null, p_include_candidates)) as places
    from by_district b
  )
  select c.outcode, st_y(c.anchor::geometry), st_x(c.anchor::geometry),
         round(st_distance(c.anchor, o.g))::int, c.places
  from counted c, origin o
  where c.places > 0
  order by c.nearest
  limit greatest(coalesce(p_limit, 3), 1);
$$;

grant execute on function public.nearby_listing_areas(double precision, double precision, int, int, int, boolean) to anon, authenticated;

create function public.listing_boroughs()
returns table (
  borough text,
  listed int,
  fully_halal int,
  halal_options int,
  unverified int,
  anchor_lat double precision,
  anchor_lng double precision,
  last_checked_at timestamptz,
  not_checked int
)
language sql
stable
set search_path = public
as $$
  with listed as (
    select r.id, r.borough, r.location, r.halal_classification, r.halal_checked_at
    from public.restaurants r
    where r.is_listed and r.borough is not null
  ),
  density as (
    select l.borough, l.location,
      (select count(*) from public.restaurants r2
        where r2.is_listed and st_dwithin(r2.location, l.location, 805)) as n
    from listed l
  ),
  anchor as (
    select distinct on (d.borough) d.borough, d.location
    from density d
    order by d.borough, d.n desc
  ),
  unchecked as (
    select r.borough, count(*)::int as n
    from public.restaurants r
    where r.is_searchable and r.halal_evidence_strength is null and r.borough is not null
    group by r.borough
  )
  select
    l.borough,
    count(*)::int,
    count(*) filter (where l.halal_classification = 'fully_halal')::int,
    count(*) filter (where l.halal_classification = 'halal_options')::int,
    count(*) filter (where l.halal_classification = 'unverified')::int,
    st_y(a.location::geometry),
    st_x(a.location::geometry),
    max(l.halal_checked_at),
    coalesce(max(u.n), 0)
  from listed l
  join anchor a on a.borough = l.borough
  left join unchecked u on u.borough = l.borough
  group by l.borough, a.location
  order by l.borough;
$$;

grant execute on function public.listing_boroughs() to anon, authenticated;

create function public.borough_listings(p_borough text, p_include_candidates boolean default false)
returns table (
  id uuid, name text, slug text, address text, postcode text,
  halal_classification text, halal_evidence_strength text, halal_summary text,
  halal_checked_at timestamptz, cuisine_label text, brand_name text, branch_label text,
  lat double precision, lng double precision, halal_status text
)
language sql
stable
set search_path = public
as $$
  select
    r.id, r.name, r.slug, r.address, r.postcode,
    r.halal_classification::text, r.halal_evidence_strength::text, r.halal_summary,
    r.halal_checked_at, r.cuisine_label, b.name, r.branch_label,
    st_y(r.location::geometry), st_x(r.location::geometry),
    case when r.halal_evidence_strength is null then 'unknown' else r.halal_classification::text end
  from public.restaurants r
  left join public.brands b on b.id = r.brand_id
  where r.borough = p_borough
    and case when p_include_candidates then r.is_searchable else r.is_listed end
  order by
    case when r.halal_evidence_strength is null then 3
      when r.halal_classification = 'fully_halal' then 0 when r.halal_classification = 'halal_options' then 1 else 2 end,
    case r.halal_evidence_strength when 'strong' then 0 when 'moderate' then 1 else 2 end,
    lower(coalesce(b.name, r.name));
$$;

grant execute on function public.borough_listings(text, boolean) to anon, authenticated;

-- Admin coverage counts places not checked yet as well.
drop view if exists public.catalogue_borough_coverage;
create view public.catalogue_borough_coverage as
select
  coalesce(borough, 'Unknown') as borough,
  count(*) filter (where merged_into is null) as total,
  count(*) filter (where is_listed) as listed,
  count(*) filter (where is_listed and halal_classification = 'fully_halal') as fully_halal,
  count(*) filter (where is_listed and halal_classification = 'halal_options') as halal_options,
  count(*) filter (where is_listed and halal_classification = 'unverified') as unverified,
  count(*) filter (where is_searchable and halal_evidence_strength is null) as not_checked,
  count(*) filter (where merged_into is null and not is_searchable and catalogue_status = 'active') as no_evidence
from public.restaurants
group by 1;
revoke all on public.catalogue_borough_coverage from anon, authenticated;

drop view if exists public.catalogue_coverage;
create view public.catalogue_coverage as
select
  coalesce(nullif(upper(regexp_replace(split_part(trim(postcode), ' ', 1), '[0-9].*$', '')), ''), '??') as district,
  coalesce(nullif(upper(split_part(trim(postcode), ' ', 1)), ''), '??') as outward,
  count(*) filter (where merged_into is null) as total,
  count(*) filter (where is_listed) as listed,
  count(*) filter (where is_listed and halal_classification = 'fully_halal') as fully_halal,
  count(*) filter (where is_listed and halal_classification = 'halal_options') as halal_options,
  count(*) filter (where is_listed and halal_classification = 'unverified') as unverified,
  count(*) filter (where is_searchable and halal_evidence_strength is null) as not_checked,
  count(*) filter (where merged_into is null and not is_searchable and catalogue_status = 'active') as no_evidence,
  count(*) filter (where merged_into is null and catalogue_status = 'needs_review') as needs_review,
  count(*) filter (where merged_into is null and catalogue_status = 'permanently_closed') as closed,
  count(*) filter (where is_listed and brand_id is not null) as chain_branches
from public.restaurants
group by 1, 2;
revoke all on public.catalogue_coverage from anon, authenticated;
