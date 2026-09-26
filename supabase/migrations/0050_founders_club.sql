-- 0050_founders_club
--
-- The YepItsHalal 100 Founders Club. The first 100 London food businesses to
-- claim a spot on /founders become Founders, for life. Shabir hands the link
-- out in person (an NFC tap at the London Halal Food Festival, or a private
-- link), so the count on that page is a promise to people he has met, and it
-- has to be true.
--
-- What matters here:
--
-- * The cap is enforced by the table, not by the page. A Founder holds a
--   number from 1 to 100 (a CHECK), no two live Founders can hold the same
--   number (a partial UNIQUE index), and a Founder must hold one (a second
--   CHECK). So there can never be a 101st Founder, whoever writes to this
--   table and however many write at once.
-- * Allocation happens in one function, claim_founder_spot(), under a
--   transaction-scoped advisory lock: look for a duplicate, count, pick the
--   lowest free number, insert, commit, and only then can the next claim
--   look. Two restaurants pressing the button in the same instant cannot both
--   take spot 100. The constraints above are the backstop if anything ever
--   writes here without the function.
-- * Once the 100 are taken nobody is turned away. The application is stored
--   as a standard free listing request, and the answer says which it is.
-- * The same business sending the form twice gets its first answer back, not
--   a second spot. "The same business" is the same name at the same postcode
--   (or the same typed location when there is no postcode), worked out by the
--   route into dedupe_key. Two branches of one brand are two businesses, and
--   two different places with similar names are too.
-- * Rejecting an application (spam, a test, not a food business) releases its
--   spot, and the next Founder takes the lowest free number, so the numbers
--   always stay within 1 to 100.
-- * Founder status is a column on a row. Nothing about it lives in a browser.
-- * Nothing here touches halal labels. Being a Founder buys no label, the
--   same rule restaurant_partnerships follows (0017).
-- * A Founder whose application is linked to a listing gets three published
--   reels, enforced by the same trigger as every other allowance (0017).

-- ============================================================================
-- Applications
-- ============================================================================

create type founder_tier as enum ('founder', 'standard');

-- pending   sent in, not yet looked at
-- approved  Shabir has checked it is a real food business
-- rejected  spam, a test, or not a food business. Releases a Founder spot.
create type founder_application_status as enum ('pending', 'approved', 'rejected');

create table public.founder_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  tier founder_tier not null,
  founder_number int,
  status founder_application_status not null default 'pending',

  -- The four questions on /founders, as the person typed them.
  business_name text not null check (char_length(business_name) between 2 and 120),
  location text not null check (char_length(location) between 2 and 120),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact text not null check (char_length(contact) between 2 and 100),

  -- Worked out from those answers by the route.
  postcode text,
  borough text,
  lat double precision,
  lng double precision,
  instagram text,
  phone text,
  dedupe_key text not null check (char_length(dedupe_key) between 3 and 300),

  -- One id per form on the page, so a request the network sends twice is
  -- answered from the first.
  client_token uuid,
  -- How they arrived: nfc, qr, link. From ?src= on the page, if present.
  source text check (source is null or source ~ '^[a-z0-9_-]{1,40}$'),
  -- Salted hash of the address the form came from, for the hourly limit.
  ip_hash text,

  -- The listing this became, once there is one.
  restaurant_id uuid references public.restaurants(id) on delete set null,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 500),

  -- The cap, written into the table itself.
  constraint founder_number_within_the_hundred check (founder_number between 1 and 100),
  constraint founder_holds_a_number check ((tier = 'founder') = (founder_number is not null))
);

comment on table public.founder_applications is
  'The 100 Founders Club (/founders). tier is what the application was given when it arrived; the live Founder count is tier = founder and status <> rejected.';

-- No two live Founders share a number. With the CHECK above, at most 100.
create unique index founder_applications_live_number
  on public.founder_applications (founder_number)
  where tier = 'founder' and status <> 'rejected';

