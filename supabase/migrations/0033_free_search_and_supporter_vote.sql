-- Search is free for everyone, and supporters choose what we check next.
--
-- The radius limit is gone: knowing whether food is halal is the point of the
-- site, and charging for distance taxed the thing that makes it useful. Yep+
-- becomes a supporter tier that pays for the site rather than unlocking it.
--
-- The one thing supporters get that nobody else does is a say in the work:
-- each month they pick the area we check next, and that vote drives the
-- verification queue.

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
  v_is_supporter boolean := public.is_current_user_yep_plus();
  v_radius int;
begin
  -- Everyone can search the whole of London. 50 miles covers it, and a request
  -- with no radius opens at one mile so a search stays fast and local.
  v_radius := least(coalesce(p_radius_meters, 1609), 80467);

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
    v_radius, v_is_supporter,
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
    case when p_query is not null and btrim(p_query) <> '' then -c.relevance else 0 end,
    case when p_sort = 'evidence' then
      case c.halal_status when 'fully_halal' then 0 when 'halal_options' then 1 when 'unverified' then 2 else 3 end
    else 0 end,
    c.distance_meters asc,
    r.id
  limit greatest(least(coalesce(p_limit, 500), 1000), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- One vote per supporter per month, changeable until the month ends.
create table if not exists public.area_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  borough text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table public.area_votes enable row level security;
revoke all on public.area_votes from anon, authenticated;

create or replace function public.vote_for_area(p_borough text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sign in to vote.';
  end if;
  if not public.is_current_user_yep_plus() then
    raise exception 'Voting is for supporters.';
  end if;
  if not exists (select 1 from public.restaurants where borough = p_borough and is_searchable) then
    raise exception 'We do not cover that area.';
  end if;

  insert into public.area_votes (user_id, month, borough)
  values (v_uid, date_trunc('month', now())::date, p_borough)
  on conflict (user_id, month) do update set borough = excluded.borough, created_at = now();
end;
$$;

grant execute on function public.vote_for_area(text) to authenticated;

-- This month's standings, and whether the caller has voted for each area.
create or replace function public.area_vote_tally()
returns table (borough text, votes int, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select v.borough, count(*)::int, bool_or(v.user_id = auth.uid())
  from public.area_votes v
  where v.month = date_trunc('month', now())::date
  group by v.borough
  order by 2 desc, 1;
$$;

grant execute on function public.area_vote_tally() to anon, authenticated;
