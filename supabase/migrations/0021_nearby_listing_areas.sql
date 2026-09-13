-- Empty results should point somewhere, not stop.
--
-- When a search finds nothing, this returns the nearest postcode districts that
-- do have listings, each with a point to search from and how many places a
-- search there will show. It suggests other searches; it does not widen this
-- one. Every suggestion is an ordinary search at the standard radius, which any
-- visitor can already run by typing that area, so no radius entitlement changes.
--
-- The count is taken at exactly the radius the destination search opens with,
-- so "14 places" is what the visitor sees on arrival, not an estimate.

create or replace function public.nearby_listing_areas(
  p_lat double precision,
  p_lng double precision,
  p_exclude_radius_meters int,
  p_destination_radius_meters int default 805,
  p_limit int default 3
)
returns table (
  outcode text,
  lat double precision,
  lng double precision,
  distance_meters int,
  places int
)
language sql
stable
set search_path = public
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  ),
  candidates as (
    select
      r.location,
      upper(regexp_replace(r.postcode, '\s', '', 'g')) as pc,
      st_distance(r.location, o.g) as d
    from public.restaurants r, origin o
    where r.merged_into is null
      and r.catalogue_status <> 'permanently_closed'
      and r.postcode is not null
      and not st_dwithin(r.location, o.g, p_exclude_radius_meters)
      -- Five miles: beyond that a suggestion stops being "nearby".
      and st_dwithin(r.location, o.g, 8047)
  ),
  by_district as (
    select
      left(pc, length(pc) - 3) as outcode,
      min(d) as nearest,
      st_centroid(st_collect(location::geometry))::geography as anchor
    from candidates
    where length(pc) between 5 and 7
    group by 1
  ),
  counted as (
    select
      b.outcode,
      b.nearest,
      b.anchor,
      (
        select count(*)::int
        from public.restaurants r2
        where r2.merged_into is null
          and r2.catalogue_status <> 'permanently_closed'
          and st_dwithin(r2.location, b.anchor, p_destination_radius_meters)
      ) as places
    from by_district b
  )
  select
    c.outcode,
    st_y(c.anchor::geometry),
    st_x(c.anchor::geometry),
    round(st_distance(c.anchor, o.g))::int,
    c.places
  from counted c, origin o
  -- A centroid can land between listings with none in reach; suggesting a
  -- search that comes back empty would be the same dead end one step later.
  where c.places > 0
  order by c.nearest
  limit greatest(coalesce(p_limit, 3), 1);
$$;

grant execute on function public.nearby_listing_areas(double precision, double precision, int, int, int)
  to anon, authenticated;
