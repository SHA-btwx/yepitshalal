-- ============================================================================
-- YepItsHalal — full schema + seed data
-- Run this ONCE in your Supabase project's SQL Editor (Dashboard → SQL Editor
-- → New query → paste this whole file → Run). It reproduces, in order, every
-- migration already applied and verified on the other project.
-- ============================================================================

-- ===== 0001_core_schema =====
create extension if not exists postgis;

create type user_role as enum ('consumer','restaurant_owner','verifier','admin');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role user_role not null default 'consumer',
  is_yep_plus boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy users_self_select on public.users for select using (id = auth.uid());
create policy users_self_update on public.users for update using (id = auth.uid());

create function public.handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.cuisines (
  id serial primary key,
  name text not null unique
);
alter table public.cuisines enable row level security;
create policy cuisines_public_read on public.cuisines for select using (true);

create type halal_classification as enum ('fully_halal','halal_options','unverified');
create type data_source_type as enum ('manual_admin','owner_submitted','fsa_import','osm_import','google_places_licensed','partner_import');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  location geography(Point, 4326) not null,
  address text not null,
  postcode text,
  phone text,
  email text,
  website_url text,
  menu_url text,
  halal_classification halal_classification not null default 'unverified',
  data_source data_source_type not null default 'manual_admin',
  source_reference_id text,
  source_attribution_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_location_idx on public.restaurants using gist (location);
alter table public.restaurants enable row level security;
create policy restaurants_public_read on public.restaurants for select using (true);
create policy restaurants_owner_update on public.restaurants for update using (owner_id = auth.uid());

create table public.restaurant_cuisines (
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  cuisine_id int references public.cuisines(id) on delete cascade,
  primary key (restaurant_id, cuisine_id)
);
alter table public.restaurant_cuisines enable row level security;
create policy rc_public_read on public.restaurant_cuisines for select using (true);

create table public.opening_hours (
  id serial primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  unique (restaurant_id, day_of_week)
);
alter table public.opening_hours enable row level security;
create policy oh_public_read on public.opening_hours for select using (true);

create type photo_type as enum ('exterior','interior','food','menu');
create table public.restaurant_photos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  storage_path text not null,
  type photo_type not null default 'food',
  is_primary boolean not null default false,
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.restaurant_photos enable row level security;
create policy photos_public_read on public.restaurant_photos for select using (true);

create type video_provider as enum ('instagram','tiktok','youtube');
create table public.restaurant_videos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  provider video_provider not null,
  embed_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
alter table public.restaurant_videos enable row level security;
create policy videos_public_read on public.restaurant_videos for select using (true);

-- ===== 0002_halal_trust =====
create type submitter_type as enum ('owner','staff','public_diner','admin');

create table public.restaurant_claims (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  submitted_by uuid references public.users(id),
  submitter_type submitter_type not null,
  submitted_at timestamptz not null default now(),
  all_meat_halal boolean,
  halal_meat_types text[],
  serves_non_halal_meat boolean,
  serves_pork boolean,
  serves_alcohol boolean,
  has_certification boolean,
  certification_body text,
  evidence_note text
);
alter table public.restaurant_claims enable row level security;

create table public.restaurant_halal_facts (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  all_meat_halal boolean,
  halal_meat_types text[],
  serves_non_halal_meat boolean,
  serves_pork boolean,
  serves_alcohol boolean,
  has_certification boolean,
  certification_body text,
  certification_expiry date,
  evidence_urls text[],
  verification_notes text,
  verified_by uuid references public.users(id),
  verified_at timestamptz,
  last_verified_at timestamptz,
  next_review_due_at timestamptz,
  last_outcome text check (last_outcome in ('verified','unable_to_verify'))
);
alter table public.restaurant_halal_facts enable row level security;
-- deliberately zero policies: no client (anon/authenticated) access at all.

create view public.restaurant_halal_facts_public as
select
  restaurant_id,
  all_meat_halal,
  halal_meat_types,
  serves_non_halal_meat,
  serves_pork,
  serves_alcohol,
  has_certification,
  certification_body,
  verified_at,
  last_verified_at,
  next_review_due_at,
  last_outcome,
  case
    when last_verified_at is null then 'never_verified'
    when last_outcome = 'unable_to_verify' then 'unable_to_verify'
    when next_review_due_at < now() - interval '90 days' then 'overdue'
    when next_review_due_at < now() then 'due'
    else 'current'
  end as verification_state
from public.restaurant_halal_facts;

grant select on public.restaurant_halal_facts_public to anon, authenticated;

