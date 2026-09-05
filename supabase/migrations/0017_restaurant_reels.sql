-- 0017_restaurant_reels
--
-- Restaurant reels + the partnership tier that governs how many of them a
-- restaurant may publish.
--
-- Design notes that matter:
--
-- * Allowances live in platform_settings, not in a column and not in code, so
--   the commercial model can change without a migration or a deploy.
-- * The allowance is enforced by a TRIGGER, not only by application code. The
--   brief says the backend must reject publishing beyond allowance; a trigger
--   is the only version of that which survives a bug in a route handler, a
--   direct service-role write, or a future second client.
-- * Partnership is entirely separate from public.subscriptions. That table is
--   consumer Yep+ (unique on user_id, drives is_current_user_yep_plus()).
--   Nothing here reads or writes it.
-- * Paying changes reel capacity and nothing else. There is deliberately no
--   path from restaurant_partnerships to halal_classification or to the
--   verification queue, and none should ever be added.

-- ============================================================================
-- Configurable platform settings
-- ============================================================================

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
-- No public policies: read through the security-definer helpers below only.

insert into public.platform_settings (key, value, description) values
  ('reel_allowance_free',    '1'::jsonb,  'Published reels allowed on the free tier.'),
  ('reel_allowance_partner', '10'::jsonb, 'Published reels allowed for an active partner.'),
  ('discovery_reels_per_restaurant', '2'::jsonb,
     'Max reels from any one restaurant in a single Discovery session, so a large library cannot flood a feed.')
on conflict (key) do nothing;

create or replace function public.setting_int(p_key text, p_default int)
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from public.platform_settings where key = p_key), p_default);
$$;

-- ============================================================================
-- Restaurant partnership (business monetisation — NOT Yep+)
-- ============================================================================

create type partnership_status as enum ('none','active','past_due','canceled');

