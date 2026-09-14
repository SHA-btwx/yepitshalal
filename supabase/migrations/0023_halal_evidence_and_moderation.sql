-- Halal evidence, moderated submissions, and the end of public writes.
--
-- Until now a restaurant's halal status was a single label with nothing behind
-- it. From here the label is derived from evidence records, each of which says
-- what was claimed, by whom, where it can be seen, and when it was checked.
-- A listing with no evidence at all is not shown in search: it stays in the
-- catalogue, waiting for some, but is not presented as a halal place.

-- ============================================================================
-- Evidence
-- ============================================================================

create type halal_evidence_kind as enum (
  'yepitshalal_check',      -- we checked it ourselves (visit, call, documents)
  'certification',          -- confirmed with, or on the register of, a certifier
  'first_party_statement',  -- the restaurant's own website or menu says so
  'certification_claim',    -- the restaurant says it is certified; not confirmed
  'business_name',          -- its registered or trading name includes "halal"
  'community_tag',          -- OpenStreetMap contributors tagged it halal
  'directory_category',     -- a public places dataset categorises it as halal
  'owner_submission'        -- told to us by someone who says they run it
);

create type halal_evidence_claim as enum (
  'fully_halal',      -- everything served is halal
  'halal_options',    -- some of what is served is halal, some is not
  'halal_mentioned',  -- halal food is indicated, extent unknown
  'not_halal'         -- evidence that it is not halal
);

-- Strong: certification, our own check, or the restaurant's clear statement that
-- all its meat is halal. Moderate: the restaurant's own words, less specific.
-- Weak: third parties, names and tags.
create type halal_evidence_strength as enum ('strong', 'moderate', 'weak');