-- ===== 0003_verification_queue =====
create table public.uk_bank_holidays (
  holiday_date date primary key,
  name text not null
);
insert into public.uk_bank_holidays (holiday_date, name) values
 ('2026-01-01','New Year''s Day'),
 ('2026-04-03','Good Friday'),
 ('2026-04-06','Easter Monday'),
 ('2026-05-04','Early May Bank Holiday'),
 ('2026-05-25','Spring Bank Holiday'),
 ('2026-08-31','Summer Bank Holiday'),
 ('2026-12-25','Christmas Day'),
 ('2026-12-28','Boxing Day (substitute)');

create table public.daily_free_queue_counter (
  counter_date date primary key,
  count int not null default 0
);

create type queue_type as enum ('free','priority');
create type verification_status as enum ('awaiting_slot','queued','in_review','pending_qc','completed','unable_to_verify');

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  requested_by uuid references public.users(id),
  queue_type queue_type not null default 'free',
  status verification_status not null default 'awaiting_slot',
  stripe_payment_id text,
  entered_queue_at timestamptz not null default now(),
  sla_due_at timestamptz,
  assigned_verifier_id uuid references public.users(id),
  reviewer_id uuid references public.users(id),
  outcome_classification halal_classification,
  completed_at timestamptz,
  sla_breached boolean not null default false,
  refund_status text not null default 'none' check (refund_status in ('none','issued','not_applicable'))
);
alter table public.verification_requests enable row level security;

create type evidence_type as enum ('certificate','photo','menu','statement','site_visit_note');
create table public.verification_evidence (
  id uuid primary key default gen_random_uuid(),
  verification_request_id uuid references public.verification_requests(id) on delete cascade,
  type evidence_type not null,
  storage_path_or_url text not null,
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.verification_evidence enable row level security;

create table public.verification_history (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete restrict,
  verification_request_id uuid references public.verification_requests(id) on delete restrict,
  classification_result halal_classification not null,
  facts_snapshot jsonb not null,
  verifier_id uuid references public.users(id),
  reviewer_id uuid references public.users(id),
  verified_at timestamptz not null default now()
);
alter table public.verification_history enable row level security;

-- ===== 0004_subscriptions_offers =====
create type subscription_plan as enum ('monthly','annual');
create type subscription_status as enum ('active','past_due','canceled','incomplete');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status subscription_status not null default 'incomplete',
  plan subscription_plan,
  current_period_end timestamptz
);
alter table public.subscriptions enable row level security;
create policy sub_owner_select on public.subscriptions for select using (user_id = auth.uid());
-- 0013: one subscription row per user, updated in place by the Stripe webhook
alter table public.subscriptions add constraint subscriptions_user_id_key unique (user_id);

create function public.is_current_user_yep_plus() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;
-- harmless to expose directly: returns only a boolean about the caller's own session
grant execute on function public.is_current_user_yep_plus() to anon, authenticated;

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  title text not null,
  description text,
  yep_plus_only boolean not null default true,
  is_early_access boolean not null default false,
  voucher_code text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.offers enable row level security;
-- deliberately zero direct policies; offers_public view is the only public read path.

create view public.offers_public as
select
  id, restaurant_id, title, description, yep_plus_only, is_early_access, starts_at, ends_at,
  case when yep_plus_only and not public.is_current_user_yep_plus() then null else voucher_code end as voucher_code
from public.offers;

grant select on public.offers_public to anon, authenticated;

