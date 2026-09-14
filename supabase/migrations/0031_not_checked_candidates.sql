-- Places that might serve halal food, which nobody has checked yet.
--
-- A listing with evidence says what we know. A candidate is a place whose name
-- or listed cuisine makes it worth checking (a kebab shop, a Pakistani grill).
-- It is shown as "Not checked yet", never as halal, and it is not evidence.
-- Anything the restaurant or a mapper says is not halal is never shown.

alter table public.restaurants
  add column if not exists is_candidate boolean not null default false,
  add column if not exists has_negative_evidence boolean not null default false;

comment on column public.restaurants.is_candidate is
  'Name or cuisine suggests the place may serve halal food. Not evidence; shown as Not checked yet.';
comment on column public.restaurants.has_negative_evidence is
  'Maintained by refresh_halal_status(): current moderate or strong evidence that the place is not halal.';

-- Everything search may show: evidence-backed listings, and candidates without
-- any evidence against them.
alter table public.restaurants
  add column if not exists is_searchable boolean generated always as (
    catalogue_status = 'active'
    and merged_into is null
    and not has_negative_evidence
    and (halal_evidence_strength is not null or is_candidate)
  ) stored;

create index if not exists restaurants_searchable_location_idx
  on public.restaurants using gist (location) where is_searchable;
create index if not exists restaurants_searchable_borough_idx
  on public.restaurants using btree (borough) where is_searchable;

-- The label function now also records whether there is evidence against a place.
create or replace function public.refresh_halal_status(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class halal_classification := 'unverified';
  v_best record;
  v_negative boolean;
  v_summary text;
begin
  select exists (
    select 1 from restaurant_halal_evidence
    where restaurant_id = p_restaurant_id and is_current
      and claim = 'not_halal' and strength in ('strong', 'moderate')
  ) into v_negative;

  if exists (
    select 1 from restaurant_halal_evidence
    where restaurant_id = p_restaurant_id and is_current
      and claim = 'fully_halal' and strength = 'strong'
  ) then
    v_class := 'fully_halal';
  elsif exists (
    select 1 from restaurant_halal_evidence
    where restaurant_id = p_restaurant_id and is_current
      and claim = 'halal_options' and strength in ('strong', 'moderate')
  ) then
    v_class := 'halal_options';
  end if;

  select e.* into v_best
  from restaurant_halal_evidence e
  where e.restaurant_id = p_restaurant_id and e.is_current and e.claim <> 'not_halal'
    and (
      v_class = 'unverified'
      or (v_class = 'fully_halal' and e.claim = 'fully_halal' and e.strength = 'strong')
      or (v_class = 'halal_options' and e.claim = 'halal_options' and e.strength in ('strong', 'moderate'))
    )
  order by
    case e.strength when 'strong' then 1 when 'moderate' then 2 else 3 end,
    case e.kind::text
      when 'yepitshalal_check' then 1 when 'certification' then 2 when 'first_party_statement' then 3
      when 'certification_claim' then 4 when 'business_name' then 5 when 'community_tag' then 6
      when 'directory_category' then 7 when 'owner_submission' then 8 else 9 end,
    e.checked_at desc
  limit 1;

  if v_negative or v_best.id is null then
    update restaurants
      set halal_classification = 'unverified',
          halal_evidence_strength = null,
          halal_summary = case when v_negative then 'Evidence suggests this place is not halal' else null end,
          halal_checked_at = null,
          has_negative_evidence = v_negative
    where id = p_restaurant_id;
    return;
  end if;

  v_summary := case v_best.kind::text
    when 'yepitshalal_check' then 'Checked by YepItsHalal'
    when 'certification' then 'Certified by ' || v_best.source_name
    when 'first_party_statement' then case v_best.claim
      when 'fully_halal' then 'The restaurant says all its meat is halal'
      when 'halal_options' then 'The restaurant says some of its food is halal'
      else 'The restaurant''s website mentions halal food' end
    when 'certification_claim' then 'The restaurant says it is halal certified'
    when 'business_name' then 'Its business name says halal'
    when 'community_tag' then 'Tagged halal on OpenStreetMap'
    when 'directory_category' then 'Listed as halal in public place data'
    when 'owner_submission' then 'Details from the owner, not yet checked'
    when 'public_submission' then 'Suggested by a customer, not yet checked'
  end;

  update restaurants
    set halal_classification = v_class,
        halal_evidence_strength = v_best.strength,
        halal_summary = v_summary,
        halal_checked_at = v_best.checked_at,
        has_negative_evidence = false
  where id = p_restaurant_id;
end;
$$;

-- Bring the new flag up to date for places that already have evidence against them.
select public.refresh_halal_status(x.restaurant_id)
from (select distinct restaurant_id from public.restaurant_halal_evidence where is_current and claim = 'not_halal') x;

create or replace view public.restaurants_with_coords as
select
  id, owner_id, name, slug, description, location, address, postcode, phone, email, website_url, menu_url,
  halal_classification, data_source, source_reference_id, source_attribution_text, created_at, updated_at,
  brand_id, branch_label, catalogue_status, last_checked_at,
  st_y(location::geometry) as lat, st_x(location::geometry) as lng,
  merged_into, is_listed, halal_evidence_strength, halal_summary, halal_checked_at, socials, borough, cuisine_label,
  is_candidate, has_negative_evidence, is_searchable
from public.restaurants r;