create table public.restaurant_halal_evidence (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  kind halal_evidence_kind not null,
  claim halal_evidence_claim not null,
  strength halal_evidence_strength not null,
  -- Who said it, as a person would name them: "The restaurant's website",
  -- "OpenStreetMap contributors", "HMC".
  source_name text not null,
  source_url text,
  -- The words that support the claim, kept short: enough to show what was
  -- said, never a copy of the page.
  excerpt text check (excerpt is null or char_length(excerpt) <= 300),
  notes text,
  checked_at timestamptz not null,
  checked_by text not null default 'catalogue_pipeline',
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create index restaurant_halal_evidence_current_idx
  on public.restaurant_halal_evidence (restaurant_id) where is_current;

alter table public.restaurant_halal_evidence enable row level security;
create policy evidence_public_read on public.restaurant_halal_evidence
  for select using (is_current);

-- Where each listing came from, for provenance and future re-matching.
create table public.restaurant_source_links (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  source text not null check (source in ('fsa', 'overture', 'osm', 'owner_submission')),
  source_id text not null,
  source_name text,
  licence text,
  last_seen_at timestamptz not null default now(),
  primary key (source, source_id, restaurant_id)
);
create index restaurant_source_links_restaurant_idx on public.restaurant_source_links (restaurant_id);
alter table public.restaurant_source_links enable row level security;
create policy source_links_public_read on public.restaurant_source_links for select using (true);

-- ============================================================================
-- Restaurants: status derived from evidence
-- ============================================================================

alter table public.restaurants
  add column if not exists halal_evidence_strength halal_evidence_strength,
  add column if not exists halal_summary text,
  add column if not exists halal_checked_at timestamptz,
  add column if not exists socials text[],
  add column if not exists borough text,
  add column if not exists cuisine_label text;

-- Listed means: at least some evidence, operating, and not merged away. Search,
-- counts, maps, sitemaps and area pages all read this one column, so they can
-- never disagree about what is a listing.
alter table public.restaurants
  add column if not exists is_listed boolean
  generated always as (
    halal_evidence_strength is not null
    and catalogue_status = 'active'
    and merged_into is null
  ) stored;

create index if not exists restaurants_listed_location_idx
  on public.restaurants using gist (location) where is_listed;
create index if not exists restaurants_borough_idx on public.restaurants (borough) where is_listed;

/**
 * Recompute one restaurant's label from its current evidence.
 *
 *   Fully Halal    needs strong evidence that everything served is halal.
 *   Halal Options  needs strong or moderate evidence of halal alongside non-halal.
 *   Unverified     any other current evidence, however weak.
 *   Not listed     no evidence, or moderate/strong evidence that it is not halal.
 *
 * Weak evidence can never produce more than Unverified, whatever it claims.
 */
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

  -- The single most informative piece of evidence for the chosen label.
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
    case e.kind
      when 'yepitshalal_check' then 1
      when 'certification' then 2
      when 'first_party_statement' then 3
      when 'certification_claim' then 4
      when 'business_name' then 5
      when 'community_tag' then 6
      when 'directory_category' then 7
      else 8
    end,
    e.checked_at desc
  limit 1;

  -- v_best.id, not v_best: a record whose fields are all null only compares
  -- as null in some plpgsql versions.
  if v_negative or v_best.id is null then
    update restaurants
      set halal_classification = 'unverified',
          halal_evidence_strength = null,
          halal_summary = case when v_negative then 'Evidence suggests this place is not halal' else null end,
          halal_checked_at = null
    where id = p_restaurant_id;
    return;
  end if;

  v_summary := case v_best.kind
    when 'yepitshalal_check' then 'Checked by YepItsHalal'
    when 'certification' then 'Certified by ' || v_best.source_name
    when 'first_party_statement' then case v_best.claim
      when 'fully_halal' then 'The restaurant says all its meat is halal'
      when 'halal_options' then 'The restaurant says some of its food is halal'
      else 'The restaurant''s website mentions halal food'
    end
    when 'certification_claim' then 'The restaurant says it is halal certified'
    when 'business_name' then 'Its business name says halal'
    when 'community_tag' then 'Tagged halal on OpenStreetMap'
    when 'directory_category' then 'Listed as halal in public place data'
    when 'owner_submission' then 'Details from the owner, not yet checked'
  end;

  update restaurants
    set halal_classification = v_class,
        halal_evidence_strength = v_best.strength,
        halal_summary = v_summary,
        halal_checked_at = v_best.checked_at
  where id = p_restaurant_id;
end;
$$;

revoke execute on function public.refresh_halal_status(uuid) from public, anon, authenticated;

create or replace function public.trg_refresh_halal_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform refresh_halal_status(coalesce(new.restaurant_id, old.restaurant_id));
  if tg_op = 'UPDATE' and new.restaurant_id is distinct from old.restaurant_id then
    perform refresh_halal_status(old.restaurant_id);
  end if;
  return null;
end;
$$;

revoke execute on function public.trg_refresh_halal_status() from public, anon, authenticated;

create trigger restaurant_halal_evidence_refresh
  after insert or update or delete on public.restaurant_halal_evidence
  for each row execute function public.trg_refresh_halal_status();

-- ============================================================================
-- Opening hours: several periods a day, with a source
-- ============================================================================

-- Lunch and dinner service are two periods, which one row per day could not hold.
alter table public.opening_hours drop constraint if exists opening_hours_restaurant_id_day_of_week_key;
alter table public.opening_hours
  add column if not exists source text,
  add column if not exists checked_at timestamptz;
create index if not exists opening_hours_restaurant_idx on public.opening_hours (restaurant_id, day_of_week);

-- ============================================================================
-- Moderated submissions
-- ============================================================================

create type submission_status as enum ('pending', 'approved', 'rejected', 'duplicate');

create table public.restaurant_submissions (
  id uuid primary key default gen_random_uuid(),
  status submission_status not null default 'pending',
  created_at timestamptz not null default now(),

  name text not null check (char_length(name) between 2 and 120),
  address text not null check (char_length(address) between 5 and 300),
  postcode text not null,
  lat double precision not null,
  lng double precision not null,
  borough text not null,
  phone text,
  website text,
  instagram text,
  cuisine text,

  relationship text not null check (relationship in ('owner', 'staff', 'customer')),
  contact_name text,
  contact_email text,

  halal_claim halal_evidence_claim,
  all_meat_halal boolean,
  serves_pork boolean,
  serves_alcohol boolean,
  certification_body text,
  evidence_url text,
  notes text check (notes is null or char_length(notes) <= 1000),

  -- Likely existing listings, found at submission time.
  duplicate_candidates jsonb not null default '[]'::jsonb,

  ip_hash text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  review_note text,
  restaurant_id uuid references public.restaurants(id) on delete set null
);

create index restaurant_submissions_status_idx on public.restaurant_submissions (status, created_at desc);
create index restaurant_submissions_ip_idx on public.restaurant_submissions (ip_hash, created_at desc);

-- Server only: the submit route and admin actions use the service role.
alter table public.restaurant_submissions enable row level security;

-- ============================================================================
-- Public writes, closed
-- ============================================================================
-- Every legitimate write in the app goes through the service role behind a
-- server-side check (requireAdmin, requireRestaurantAccess, the submit route).
-- The browser only ever reads.

drop policy if exists restaurants_insert_any on public.restaurants;
drop policy if exists restaurants_owner_update on public.restaurants;
drop policy if exists photos_insert_any on public.restaurant_photos;
drop policy if exists rc_insert_any on public.restaurant_cuisines;
drop policy if exists claims_insert_any on public.restaurant_claims;
drop policy if exists ownership_claim_self_insert on public.restaurant_ownership_claims;

do $$
declare
  t text;
begin
  foreach t in array array[
    'restaurants', 'restaurant_photos', 'restaurant_cuisines', 'restaurant_claims',
    'restaurant_ownership_claims', 'restaurant_videos', 'restaurant_reels', 'opening_hours',
    'brands', 'cuisines', 'offers', 'restaurant_halal_facts', 'restaurant_halal_evidence',
    'restaurant_source_links', 'restaurant_submissions', 'subscriptions',
    'catalogue_dedupe_candidates', 'platform_settings', 'restaurant_partnerships',
    'verification_evidence', 'verification_history'
  ] loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end $$;

revoke all on public.restaurant_submissions from anon, authenticated;