-- One live application per business.
create unique index founder_applications_live_business
  on public.founder_applications (dedupe_key)
  where status <> 'rejected';

create unique index founder_applications_client_token
  on public.founder_applications (client_token)
  where client_token is not null and status <> 'rejected';

create index founder_applications_created_idx on public.founder_applications (created_at desc);
create index founder_applications_ip_idx on public.founder_applications (ip_hash, created_at desc);
create index founder_applications_restaurant_idx
  on public.founder_applications (restaurant_id)
  where restaurant_id is not null;

create trigger founder_applications_touch_updated_at
  before update on public.founder_applications
  for each row execute function public.touch_updated_at();

-- Server only. /api/founders and /admin/founders use the service role; the
-- browser never reads or writes this table, and there are no policies.
alter table public.founder_applications enable row level security;
revoke all on public.founder_applications from anon, authenticated;

-- ============================================================================
-- Claiming a spot
-- ============================================================================

/**
 * Store one application and decide, atomically, what it gets.
 *
 *   founder       a spot was free: it holds founder_number from now on
 *   standard      all 100 were taken: stored as a free listing request
 *   duplicate     this business (or this very form) is already here: the
 *                 earlier application is returned and nothing new is stored
 *   rate_limited  too many from one address in the last hour: nothing stored
 *
 * claimed is the live Founder count after this call, cap is 100.
 * business_name and contact_via are the stored application's, so a duplicate
 * is answered with what was actually kept, not with what was just typed.
 */
