-- The phone app's search: the same rows, in the same order, with the same
-- labels as search_restaurants(), built the fast way.
--
-- search_restaurants() works out each place's main photo, its cuisines and its
-- opening hours for every place in range, then keeps one page of them. Around
-- Whitechapel that is 4,364 places within 5 miles, so a page of 50 still took
-- 634 ms on 2026-09-25. This version picks the page first, from
-- search_candidates() alone, and fetches those three details for the page only.
--
-- Same arguments and same columns as search_restaurants(), so it is a drop-in
-- replacement and can be compared with it row for row. It is additive: the
-- website keeps calling search_restaurants() until the two are proved equal.
-- Security definer for the same reason as search_restaurants(): it calls
-- search_candidates(), which callers cannot run directly.
create or replace function public.app_search_v1(
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
  id uuid, name text, slug text, address text, lat double precision, lng double precision,
  halal_classification text, distance_meters double precision, primary_photo_path text,
  cuisines text[], effective_radius_meters integer, is_yep_plus boolean, brand_name text,
  branch_label text, halal_evidence_strength text, halal_summary text, cuisine_label text,
  opening_hours jsonb, total_count bigint, halal_status text, postcode text, checked_by_us boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_is_supporter boolean := public.is_current_user_yep_plus();
  v_radius int;
  v_has_query boolean := p_query is not null and btrim(p_query) <> '';
begin
  v_radius := least(coalesce(p_radius_meters, 1609), 80467);

  return query
  with page as (
    select
      c.id as place_id,
      c.distance_meters as place_distance,
      c.relevance as place_relevance,
      c.halal_status as place_status,
      count(*) over () as place_total
    from public.search_candidates(p_lat, p_lng, v_radius, p_classification, p_cuisine_ids, p_query, p_include_candidates) c
    order by
      case when v_has_query then -c.relevance else 0 end,
      case when p_sort = 'evidence' then
        case c.halal_status when 'fully_halal' then 0 when 'halal_options' then 1 when 'unverified' then 2 else 3 end
      else 0 end,
      c.distance_meters asc,
      c.id
    limit greatest(least(coalesce(p_limit, 500), 1000), 1)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    r.id, r.name, r.slug, r.address,
    st_y(r.location::geometry), st_x(r.location::geometry),
    r.halal_classification::text,
    p.place_distance,
    (select rp.storage_path from public.restaurant_photos rp
      where rp.restaurant_id = r.id and rp.is_primary limit 1),
    (select array_agg(cu.name order by cu.name) from public.restaurant_cuisines rc
      join public.cuisines cu on cu.id = rc.cuisine_id where rc.restaurant_id = r.id),
    v_radius, v_is_supporter,
    b.name, r.branch_label,
    r.halal_evidence_strength::text, r.halal_summary, r.cuisine_label,
    (select jsonb_agg(jsonb_build_object('day_of_week', oh.day_of_week, 'open_time', oh.open_time, 'close_time', oh.close_time, 'is_closed', oh.is_closed))
      from public.opening_hours oh where oh.restaurant_id = r.id),
    p.place_total,
    p.place_status,
    r.postcode,
    r.checked_by_us
  from page p
  join public.restaurants r on r.id = p.place_id
  left join public.brands b on b.id = r.brand_id
  order by
    case when v_has_query then -p.place_relevance else 0 end,
    case when p_sort = 'evidence' then
      case p.place_status when 'fully_halal' then 0 when 'halal_options' then 1 when 'unverified' then 2 else 3 end
    else 0 end,
    p.place_distance asc,
    r.id;
end;
$function$;

revoke all on function public.app_search_v1(double precision, double precision, int, text, text[], int[], text, int, int, text, boolean) from public;
grant execute on function public.app_search_v1(double precision, double precision, int, text, text[], int[], text, int, int, text, boolean) to anon, authenticated, service_role;