-- ===== 0005/0008 combined: search_restaurants (final version, returns lat/lng) =====
create function public.search_restaurants(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int,
  p_mode text default 'current_location',
  p_classification text[] default null,
  p_cuisine_ids int[] default null,
  p_query text default null
)
returns table (
  id uuid,
  name text,
  slug text,
  address text,
  lat double precision,
  lng double precision,
  halal_classification text,
  distance_meters double precision,
  primary_photo_path text,
  cuisines text[],
  effective_radius_meters int,
  is_yep_plus boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_is_yep_plus boolean;
  v_max_radius int;
  v_effective_radius int;
begin
  v_is_yep_plus := public.is_current_user_yep_plus();

  if v_is_yep_plus then
    v_max_radius := 80467; -- 50 miles, top of the Yep+ selector; "Unlimited" handled client-side
  elsif p_mode = 'current_location' then
    v_max_radius := 1609; -- 1 mile hard cap, free tier
  else
    v_max_radius := 805; -- 0.5 mile hard cap, free tier
  end if;

  v_effective_radius := least(coalesce(p_radius_meters, v_max_radius), v_max_radius);

  return query
  select
    r.id,
    r.name,
    r.slug,
    r.address,
    ST_Y(r.location::geometry) as lat,
    ST_X(r.location::geometry) as lng,
    r.halal_classification::text,
    st_distance(r.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_meters,
    (select rp.storage_path from public.restaurant_photos rp where rp.restaurant_id = r.id and rp.is_primary limit 1) as primary_photo_path,
    (select array_agg(c.name order by c.name) from public.restaurant_cuisines rc join public.cuisines c on c.id = rc.cuisine_id where rc.restaurant_id = r.id) as cuisines,
    v_effective_radius as effective_radius_meters,
    v_is_yep_plus as is_yep_plus
  from public.restaurants r
  where st_dwithin(r.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, v_effective_radius)
    and (p_classification is null or r.halal_classification::text = any(p_classification))
    and (p_cuisine_ids is null or exists (
      select 1 from public.restaurant_cuisines rc2
      where rc2.restaurant_id = r.id and rc2.cuisine_id = any(p_cuisine_ids)
    ))
    and (p_query is null or r.name ilike '%' || p_query || '%')
  order by distance_meters asc
  limit 100;
end;
$$;

grant execute on function public.search_restaurants(double precision, double precision, int, text, text[], int[], text) to anon, authenticated;

revoke all on public.restaurant_halal_facts from anon, authenticated;
revoke all on public.offers from anon, authenticated;

-- ===== 0006_security_hardening =====
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- ===== 0009 already reflected above (is_current_user_yep_plus stays granted) =====

-- ===== 0010_restaurants_public_view =====
create view public.restaurants_with_coords as
select
  r.*,
  ST_Y(r.location::geometry) as lat,
  ST_X(r.location::geometry) as lng
from public.restaurants r;

grant select on public.restaurants_with_coords to anon, authenticated;

-- ===== 0011_anonymous_submission =====
-- Submitting a restaurant or a free verification request must not require an
-- account first — capture contact details directly instead of requiring auth.uid().
alter table public.restaurant_claims
  add column contact_name text,
  add column contact_email text;

create policy claims_owner_select on public.restaurant_claims for select using (submitted_by = auth.uid());
create policy claims_insert_any on public.restaurant_claims
  for insert
  with check (submitted_by = auth.uid() or submitted_by is null);

create policy restaurants_insert_any on public.restaurants
  for insert
  with check (true);

alter table public.verification_requests
  add column contact_name text,
  add column contact_email text;

create policy vr_insert_any on public.verification_requests
  for insert
  with check (requested_by = auth.uid() or requested_by is null);

create policy vr_select_own on public.verification_requests
  for select
  using (requested_by = auth.uid());

-- ===== 0012_cuisine_link_insert_policy =====
create policy rc_insert_any on public.restaurant_cuisines for insert with check (true);

-- ===== 0014_storage_bucket =====
insert into storage.buckets (id, name, public)
values ('restaurant-photos', 'restaurant-photos', true)
on conflict (id) do nothing;

create policy "Public read restaurant photos"
  on storage.objects for select
  using (bucket_id = 'restaurant-photos');

create policy "Anyone can upload restaurant photos"
  on storage.objects for insert
  with check (bucket_id = 'restaurant-photos');

-- ===== 0015_photo_insert_policy (only the one that survived 0016's cleanup) =====
create policy photos_insert_any on public.restaurant_photos for insert with check (true);

-- ============================================================================
-- Seed data (0007) — clearly-fictional demo restaurants for testing, not a
-- real imported dataset. All start Unverified except a few marked to
-- demonstrate all three classification states.
-- ============================================================================
insert into public.cuisines (name) values
 ('Turkish'),('Pakistani'),('Bangladeshi'),('Indian'),('Lebanese'),('Persian'),
 ('Fried Chicken'),('Burgers'),('Biryani'),('Grill'),('Bakery'),('Middle Eastern');

insert into public.restaurants (name, slug, description, location, address, postcode, phone, website_url, menu_url, halal_classification, data_source)
  values
  ('Al-Waha Grill House','al-waha-grill-house','Charcoal-grilled Turkish classics in the heart of Shoreditch.', ST_SetSRID(ST_MakePoint(-0.0786,51.5265),4326)::geography,'12 Redchurch Street, Shoreditch, London','E2 7DJ','020 7946 0011','https://example.com/al-waha','https://example.com/al-waha/menu','fully_halal','manual_admin'),
  ('Zaman Bakery & Cafe','zaman-bakery-cafe','Fresh flatbreads, pastries and strong tea, baked daily.', ST_SetSRID(ST_MakePoint(-0.0610,51.5194),4326)::geography,'88 Whitechapel Road, London','E1 1DT','020 7946 0022',null,null,'fully_halal','manual_admin'),
  ('Karachi Darbar Kitchen','karachi-darbar-kitchen','Slow-cooked karahis and tandoori grills, Karachi-style.', ST_SetSRID(ST_MakePoint(-0.0610,51.5205),4326)::geography,'145 Commercial Road, London','E1 1PU','020 7946 0033','https://example.com/karachi-darbar',null,'fully_halal','manual_admin'),
  ('Beirut Nights','beirut-nights','Lebanese mezze and grills with a late-night lounge menu.', ST_SetSRID(ST_MakePoint(-0.1679,51.5203),4326)::geography,'34 Edgware Road, London','W2 2EH','020 7946 0044','https://example.com/beirut-nights','https://example.com/beirut-nights/menu','halal_options','manual_admin'),
  ('Spice Trail Biryani House','spice-trail-biryani-house','Slow-cooked dum biryani and regional Indian curries.', ST_SetSRID(ST_MakePoint(-0.0246,51.5270),4326)::geography,'21 Bow Road, London','E3 2AD','020 7946 0055',null,null,'unverified','manual_admin'),
  ('Golden Bucket Fried Chicken','golden-bucket-fried-chicken','Halal fried chicken, wings and burgers.', ST_SetSRID(ST_MakePoint(0.0335,51.5324),4326)::geography,'56 Green Street, London','E7 8LE','020 7946 0066',null,null,'unverified','manual_admin'),
  ('Persia Grill Co.','persia-grill-co','Saffron chicken and lamb kebabs, Persian-style.', ST_SetSRID(ST_MakePoint(-0.1926,51.5000),4326)::geography,'19 Kensington High Street, London','W8 5NP','020 7946 0077','https://example.com/persia-grill',null,'unverified','manual_admin'),
  ('Baba''s Burger Bar','babas-burger-bar','Smash burgers and loaded fries, fully halal beef.', ST_SetSRID(ST_MakePoint(-0.1426,51.5390),4326)::geography,'7 Camden High Street, London','NW1 7JE','020 7946 0088',null,null,'halal_options','manual_admin'),
  ('Nazma Sweets & Snacks','nazma-sweets-snacks','Bengali sweets, samosas and street snacks.', ST_SetSRID(ST_MakePoint(-0.0716,51.5225),4326)::geography,'102 Brick Lane, London','E1 6RL','020 7946 0099',null,null,'unverified','manual_admin'),
  ('Al Madina Restaurant','al-madina-restaurant','Punjabi home-style cooking and tandoor specialities.', ST_SetSRID(ST_MakePoint(-0.3762,51.5077),4326)::geography,'63 The Green, Southall','UB2 4BE','020 7946 0100','https://example.com/al-madina',null,'fully_halal','manual_admin'),
  ('Istanbul Kebab House','istanbul-kebab-house','Traditional Turkish kebabs and pide.', ST_SetSRID(ST_MakePoint(-0.1057,51.5799),4326)::geography,'210 Green Lanes, London','N4 2HB','020 7946 0111',null,null,'unverified','manual_admin'),
  ('Downtown Kebab & Grill','downtown-kebab-grill','Late-night grills and wraps in central London.', ST_SetSRID(ST_MakePoint(-0.1276,51.5136),4326)::geography,'5 Charing Cross Road, London','WC2H 0EA','020 7946 0122',null,null,'unverified','manual_admin'),
  ('Sultan''s Table','sultans-table','Ottoman-inspired grills and lokum for dessert.', ST_SetSRID(ST_MakePoint(-0.0554,51.5270),4326)::geography,'44 Bethnal Green Road, London','E2 6DG','020 7946 0133',null,null,'unverified','manual_admin'),
  ('Ruchi Dining','ruchi-dining','Contemporary Indian small plates and curries.', ST_SetSRID(ST_MakePoint(-0.0755,51.5143),4326)::geography,'9 Aldgate High Street, London','EC3N 1AL','020 7946 0144','https://example.com/ruchi',null,'unverified','manual_admin'),
  ('Coal & Ember Grill','coal-ember-grill','Modern halal steakhouse and open-fire grill.', ST_SetSRID(ST_MakePoint(-0.0786,51.5280),4326)::geography,'70 Kingsland Road, London','E2 8DP','020 7946 0155','https://example.com/coal-ember','https://example.com/coal-ember/menu','halal_options','manual_admin');

-- No temp table: each insert below joins straight back to public.restaurants
-- by slug, which is unique and already committed by the insert above. This
-- avoids relying on session/temp-table state surviving across statements,
-- which the Supabase SQL Editor doesn't guarantee the way a direct
-- connection does.

insert into public.restaurant_cuisines (restaurant_id, cuisine_id)
select sr.id, c.id from public.restaurants sr join public.cuisines c on
  (sr.slug = 'al-waha-grill-house' and c.name = 'Turkish') or
  (sr.slug = 'zaman-bakery-cafe' and c.name = 'Bakery') or
  (sr.slug = 'karachi-darbar-kitchen' and c.name = 'Pakistani') or
  (sr.slug = 'beirut-nights' and c.name = 'Lebanese') or
  (sr.slug = 'spice-trail-biryani-house' and c.name in ('Indian','Biryani')) or
  (sr.slug = 'golden-bucket-fried-chicken' and c.name = 'Fried Chicken') or
  (sr.slug = 'persia-grill-co' and c.name = 'Persian') or
  (sr.slug = 'babas-burger-bar' and c.name = 'Burgers') or
  (sr.slug = 'nazma-sweets-snacks' and c.name = 'Bangladeshi') or
  (sr.slug = 'al-madina-restaurant' and c.name = 'Indian') or
  (sr.slug = 'istanbul-kebab-house' and c.name = 'Turkish') or
  (sr.slug = 'downtown-kebab-grill' and c.name = 'Grill') or
  (sr.slug = 'sultans-table' and c.name = 'Turkish') or
  (sr.slug = 'ruchi-dining' and c.name = 'Indian') or
  (sr.slug = 'coal-ember-grill' and c.name = 'Grill');

insert into public.restaurant_photos (restaurant_id, storage_path, type, is_primary)
select sr.id, u.url, 'food', true from public.restaurants sr join (values
 ('al-waha-grill-house','https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800'),
 ('zaman-bakery-cafe','https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800'),
 ('karachi-darbar-kitchen','https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'),
 ('beirut-nights','https://images.unsplash.com/photo-1544025162-d76694265947?w=800'),
 ('spice-trail-biryani-house','https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800'),
 ('golden-bucket-fried-chicken','https://images.unsplash.com/photo-1562967914-608f82629710?w=800'),
 ('persia-grill-co','https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800'),
 ('babas-burger-bar','https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800'),
 ('nazma-sweets-snacks','https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800'),
 ('al-madina-restaurant','https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'),
 ('istanbul-kebab-house','https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800'),
 ('downtown-kebab-grill','https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800'),
 ('sultans-table','https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800'),
 ('ruchi-dining','https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800'),
 ('coal-ember-grill','https://images.unsplash.com/photo-1544025162-d76694265947?w=800')
) as u(slug, url) on u.slug = sr.slug;

insert into public.restaurant_halal_facts (restaurant_id, all_meat_halal, halal_meat_types, serves_non_halal_meat, serves_pork, serves_alcohol, has_certification, certification_body, verified_at, last_verified_at, next_review_due_at, last_outcome)
select sr.id, f.all_meat_halal, f.halal_meat_types, f.serves_non_halal_meat, f.serves_pork, f.serves_alcohol, f.has_certification, f.certification_body,
  now() - interval '30 days', now() - interval '30 days', now() + interval '11 months', 'verified'
from public.restaurants sr join (values
 ('al-waha-grill-house', true, array['chicken','lamb','beef'], false, false, false, true, 'HMC'),
 ('zaman-bakery-cafe', true, array['chicken'], false, false, false, true, 'HFA'),
 ('karachi-darbar-kitchen', true, array['chicken','lamb','beef'], false, false, false, true, 'HMC'),
 ('al-madina-restaurant', true, array['chicken','lamb'], false, false, false, true, 'HFA'),
 ('beirut-nights', false, array['chicken','lamb'], true, false, true, false, null),
 ('babas-burger-bar', false, array['beef','chicken'], true, false, false, false, null),
 ('coal-ember-grill', false, array['beef','lamb'], true, false, true, false, null)
) as f(slug, all_meat_halal, halal_meat_types, serves_non_halal_meat, serves_pork, serves_alcohol, has_certification, certification_body)
on f.slug = sr.slug;

-- ============================================================================
-- Done. Next: Project Settings → API → copy the "anon public" key and send it
-- back so .env.local can be updated (NEXT_PUBLIC_SUPABASE_URL is derived from
-- this project's ref: https://wxiaexrsfraiktbdmdlu.supabase.co).
-- ============================================================================