create table if not exists public.restaurant_partnerships (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  status partnership_status not null default 'none',
  -- Mirrors the priority-verification pattern: Stripe is the source of truth,
  -- the webhook writes here, and the app only ever reads.
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  -- Per-restaurant override for a negotiated deal. Null = use the tier default.
  reel_allowance_override int check (reel_allowance_override is null or reel_allowance_override >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.restaurant_partnerships enable row level security;
-- Read-only to the owner of the restaurant; all writes are service-role.
create policy partnership_owner_select on public.restaurant_partnerships
  for select using (
    exists (select 1 from public.restaurants r
            where r.id = restaurant_id and r.owner_id = auth.uid())
  );

create or replace function public.is_active_partner(p_restaurant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.restaurant_partnerships
    where restaurant_id = p_restaurant_id
      and status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- ============================================================================
-- Reels
-- ============================================================================

create type reel_media_kind as enum ('upload','embed');
create type reel_status as enum ('draft','pending_review','published','rejected','archived');

create table if not exists public.restaurant_reels (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  uploaded_by uuid references public.users(id) on delete set null,

  media_kind reel_media_kind not null,
  -- upload: public URL in the restaurant-reels bucket. embed: the external URL.
  media_url text not null,
  -- embed only; null for uploads.
  provider video_provider,
  -- Poster frame. Required for embeds (nothing to autoplay), optional for uploads.
  cover_url text,
  caption text,

  status reel_status not null default 'pending_review',
  -- Admin-facing reason a reel was rejected. Never shown publicly.
  moderation_note text,

  position int not null default 0,
  -- An owner may keep a reel on their page without pushing it to Discovery.
  discovery_eligible boolean not null default true,

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reel_embed_has_provider
    check ((media_kind = 'embed' and provider is not null)
        or (media_kind = 'upload' and provider is null)),
  constraint reel_embed_has_cover
    check (media_kind <> 'embed' or cover_url is not null)
);

create index restaurant_reels_restaurant_idx on public.restaurant_reels (restaurant_id, position);
create index restaurant_reels_discovery_idx on public.restaurant_reels (status, discovery_eligible)
  where status = 'published' and discovery_eligible;

alter table public.restaurant_reels enable row level security;

-- Public sees published reels only. Draft, pending, rejected and archived are
-- invisible to everyone but the owner and admins.
create policy reels_public_read on public.restaurant_reels
  for select using (status = 'published');

create policy reels_owner_read on public.restaurant_reels
  for select using (
    exists (select 1 from public.restaurants r
            where r.id = restaurant_id and r.owner_id = auth.uid())
  );

-- Deliberately no insert/update/delete policies. Every write goes through a
-- server route holding the service role, which is where ownership and
-- allowance are checked. Hiding the upload button is not a control.

-- ============================================================================
-- Allowance — the commercial rule, enforced in the database
-- ============================================================================

create or replace function public.restaurant_reel_allowance(p_restaurant_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(
    (select reel_allowance_override from public.restaurant_partnerships
      where restaurant_id = p_restaurant_id),
    case
      when public.is_active_partner(p_restaurant_id)
        then public.setting_int('reel_allowance_partner', 10)
      else public.setting_int('reel_allowance_free', 1)
    end
  );
$$;
grant execute on function public.restaurant_reel_allowance(uuid) to anon, authenticated;

create or replace function public.published_reel_count(p_restaurant_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.restaurant_reels
  where restaurant_id = p_restaurant_id and status = 'published';
$$;
grant execute on function public.published_reel_count(uuid) to anon, authenticated;

-- Only 'published' consumes allowance. Drafts and archived reels are free, so a
-- restaurant can prepare content and swap which reel is live without paying.
create or replace function public.enforce_reel_allowance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  allowance int;
  live int;
begin
  if new.status <> 'published' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;  -- already counted; edits to a live reel are fine
  end if;

  allowance := public.restaurant_reel_allowance(new.restaurant_id);
  select count(*) into live from public.restaurant_reels
    where restaurant_id = new.restaurant_id and status = 'published' and id <> new.id;

  if live >= allowance then
    raise exception using
      errcode = 'check_violation',
      message = format(
        'Reel allowance reached: %s of %s published. Unpublish one, or upgrade the partnership.',
        live, allowance);
  end if;

  if new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger reels_enforce_allowance
  before insert or update on public.restaurant_reels
  for each row execute function public.enforce_reel_allowance();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger reels_touch_updated_at
  before update on public.restaurant_reels
  for each row execute function public.touch_updated_at();

create trigger partnerships_touch_updated_at
  before update on public.restaurant_partnerships
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Ownership claims — how a real owner gets linked to a listing
-- ============================================================================

create type ownership_claim_status as enum ('pending','approved','rejected');

create table if not exists public.restaurant_ownership_claims (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status ownership_claim_status not null default 'pending',
  contact_note text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

alter table public.restaurant_ownership_claims enable row level security;
create policy ownership_claim_self_select on public.restaurant_ownership_claims
  for select using (user_id = auth.uid());
create policy ownership_claim_self_insert on public.restaurant_ownership_claims
  for insert with check (user_id = auth.uid());
-- Approval is service-role only: granting owner_id hands over edit rights to a
-- live listing, so it never happens without an admin.

-- ============================================================================
-- Reel media storage
-- ============================================================================

-- Public read so <video> can stream without signed-URL churn, but NOT public
-- write. The existing restaurant-photos bucket has an "Anyone can upload"
-- insert policy; that is a hole, and this bucket must not repeat it. Uploads
-- here happen against a signed upload URL minted by the server only after
-- ownership and allowance have been checked.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-reels', 'restaurant-reels', true, 104857600,
        array['video/mp4','video/quicktime','video/webm','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Public read restaurant reels"
  on storage.objects for select
  using (bucket_id = 'restaurant-reels');

-- ============================================================================
-- restaurant_videos is superseded by restaurant_reels.
--
-- It holds 0 rows, so nothing is lost, but the DROP is left commented rather
-- than run: dropping a table is irreversible, and it costs nothing to leave it
-- dormant until you have confirmed nothing else references it.
--
--   drop table if exists public.restaurant_videos;
-- ============================================================================
