-- Search suggestions: find a restaurant by name from anywhere in London.
--
-- search_restaurants() cannot answer this. It is anchored to a point and a
-- radius, so it can only ever find what is already nearby, whereas someone
-- typing "Nando" wants that restaurant wherever it is. This is a separate,
-- unanchored lookup that feeds the autocomplete; it returns nothing that is not
-- already public on a restaurant page, and it never widens the radius a search
-- is allowed to cover, so entitlements are untouched.

-- Trigram matching is what lets "shwarma", "kebap" and "lahori" find the right
-- row when the user's spelling and ours differ.
create extension if not exists pg_trgm;

create index if not exists restaurants_name_trgm_idx
  on public.restaurants using gin (name gin_trgm_ops);
create index if not exists brands_name_trgm_idx
  on public.brands using gin (name gin_trgm_ops);

create or replace function public.suggest_restaurants(
  p_query text,
  p_limit int default 6
)
returns table (
  id uuid,
  name text,
  slug text,
  brand_name text,
  branch_label text,
  address text,
  postcode text,
  halal_classification text,
  cuisines text[],
  lat double precision,
  lng double precision,
  brand_branch_count int,
  score real
)
language sql
stable
set search_path = public
as $$
  with q as (
    select
      nullif(lower(btrim(p_query)), '') as t,
      -- LIKE metacharacters in user input would otherwise turn a search for
      -- "100%" or "fish_bar" into a wildcard.
      replace(replace(replace(nullif(lower(btrim(p_query)), ''), '\', '\\'), '%', '\%'), '_', '\_') as pat
  ),
  -- Counted once here rather than per row: "Morley's" has 30 branches and the
  -- UI needs to say so instead of listing thirty identical-looking lines.
  brand_counts as (
    select r.brand_id, count(*)::int as n
    from public.restaurants r
    where r.brand_id is not null
      and r.merged_into is null
      and r.catalogue_status <> 'permanently_closed'
    group by r.brand_id
  ),
  matched as (
    select
      r.id, r.name, r.slug,
      b.name as brand_name, r.branch_label, r.address, r.postcode,
      r.halal_classification::text as hc,
      st_y(r.location::geometry) as lat,
      st_x(r.location::geometry) as lng,
      r.brand_id,
      coalesce(bc.n, 1) as brand_branch_count,
      greatest(
        case
          -- Typing the start of the name is the commonest intent, so it outranks
          -- a match buried mid-string ("Nando" should beat "Fernando's").
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
      and r.merged_into is null
      and r.catalogue_status <> 'permanently_closed'
      and (
        lower(r.name) like '%' || q.pat || '%'
        or lower(coalesce(b.name, '')) like '%' || q.pat || '%'
        or similarity(lower(r.name), q.t) > 0.3
        or similarity(lower(coalesce(b.name, '')), q.t) > 0.3
        or exists (
          select 1 from public.restaurant_cuisines rc
          join public.cuisines c on c.id = rc.cuisine_id
          where rc.restaurant_id = r.id and lower(c.name) like q.pat || '%'
        )
      )
  ),
  ranked as (
    select m.*,
      row_number() over (
        partition by coalesce(m.brand_id::text, m.id::text)
        order by m.score desc, length(m.name)
      ) as branch_rank
    from matched m
  )
  select
    rk.id, rk.name, rk.slug, rk.brand_name, rk.branch_label,
    rk.address, rk.postcode, rk.hc,
    (
      select array_agg(c.name order by c.name)
      from public.restaurant_cuisines rc
      join public.cuisines c on c.id = rc.cuisine_id
      where rc.restaurant_id = rk.id
    ),
    rk.lat, rk.lng, rk.brand_branch_count, rk.score
  from ranked rk
  -- At most two branches of one chain, so a 30-branch name cannot crowd out
  -- every independent restaurant that also matched.
  where rk.branch_rank <= 2
  order by rk.score desc, rk.brand_branch_count desc, length(rk.name)
  limit greatest(coalesce(p_limit, 6), 1);
$$;

grant execute on function public.suggest_restaurants(text, int) to anon, authenticated;