create or replace function public.claim_founder_spot(
  p_business_name text,
  p_location text,
  p_contact_name text,
  p_contact text,
  p_dedupe_key text,
  p_postcode text default null,
  p_borough text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_instagram text default null,
  p_phone text default null,
  p_client_token uuid default null,
  p_source text default null,
  p_ip_hash text default null,
  p_max_per_hour int default 40
)
returns table (
  outcome text,
  application_id uuid,
  tier text,
  founder_number int,
  claimed int,
  cap int,
  business_name text,
  contact_via text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cap constant int := 100;
  v_prior_id uuid;
  v_prior_tier founder_tier;
  v_prior_number int;
  v_prior_name text;
  v_prior_via text;
  v_claimed int;
  v_recent int;
  v_number int;
  v_id uuid;
begin
  -- One claim at a time, across every connection. Released when this
  -- transaction ends, so the next claim counts after this one is stored.
  perform pg_advisory_xact_lock(hashtext('public.claim_founder_spot'));

  select a.id, a.tier, a.founder_number, a.business_name,
         case when a.instagram is not null then 'instagram' else 'phone' end
    into v_prior_id, v_prior_tier, v_prior_number, v_prior_name, v_prior_via
  from public.founder_applications a
  where a.status <> 'rejected'
    and (a.dedupe_key = p_dedupe_key
         or (p_client_token is not null and a.client_token = p_client_token))
  order by a.created_at
  limit 1;

  select count(*)::int into v_claimed
  from public.founder_applications a
  where a.tier = 'founder' and a.status <> 'rejected';

  if v_prior_id is not null then
    return query select 'duplicate'::text, v_prior_id, v_prior_tier::text, v_prior_number,
      v_claimed, v_cap, v_prior_name, v_prior_via;
    return;
  end if;

  -- Forty an hour from one connection. Generous on purpose: at the festival
  -- a whole row of stalls can share the venue's Wi-Fi, and so one address.
  -- It still stops one machine filling the hundred in a few minutes, and a
  -- fake application Shabir rejects gives its spot back.
  if p_ip_hash is not null then
    select count(*)::int into v_recent
    from public.founder_applications a
    where a.ip_hash = p_ip_hash and a.created_at > now() - interval '1 hour';
    if v_recent >= p_max_per_hour then
      return query select 'rate_limited'::text, null::uuid, null::text, null::int,
        v_claimed, v_cap, null::text, null::text;
      return;
    end if;
  end if;

  -- The lowest free number, so a spot released by a rejected application is
  -- taken again and the numbers never run past 100.
  if v_claimed < v_cap then
    select n into v_number
    from generate_series(1, v_cap) as n
    where not exists (
      select 1 from public.founder_applications f
      where f.tier = 'founder' and f.status <> 'rejected' and f.founder_number = n
    )
    order by n
    limit 1;
  end if;

  insert into public.founder_applications (
    tier, founder_number,
    business_name, location, contact_name, contact,
    postcode, borough, lat, lng, instagram, phone,
    dedupe_key, client_token, source, ip_hash
  ) values (
    (case when v_number is null then 'standard' else 'founder' end)::founder_tier,
    v_number,
    p_business_name, p_location, p_contact_name, p_contact,
    p_postcode, p_borough, p_lat, p_lng, p_instagram, p_phone,
    p_dedupe_key, p_client_token, p_source, p_ip_hash
  )
  returning id into v_id;

  return query select
    (case when v_number is null then 'standard' else 'founder' end)::text,
    v_id,
    (case when v_number is null then 'standard' else 'founder' end)::text,
    v_number,
    v_claimed + (case when v_number is null then 0 else 1 end),
    v_cap,
    p_business_name,
    (case when p_instagram is not null then 'instagram' else 'phone' end)::text;
end;
$$;

revoke execute on function public.claim_founder_spot(
  text, text, text, text, text, text, text, double precision, double precision,
  text, text, uuid, text, text, int
) from public, anon, authenticated;
grant execute on function public.claim_founder_spot(
  text, text, text, text, text, text, text, double precision, double precision,
  text, text, uuid, text, text, int
) to service_role;

/** The live count the page shows: Founders not rejected, out of 100. */
create or replace function public.founder_availability()
returns table (claimed int, cap int)
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int, 100
  from public.founder_applications
  where tier = 'founder' and status <> 'rejected';
$$;

revoke execute on function public.founder_availability() from public, anon, authenticated;
grant execute on function public.founder_availability() to service_role;

-- ============================================================================
-- Who the Founders are, for the Supabase dashboard
-- ============================================================================

-- Table Editor, founders_club: the live Founders in number order. The same
-- list is at /admin/founders. Invoker rights and no grants, so it is never
-- readable through the public API.
create or replace view public.founders_club
with (security_invoker = true) as
select
  founder_number,
  business_name,
  location,
  postcode,
  borough,
  contact_name,
  contact,
  status,
  created_at,
  restaurant_id,
  id
from public.founder_applications
where tier = 'founder' and status <> 'rejected'
order by founder_number;

revoke all on public.founders_club from anon, authenticated;

-- ============================================================================
-- Three reels for life, enforced where every allowance is
-- ============================================================================

insert into public.platform_settings (key, value, description) values
  ('reel_allowance_founder', '3'::jsonb,
   'Published reels allowed for a Founders Club restaurant (0050), free for life.')
on conflict (key) do nothing;

create or replace function public.is_founder_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.founder_applications
    where restaurant_id = p_restaurant_id
      and tier = 'founder'
      and status <> 'rejected'
  );
$$;

revoke execute on function public.is_founder_restaurant(uuid) from public, anon, authenticated;
grant execute on function public.is_founder_restaurant(uuid) to service_role;

-- As in 0017, with the Founder allowance as a floor under the tier default. A
-- per-restaurant override is still a deliberate, negotiated number and still
-- wins; never set one below 3 for a Founder.
create or replace function public.restaurant_reel_allowance(p_restaurant_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select reel_allowance_override from public.restaurant_partnerships
      where restaurant_id = p_restaurant_id),
    greatest(
      case
        when public.is_active_partner(p_restaurant_id)
          then public.setting_int('reel_allowance_partner', 10)
        else public.setting_int('reel_allowance_free', 1)
      end,
      case
        when public.is_founder_restaurant(p_restaurant_id)
          then public.setting_int('reel_allowance_founder', 3)
        else 0
      end
    )
  );
$$;
