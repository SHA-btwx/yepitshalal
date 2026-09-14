-- Likely existing listings for a submitted restaurant.
--
-- Used by the submit route, before anything is stored, so a submission for a
-- place we already list is recognised at the door rather than creating a second
-- copy of it. Matches on name similarity near the same point, or on the same
-- postcode with a looser name match. Branches of a chain elsewhere in London are
-- deliberately not returned: a Morley's in Croydon is not a duplicate of a new
-- Morley's in Peckham.
--
-- Server only. It reveals nothing a restaurant page does not, but there is no
-- reason for a browser to call it.

create or replace function public.similar_restaurants(
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_postcode text default null
)
returns table (
  id uuid,
  name text,
  slug text,
  address text,
  postcode text,
  is_listed boolean,
  distance_meters int,
  similarity real
)
language sql
stable
set search_path = public
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g,
           lower(btrim(p_name)) as q,
           upper(regexp_replace(coalesce(p_postcode, ''), '\s', '', 'g')) as pc
  )
  select
    r.id, r.name, r.slug, r.address, r.postcode, r.is_listed,
    round(st_distance(r.location, o.g))::int,
    greatest(similarity(lower(r.name), o.q), similarity(lower(coalesce(b.name, '')), o.q))::real
  from public.restaurants r
  left join public.brands b on b.id = r.brand_id
  cross join origin o
  where r.merged_into is null
    and r.catalogue_status <> 'permanently_closed'
    and (
      (st_dwithin(r.location, o.g, 250)
        and greatest(similarity(lower(r.name), o.q), similarity(lower(coalesce(b.name, '')), o.q)) >= 0.35)
      or (o.pc <> '' and upper(regexp_replace(coalesce(r.postcode, ''), '\s', '', 'g')) = o.pc
        and greatest(similarity(lower(r.name), o.q), similarity(lower(coalesce(b.name, '')), o.q)) >= 0.2)
    )
  order by 8 desc, 7 asc
  limit 5;
$$;

revoke execute on function public.similar_restaurants(text, double precision, double precision, text)
  from public, anon, authenticated;
