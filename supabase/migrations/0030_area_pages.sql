-- Area pages: one per borough, and only where there are listed places to show.
--
-- Both functions read listed places only, through the same is_listed column
-- search uses, so an area page can never show a place search would hide.

create or replace function public.listing_boroughs()
returns table (
  borough text,
  listed int,
  fully_halal int,
  halal_options int,
  unverified int,
  anchor_lat double precision,
  anchor_lng double precision,
  last_checked_at timestamptz
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
  -- Where a "search this area" link should land: the listed place with the
  -- most listed places around it, not the borough's geographic middle, which
  -- can be a park with nothing in reach.
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
  )
  select
    l.borough,
    count(*)::int,
    count(*) filter (where l.halal_classification = 'fully_halal')::int,
    count(*) filter (where l.halal_classification = 'halal_options')::int,
    count(*) filter (where l.halal_classification = 'unverified')::int,
    st_y(a.location::geometry),
    st_x(a.location::geometry),
    max(l.halal_checked_at)
  from listed l
  join anchor a on a.borough = l.borough
  group by l.borough, a.location
  order by l.borough;
$$;

grant execute on function public.listing_boroughs() to anon, authenticated;

create or replace function public.borough_listings(p_borough text)
returns table (
  id uuid, name text, slug text, address text, postcode text,
  halal_classification text, halal_evidence_strength text, halal_summary text,
  halal_checked_at timestamptz, cuisine_label text, brand_name text, branch_label text,
  lat double precision, lng double precision
)
language sql
stable
set search_path = public
as $$
  select
    r.id, r.name, r.slug, r.address, r.postcode,
    r.halal_classification::text, r.halal_evidence_strength::text, r.halal_summary,
    r.halal_checked_at, r.cuisine_label, b.name, r.branch_label,
    st_y(r.location::geometry), st_x(r.location::geometry)
  from public.restaurants r
  left join public.brands b on b.id = r.brand_id
  where r.is_listed and r.borough = p_borough
  order by
    case r.halal_classification when 'fully_halal' then 0 when 'halal_options' then 1 else 2 end,
    case r.halal_evidence_strength when 'strong' then 0 when 'moderate' then 1 else 2 end,
    lower(coalesce(b.name, r.name));
$$;

grant execute on function public.borough_listings(text) to anon, authenticated;
