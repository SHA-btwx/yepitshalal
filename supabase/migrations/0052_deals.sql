-- 0052_deals
--
-- Deals, stage one. A restaurant runs one simple deal ("Free drink when you
-- spend £15"). A diner claims a code on their phone, with no account. At the
-- till, staff type the restaurant's PIN on the diner's phone, and only then is
-- a small fee taken from the restaurant's prepaid credit. No invoices, no
-- chasing: the credit is paid up front through Stripe, and a deal simply stops
-- taking new claims when the credit runs low.
--
-- Numbered 0052 because the admin-dashboard branch holds 0051_admin_inbox,
-- not yet applied either. Neither depends on the other.
--
-- What matters here:
--
-- * Nothing in this file writes to restaurants. A deal never changes a halal
--   label, a verification, or search rank. The page shows the restaurant's
--   own label beside every deal, and an owner cannot type "halal" (or a
--   certifier's name) into a deal: the CHECK on deals.item refuses it.
-- * Money only moves in deal_ledger, which is append only (a trigger refuses
--   UPDATE and DELETE). The balance is the sum of the rows. Every row has a
--   unique reference, so a Stripe retry, a double tap, or a form sent twice
--   can never post twice: "topup:<checkout session>", "fee:<claim>",
--   "refund:<charge>:<total refunded>", "grant:welcome:<restaurant>",
--   "feeback:<claim>", "adjust:<form token>".
-- * Every function that spends or reserves credit first locks the
--   restaurant's deal_accounts row (FOR UPDATE), so two claims or two taps at
--   the same moment queue up behind each other and see each other's result.
-- * A claim reserves (holds) its fee while it is open, so the credit a code
--   was promised is still there when it reaches the till. Holds end when the
--   code is used, voided, or 48 hours pass. Available = balance minus holds.
-- * The fee is only ever posted inside redeem_deal(), after the PIN matched.
--   No PIN, no fee.
-- * The fee: £1 when this is the phone's first use of a deal at this
--   restaurant in 90 days AND the claim started on our site; 30p for
--   everything else, including every claim from the restaurant's own in-store
--   QR code (source 'qr'), which never gets the £1 rate.
-- * Guards: one use per phone per restaurant per London day (a partial
--   UNIQUE index backs the function), one open code per phone per
--   restaurant, codes tied to the phone that claimed them, 48 hour codes, a
--   monthly fee cap per restaurant (default £50, the fee is clipped so the cap
--   is never passed), PIN tries limited per code and per restaurant, and
--   three "they didn't honour this" reports from different phones pause the
--   deal.
-- * The phone is known only by device_hash: a keyed SHA-256 of a random id in
--   a cookie the site sets when someone taps Claim. Nothing else about the
--   diner is stored. purge_old_deal_devices() clears the hash after 400 days.
-- * Correctness never waits for a cron. Expired codes stop working at their
--   expiry time, and a deal stops taking claims the moment credit or the cap
--   runs short. The daily job only tidies statuses and sends emails.
-- * Everything is service role only: RLS on with no policies, no grants to
--   anon or authenticated, and every function callable by service_role alone.

-- ============================================================================
-- The rules, in one place. Changing a fee means a new terms version too:
-- restaurants agreed to these numbers.
-- ============================================================================

create or replace function public.deal_rule(p_name text)
returns int
language sql
immutable
set search_path = public
as $$
  select case p_name
    when 'fee_new' then 100              -- pence, a new diner from our site
    when 'fee_repeat' then 30            -- pence, everything else
    when 'welcome_credit' then 1000      -- pence, once per restaurant, ever
    when 'low_balance' then 500          -- pence, the "running low" email
    when 'code_hours' then 48
    when 'first_visit_days' then 90
    when 'dispute_days' then 7           -- an admin can credit a fee back
    when 'reports_to_pause' then 3
    when 'report_window_days' then 30
    when 'pin_tries_per_code' then 5
    when 'pin_tries_before_lock' then 10
    when 'pin_lock_minutes' then 30
    when 'cap_default' then 5000
    when 'cap_min' then 1000
    when 'cap_max' then 50000
  end;
$$;

-- ============================================================================
-- Tables
-- ============================================================================

-- One row per restaurant that has ever started a deal. It is the row every
-- money function locks, and it holds the monthly cap.
create table public.deal_accounts (
  restaurant_id uuid primary key references public.restaurants (id) on delete restrict,
  monthly_cap_pence int not null default 5000 check (monthly_cap_pence between 1000 and 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A deal's terms never change once it is live. "Change my deal" ends the old
-- one and starts a new one, so every claim points at the exact terms the
-- diner saw.
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,

  kind text not null check (kind in ('free_item', 'percent_off')),
  -- What is free, as the owner typed it: "soft drink", "dessert". Never a
  -- halal claim: labels come only from a completed verification.
  item text check (
    item is null
    or (char_length(item) between 2 and 40 and item !~* '(halal|haram|zabi|hmc|hfa|certif)')
  ),
  percent_off int check (percent_off is null or percent_off between 5 and 25),
  min_spend_pence int not null default 0 check (min_spend_pence between 0 and 20000),

  -- A quiet hours deal only works on these ISO weekdays (1 Monday to 7
  -- Sunday), between these London times.
  quiet_days int[] check (quiet_days is null or (quiet_days <@ array[1, 2, 3, 4, 5, 6, 7] and cardinality(quiet_days) between 1 and 7)),
  quiet_start time,
  quiet_end time,

  -- The headline, written by the server from the fields above.
  title text not null check (char_length(title) between 5 and 120 and title !~* '(halal|haram|zabi|hmc|hfa|certif)'),

  status text not null default 'live' check (status in ('live', 'paused', 'ended')),
  -- owner: paused from /manage. reports: three diners said it was not
  -- honoured. admin: paused from /admin. The last two need an admin to undo.
  paused_reason text check (paused_reason in ('owner', 'reports', 'admin')),
  paused_at timestamptz,
  ended_at timestamptz,
  -- Set when an admin starts the deal again. They have read the reports
  -- before it, so only reports after it count towards the next pause.
  reports_reset_at timestamptz,

  -- The one page terms, and when and by whom they were accepted.
  terms_version text not null check (char_length(terms_version) between 3 and 40),
  accepted_at timestamptz not null,
  accepted_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (kind = 'free_item' and item is not null and percent_off is null and min_spend_pence >= 500)
    or (kind = 'percent_off' and percent_off is not null and item is null)
  ),
  check (
    (quiet_days is null and quiet_start is null and quiet_end is null)
    or (quiet_days is not null and quiet_start is not null and quiet_end is not null and quiet_start < quiet_end)
  ),
  check ((status = 'paused') = (paused_reason is not null)),
  check ((status = 'ended') = (ended_at is not null))
);

-- One deal at a time per restaurant.
create unique index deals_one_open_per_restaurant on public.deals (restaurant_id) where status <> 'ended';

-- Staff never get accounts. They use this PIN, typed on the diner's phone.
create table public.restaurant_staff_pin (
  restaurant_id uuid primary key references public.restaurants (id) on delete restrict,
  -- bcrypt, through pgcrypto. The PIN itself is never stored or shown again.
  pin_hash text not null,
  rotated_at timestamptz not null default now(),
  -- Wrong tries since the last right one. Ten in a row locks the PIN for 30
  -- minutes; changing the PIN clears it.
  failed_attempts int not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz
);

create table public.deal_claims (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete restrict,
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,

  -- Six characters with nothing that reads two ways (no 0, O, 1, I or L).
  code text not null unique check (code ~ '^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'),
  -- The phone, as a keyed hash. Cleared after 400 days.
  device_hash text check (device_hash is null or device_hash ~ '^[0-9a-f]{64}$'),
  -- site: the claim started on yepitshalal.com. qr: the restaurant's own
  -- in-store QR code, which never earns the £1 rate.
  source text not null check (source in ('site', 'qr')),

  -- claimed: open. redeemed: staff confirmed with the PIN. expired: 48 hours
  -- passed. void: too many wrong PINs on this code.
  status text not null default 'claimed' check (status in ('claimed', 'redeemed', 'expired', 'void')),
  -- Credit reserved for this code while it is open.
  hold_pence int not null check (hold_pence in (30, 100)),
  -- Salted hash of the connection, for the hourly limit. Never the address.
  ip_hash text,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null,

  redeemed_at timestamptz,
  -- The London date of the redemption, for one use a day.
  redeemed_day date,
  fee_pence int check (fee_pence between 0 and 100),
  fee_kind text check (fee_kind in ('new', 'repeat')),

  pin_failures int not null default 0 check (pin_failures >= 0),

  -- "They didn't honour this", from the diner's screen.
  reported_at timestamptz,
  report_note text check (report_note is null or char_length(report_note) <= 500),

  check ((status = 'redeemed') = (redeemed_at is not null and redeemed_day is not null and fee_pence is not null and fee_kind is not null))
);

create unique index deal_claims_one_open_per_phone
  on public.deal_claims (restaurant_id, device_hash) where status = 'claimed';
create unique index deal_claims_one_use_a_day
  on public.deal_claims (restaurant_id, device_hash, redeemed_day) where status = 'redeemed';
create index deal_claims_by_restaurant on public.deal_claims (restaurant_id, created_at desc);
create index deal_claims_by_deal on public.deal_claims (deal_id, created_at desc);
create index deal_claims_by_ip on public.deal_claims (ip_hash, created_at);

create table public.deal_ledger (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  -- grant:      the £10 welcome credit, once per restaurant
  -- topup:      a Stripe payment for credit
  -- fee:        a confirmed redemption (negative)
  -- refund:     money Stripe returned to the restaurant, taking credit back (negative)
  -- adjustment: by an admin, with a note. A fee credited back is one of these,
  --             with the claim it belongs to
  kind text not null check (kind in ('grant', 'topup', 'fee', 'refund', 'adjustment')),
  amount_pence int not null check (amount_pence <> 0 and abs(amount_pence) <= 100000),
  reference text not null unique check (char_length(reference) between 3 and 200),
  claim_id uuid references public.deal_claims (id) on delete restrict,
  -- The Checkout Session (topup) or the Charge (refund).
  stripe_id text,
  note text check (note is null or char_length(note) between 3 and 500),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    case kind
      when 'grant' then amount_pence > 0
      when 'topup' then amount_pence > 0 and stripe_id is not null
      when 'fee' then amount_pence < 0 and claim_id is not null
      when 'refund' then amount_pence < 0 and stripe_id is not null
      when 'adjustment' then note is not null
    end
  )
);

create index deal_ledger_by_restaurant on public.deal_ledger (restaurant_id, created_at desc);
create index deal_ledger_by_stripe on public.deal_ledger (stripe_id) where stripe_id is not null;

create or replace function public.deal_ledger_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'deal_ledger is append only: post a new row instead'
    using errcode = 'P0001';
end;
$$;

create trigger deal_ledger_no_update
  before update or delete on public.deal_ledger
  for each row execute function public.deal_ledger_is_append_only();
create trigger deal_ledger_no_truncate
  before truncate on public.deal_ledger
  for each statement execute function public.deal_ledger_is_append_only();

-- Every PIN try, right or wrong. Feeds the per-connection limit in the API
-- and the restaurant's own record.
create table public.deal_pin_attempts (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  claim_id uuid references public.deal_claims (id) on delete cascade,
  ip_hash text,
  ok boolean not null,
  created_at timestamptz not null default now()
);

create index deal_pin_attempts_by_ip on public.deal_pin_attempts (ip_hash, created_at);

-- Emails the daily and weekly jobs have sent, so a job that runs twice, or is
-- called by hand, never sends the same email twice.
create table public.deal_emails (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  kind text not null check (kind in ('low_balance', 'no_credit', 'weekly', 'paused_reports', 'pin_locked')),
  period text not null check (char_length(period) between 1 and 80),
  sent_at timestamptz not null default now(),
  resend_id text,
  primary key (restaurant_id, kind, period)
);

create trigger deal_accounts_touch before update on public.deal_accounts
  for each row execute function public.touch_updated_at();
create trigger deals_touch before update on public.deals
  for each row execute function public.touch_updated_at();

alter table public.deal_accounts enable row level security;
alter table public.deals enable row level security;
alter table public.restaurant_staff_pin enable row level security;
alter table public.deal_claims enable row level security;
alter table public.deal_ledger enable row level security;
alter table public.deal_pin_attempts enable row level security;
alter table public.deal_emails enable row level security;

revoke all on public.deal_accounts, public.deals, public.restaurant_staff_pin, public.deal_claims,
  public.deal_ledger, public.deal_pin_attempts, public.deal_emails from anon, authenticated;

-- ============================================================================
-- Reading the money
-- ============================================================================

create or replace function public.deal_balance(p_restaurant_id uuid)
returns int
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(amount_pence), 0)::int from public.deal_ledger where restaurant_id = p_restaurant_id;
$$;

-- Credit reserved by codes that are still open.
create or replace function public.deal_held(p_restaurant_id uuid)
returns int
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(hold_pence), 0)::int
  from public.deal_claims
  where restaurant_id = p_restaurant_id and status = 'claimed' and expires_at > now();
$$;

-- Fees in the current London calendar month, less fees credited back.
create or replace function public.deal_month_fees(p_restaurant_id uuid)
returns int
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(-sum(amount_pence), 0)::int
  from public.deal_ledger
  where restaurant_id = p_restaurant_id
    and created_at >= (date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London')
    and (kind = 'fee' or (kind = 'adjustment' and claim_id is not null));
$$;

-- Everything a page needs to know about a restaurant's deal, in one call.
-- "state" is what a diner meets:
--   none         no deal
--   ended        the last deal was ended
--   paused       paused by the owner, by reports, or by an admin (see reason)
--   not_listed   the restaurant is not listed, or is closed
--   no_pin       no staff PIN yet
--   no_credit    available credit is under the £1 fee
--   cap_reached  this month's cap has no room for another £1 fee
--   live         taking claims
create or replace function public.deal_state(p_restaurant_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  d public.deals;
  r public.restaurants;
  v_balance int := public.deal_balance(p_restaurant_id);
  v_held int := public.deal_held(p_restaurant_id);
  v_month int := public.deal_month_fees(p_restaurant_id);
  v_cap int;
  v_has_pin boolean;
  v_state text;
begin
  select * into r from public.restaurants where id = p_restaurant_id;
  select monthly_cap_pence into v_cap from public.deal_accounts where restaurant_id = p_restaurant_id;
  v_cap := coalesce(v_cap, public.deal_rule('cap_default'));
  select exists (select 1 from public.restaurant_staff_pin where restaurant_id = p_restaurant_id) into v_has_pin;

  select * into d from public.deals
  where restaurant_id = p_restaurant_id
  order by (status <> 'ended') desc, created_at desc
  limit 1;

  v_state := case
    when d.id is null then 'none'
    when d.status = 'ended' then 'ended'
    when d.status = 'paused' then 'paused'
    when r.id is null or r.is_listed is not true or r.merged_into is not null
      or r.catalogue_status::text in ('permanently_closed', 'temporarily_closed') then 'not_listed'
    when not v_has_pin then 'no_pin'
    when v_balance - v_held < public.deal_rule('fee_new') then 'no_credit'
    when v_cap - v_month - v_held < public.deal_rule('fee_new') then 'cap_reached'
    else 'live'
  end;

  return jsonb_build_object(
    'state', v_state,
    'deal', case when d.id is null then null else to_jsonb(d) end,
    'balance_pence', v_balance,
    'held_pence', v_held,
    'available_pence', v_balance - v_held,
    'month_fees_pence', v_month,
    'cap_pence', v_cap,
    'has_pin', v_has_pin
  );
end;
$$;

-- ============================================================================
-- Setting up a deal (owner screens, through the server)
-- ============================================================================

-- A four digit PIN that is not one digit four times or a straight run.
create or replace function public.set_staff_pin(p_restaurant_id uuid, p_pin text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'pin_format' using errcode = 'P0001', hint = 'The PIN must be 4 numbers.';
  end if;
  if p_pin ~ '^(.)\1\1\1$'
    or position(p_pin in '0123456789') > 0
    or position(p_pin in '9876543210') > 0 then
    raise exception 'pin_weak' using errcode = 'P0001', hint = 'Pick a PIN that is harder to guess.';
  end if;
  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    raise exception 'restaurant_not_found' using errcode = 'P0001';
  end if;

  insert into public.restaurant_staff_pin (restaurant_id, pin_hash, rotated_at, failed_attempts, locked_until)
  values (p_restaurant_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), now(), 0, null)
  on conflict (restaurant_id) do update
    set pin_hash = excluded.pin_hash,
        rotated_at = excluded.rotated_at,
        failed_attempts = 0,
        locked_until = null;
end;
$$;

-- Starts a deal: ends any open one (its codes still work until they expire),
-- inserts the new terms, and grants the £10 welcome credit the first time a
-- restaurant ever starts one.
create or replace function public.start_deal(
  p_restaurant_id uuid,
  p_kind text,
  p_item text,
  p_percent_off int,
  p_min_spend_pence int,
  p_quiet_days int[],
  p_quiet_start time,
  p_quiet_end time,
  p_title text,
  p_terms_version text,
  p_accepted_by uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.restaurants;
  v_deal_id uuid;
  v_granted boolean := false;
begin
  select * into r from public.restaurants where id = p_restaurant_id;
  if r.id is null then
    raise exception 'restaurant_not_found' using errcode = 'P0001';
  end if;
  if r.owner_id is null then
    raise exception 'no_owner' using errcode = 'P0001', hint = 'Only a restaurant with an approved owner can run a deal.';
  end if;
  if r.is_listed is not true or r.merged_into is not null then
    raise exception 'not_listed' using errcode = 'P0001', hint = 'Only a listed restaurant can run a deal.';
  end if;
  if not exists (select 1 from public.restaurant_staff_pin where restaurant_id = p_restaurant_id) then
    raise exception 'no_pin' using errcode = 'P0001', hint = 'Set a staff PIN first.';
  end if;

  insert into public.deal_accounts (restaurant_id) values (p_restaurant_id) on conflict do nothing;
  perform 1 from public.deal_accounts where restaurant_id = p_restaurant_id for update;

  update public.deals
     set status = 'ended', ended_at = now(), paused_reason = null, paused_at = null
   where restaurant_id = p_restaurant_id and status <> 'ended';

  insert into public.deals (
    restaurant_id, kind, item, percent_off, min_spend_pence,
    quiet_days, quiet_start, quiet_end, title, terms_version, accepted_at, accepted_by
  ) values (
    p_restaurant_id, p_kind, nullif(btrim(p_item), ''), p_percent_off, coalesce(p_min_spend_pence, 0),
    p_quiet_days, p_quiet_start, p_quiet_end, p_title, p_terms_version, now(), p_accepted_by
  )
  returning id into v_deal_id;

  insert into public.deal_ledger (restaurant_id, kind, amount_pence, reference, note, created_by)
  values (p_restaurant_id, 'grant', public.deal_rule('welcome_credit'), 'grant:welcome:' || p_restaurant_id,
          'Welcome credit', p_accepted_by)
  on conflict (reference) do nothing;
  v_granted := found;

  return jsonb_build_object('ok', true, 'deal_id', v_deal_id, 'granted', v_granted);
end;
$$;

-- pause / resume / end. An owner can only undo their own pause: a pause for
-- reports or by an admin waits for an admin.
create or replace function public.set_deal_status(p_restaurant_id uuid, p_action text, p_by text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  d public.deals;
begin
  if p_by not in ('owner', 'admin') or p_action not in ('pause', 'resume', 'end') then
    raise exception 'bad_request' using errcode = 'P0001';
  end if;

  select * into d from public.deals
  where restaurant_id = p_restaurant_id and status <> 'ended'
  for update;
  if d.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_deal');
  end if;

  if p_action = 'pause' then
    if d.status = 'paused' then
      return jsonb_build_object('ok', true, 'status', 'paused');
    end if;
    update public.deals set status = 'paused', paused_reason = p_by, paused_at = now() where id = d.id;
    return jsonb_build_object('ok', true, 'status', 'paused');
  elsif p_action = 'resume' then
    if d.status = 'live' then
      return jsonb_build_object('ok', true, 'status', 'live');
    end if;
    if p_by = 'owner' and d.paused_reason <> 'owner' then
      return jsonb_build_object('ok', false, 'error', 'needs_admin', 'reason', d.paused_reason);
    end if;
    update public.deals
       set status = 'live', paused_reason = null, paused_at = null,
           reports_reset_at = case when p_by = 'admin' then now() else reports_reset_at end
     where id = d.id;
    return jsonb_build_object('ok', true, 'status', 'live');
  else
    update public.deals set status = 'ended', ended_at = now(), paused_reason = null, paused_at = null where id = d.id;
    return jsonb_build_object('ok', true, 'status', 'ended');
  end if;
end;
$$;

create or replace function public.set_deal_cap(p_restaurant_id uuid, p_cap_pence int)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_cap_pence is null or p_cap_pence < public.deal_rule('cap_min') or p_cap_pence > public.deal_rule('cap_max') then
    raise exception 'cap_range' using errcode = 'P0001', hint = 'Pick a cap between £10 and £500.';
  end if;
  insert into public.deal_accounts (restaurant_id, monthly_cap_pence) values (p_restaurant_id, p_cap_pence)
  on conflict (restaurant_id) do update set monthly_cap_pence = excluded.monthly_cap_pence;
end;
$$;

-- ============================================================================
-- The diner's side
-- ============================================================================

-- Expires an open code at its time, so the phone can claim again.
create or replace function public.deal_expire_stale(p_restaurant_id uuid, p_device_hash text)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.deal_claims
     set status = 'expired'
   where restaurant_id = p_restaurant_id and device_hash = p_device_hash
     and status = 'claimed' and expires_at <= now();
$$;

-- Was the phone's last use here more than 90 days ago (or never)?
create or replace function public.deal_is_first_visit(p_restaurant_id uuid, p_device_hash text, p_except uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select not exists (
    select 1 from public.deal_claims
    where restaurant_id = p_restaurant_id and device_hash = p_device_hash and status = 'redeemed'
      and redeemed_at > now() - make_interval(days => public.deal_rule('first_visit_days'))
      and id is distinct from p_except
  );
$$;

create or replace function public.deal_new_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := extensions.gen_random_bytes(6);
  code text := '';
begin
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
  end loop;
  return code;
end;
$$;

-- Answers:
--   {ok: true, code, expires_at, existing}  a code, new or the open one
--   {ok: false, error}  not_found, paused, ended, not_listed, no_pin,
--                       used_today, no_credit, cap_reached
create or replace function public.claim_deal(p_deal_id uuid, p_device_hash text, p_source text, p_ip_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  d public.deals;
  r public.restaurants;
  c public.deal_claims;
  v_hold int;
  v_available int;
  v_cap int;
  v_code text;
  v_london_today date := (now() at time zone 'Europe/London')::date;
begin
  if p_device_hash is null or p_device_hash !~ '^[0-9a-f]{64}$' or p_source not in ('site', 'qr') then
    raise exception 'bad_request' using errcode = 'P0001';
  end if;

  select * into d from public.deals where id = p_deal_id;
  if d.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Everything below happens one claim at a time for this restaurant.
  select monthly_cap_pence into v_cap from public.deal_accounts where restaurant_id = d.restaurant_id for update;
  select * into d from public.deals where id = p_deal_id;

  if d.status = 'ended' then
    return jsonb_build_object('ok', false, 'error', 'ended');
  elsif d.status = 'paused' then
    return jsonb_build_object('ok', false, 'error', 'paused');
  end if;

  select * into r from public.restaurants where id = d.restaurant_id;
  if r.is_listed is not true or r.merged_into is not null
     or r.catalogue_status::text in ('permanently_closed', 'temporarily_closed') then
    return jsonb_build_object('ok', false, 'error', 'not_listed');
  end if;
  if not exists (select 1 from public.restaurant_staff_pin where restaurant_id = d.restaurant_id) then
    return jsonb_build_object('ok', false, 'error', 'no_pin');
  end if;

  perform public.deal_expire_stale(d.restaurant_id, p_device_hash);

  -- Tapping Claim again shows the same code.
  select * into c from public.deal_claims
  where restaurant_id = d.restaurant_id and device_hash = p_device_hash and status = 'claimed';
  if c.id is not null then
    return jsonb_build_object('ok', true, 'code', c.code, 'expires_at', c.expires_at, 'existing', true);
  end if;

  if exists (
    select 1 from public.deal_claims
    where restaurant_id = d.restaurant_id and device_hash = p_device_hash
      and status = 'redeemed' and redeemed_day = v_london_today
  ) then
    return jsonb_build_object('ok', false, 'error', 'used_today');
  end if;

  v_hold := case
    when p_source = 'site' and public.deal_is_first_visit(d.restaurant_id, p_device_hash, null)
      then public.deal_rule('fee_new')
    else public.deal_rule('fee_repeat')
  end;

  v_available := public.deal_balance(d.restaurant_id) - public.deal_held(d.restaurant_id);
  if v_available < public.deal_rule('fee_new') then
    return jsonb_build_object('ok', false, 'error', 'no_credit');
  end if;
  if coalesce(v_cap, public.deal_rule('cap_default')) - public.deal_month_fees(d.restaurant_id)
       - public.deal_held(d.restaurant_id) < public.deal_rule('fee_new') then
    return jsonb_build_object('ok', false, 'error', 'cap_reached');
  end if;

  for attempt in 1..8 loop
    v_code := public.deal_new_code();
    begin
      insert into public.deal_claims (deal_id, restaurant_id, code, device_hash, source, hold_pence, ip_hash, expires_at)
      values (d.id, d.restaurant_id, v_code, p_device_hash, p_source, v_hold, p_ip_hash,
              now() + make_interval(hours => public.deal_rule('code_hours')))
      returning * into c;
      exit;
    exception when unique_violation then
      -- A code that already exists: draw again. Anything else is real.
      if attempt = 8 then raise; end if;
    end;
  end loop;

  return jsonb_build_object('ok', true, 'code', c.code, 'expires_at', c.expires_at, 'existing', false);
end;
$$;

-- The till. Staff type the PIN on the diner's phone and tap "Bill is at least
-- £X". The only place a fee is ever posted.
--
-- Answers:
--   {ok: true, fee_pence, fee_kind, redeemed_at, already}
--   {ok: false, error}  not_found, wrong_phone, expired, void, outside_hours,
--                       used_today, no_pin, pin_locked (locked_until),
--                       wrong_pin (tries_left, locked_now, voided)
-- Wrong PINs are answered, not raised, so the count is kept.
create or replace function public.redeem_deal(p_code text, p_device_hash text, p_pin text, p_ip_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  c public.deal_claims;
  d public.deals;
  p public.restaurant_staff_pin;
  v_cap int;
  v_now_london timestamp := now() at time zone 'Europe/London';
  v_fee int;
  v_kind text;
  v_room int;
  v_locked_now boolean := false;
begin
  select * into c from public.deal_claims where code = upper(btrim(p_code));
  if c.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Same order as claim_deal: the account first, then the code.
  select monthly_cap_pence into v_cap from public.deal_accounts where restaurant_id = c.restaurant_id for update;
  select * into c from public.deal_claims where id = c.id for update;

  if c.device_hash is distinct from p_device_hash then
    return jsonb_build_object('ok', false, 'error', 'wrong_phone');
  end if;
  if c.status = 'redeemed' then
    return jsonb_build_object('ok', true, 'already', true, 'fee_pence', c.fee_pence, 'fee_kind', c.fee_kind,
                              'redeemed_at', c.redeemed_at);
  end if;
  if c.status = 'void' then
    return jsonb_build_object('ok', false, 'error', 'void');
  end if;
  if c.status = 'expired' or c.expires_at <= now() then
    update public.deal_claims set status = 'expired' where id = c.id and status = 'claimed';
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select * into d from public.deals where id = c.deal_id;
  if d.quiet_days is not null and not (
    extract(isodow from v_now_london)::int = any (d.quiet_days)
    and v_now_london::time >= d.quiet_start and v_now_london::time < d.quiet_end
  ) then
    return jsonb_build_object('ok', false, 'error', 'outside_hours');
  end if;

  if exists (
    select 1 from public.deal_claims
    where restaurant_id = c.restaurant_id and device_hash = c.device_hash
      and status = 'redeemed' and redeemed_day = v_now_london::date
  ) then
    return jsonb_build_object('ok', false, 'error', 'used_today');
  end if;

  select * into p from public.restaurant_staff_pin where restaurant_id = c.restaurant_id for update;
  if p.restaurant_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_pin');
  end if;
  if p.locked_until is not null and p.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'pin_locked', 'locked_until', p.locked_until);
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' or extensions.crypt(p_pin, p.pin_hash) <> p.pin_hash then
    insert into public.deal_pin_attempts (restaurant_id, claim_id, ip_hash, ok) values (c.restaurant_id, c.id, p_ip_hash, false);

    if p.failed_attempts + 1 >= public.deal_rule('pin_tries_before_lock') then
      update public.restaurant_staff_pin
         set failed_attempts = 0,
             locked_until = now() + make_interval(mins => public.deal_rule('pin_lock_minutes'))
       where restaurant_id = c.restaurant_id;
      v_locked_now := true;
    else
      update public.restaurant_staff_pin set failed_attempts = failed_attempts + 1 where restaurant_id = c.restaurant_id;
    end if;

    update public.deal_claims
       set pin_failures = pin_failures + 1,
           status = case when pin_failures + 1 >= public.deal_rule('pin_tries_per_code') then 'void' else status end
     where id = c.id
    returning * into c;

    return jsonb_build_object(
      'ok', false, 'error', 'wrong_pin',
      'tries_left', greatest(public.deal_rule('pin_tries_per_code') - c.pin_failures, 0),
      'voided', c.status = 'void',
      'locked_now', v_locked_now
    );
  end if;

  insert into public.deal_pin_attempts (restaurant_id, claim_id, ip_hash, ok) values (c.restaurant_id, c.id, p_ip_hash, true);
  update public.restaurant_staff_pin set failed_attempts = 0 where restaurant_id = c.restaurant_id;

  v_kind := case
    when c.source = 'site' and public.deal_is_first_visit(c.restaurant_id, c.device_hash, c.id) then 'new'
    else 'repeat'
  end;
  v_fee := case v_kind when 'new' then public.deal_rule('fee_new') else public.deal_rule('fee_repeat') end;
  -- Never more than this code reserved, never past the monthly cap, and never
  -- more than the credit this code's hold was keeping (a Stripe refund can
  -- take credit back in between).
  v_fee := least(v_fee, c.hold_pence);
  v_fee := least(v_fee, greatest(coalesce(v_cap, public.deal_rule('cap_default')) - public.deal_month_fees(c.restaurant_id), 0));
  v_room := public.deal_balance(c.restaurant_id) - (public.deal_held(c.restaurant_id) - c.hold_pence);
  v_fee := least(v_fee, greatest(v_room, 0));

  update public.deal_claims
     set status = 'redeemed', redeemed_at = now(), redeemed_day = v_now_london::date,
         fee_pence = v_fee, fee_kind = v_kind
   where id = c.id
  returning * into c;

  if v_fee > 0 then
    insert into public.deal_ledger (restaurant_id, kind, amount_pence, reference, claim_id)
    values (c.restaurant_id, 'fee', -v_fee, 'fee:' || c.id, c.id);
  end if;

  return jsonb_build_object('ok', true, 'already', false, 'fee_pence', v_fee, 'fee_kind', v_kind,
                            'redeemed_at', c.redeemed_at);
end;
$$;

-- "They didn't honour this." One report per code, from the phone that holds
-- it. Three reports from different phones in 30 days pause the deal until an
-- admin looks.
create or replace function public.report_deal_problem(p_code text, p_device_hash text, p_note text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  c public.deal_claims;
  d public.deals;
  v_reports int;
  v_paused boolean := false;
begin
  select * into c from public.deal_claims where code = upper(btrim(p_code));
  if c.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if c.device_hash is distinct from p_device_hash then
    return jsonb_build_object('ok', false, 'error', 'wrong_phone');
  end if;

  select * into d from public.deals where id = c.deal_id for update;
  select * into c from public.deal_claims where id = c.id for update;

  if c.reported_at is not null then
    return jsonb_build_object('ok', true, 'already', true, 'paused', d.status = 'paused');
  end if;
  if c.status not in ('claimed', 'redeemed', 'expired') then
    return jsonb_build_object('ok', false, 'error', 'void');
  end if;

  update public.deal_claims
     set reported_at = now(), report_note = nullif(left(btrim(coalesce(p_note, '')), 500), '')
   where id = c.id;

  select count(distinct device_hash) into v_reports
  from public.deal_claims
  where deal_id = d.id
    and reported_at > greatest(now() - make_interval(days => public.deal_rule('report_window_days')),
                               coalesce(d.reports_reset_at, '-infinity'));

  if v_reports >= public.deal_rule('reports_to_pause') and d.status = 'live' then
    update public.deals set status = 'paused', paused_reason = 'reports', paused_at = now() where id = d.id;
    v_paused := true;
  end if;

  return jsonb_build_object('ok', true, 'already', false, 'reports', v_reports, 'paused_now', v_paused,
                            'restaurant_id', d.restaurant_id, 'deal_id', d.id);
end;
$$;

-- ============================================================================
-- Money in and out (Stripe webhook, admin)
-- ============================================================================

-- A paid Checkout Session. Posting the same session twice does nothing.
create or replace function public.post_deal_topup(p_restaurant_id uuid, p_session_id text, p_amount_pence int)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_session_id is null or p_session_id !~ '^cs_' or p_amount_pence is null or p_amount_pence <= 0 or p_amount_pence > 100000 then
    raise exception 'bad_request' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    raise exception 'restaurant_not_found' using errcode = 'P0001';
  end if;

  insert into public.deal_accounts (restaurant_id) values (p_restaurant_id) on conflict do nothing;
  perform 1 from public.deal_accounts where restaurant_id = p_restaurant_id for update;

  insert into public.deal_ledger (restaurant_id, kind, amount_pence, reference, stripe_id, note)
  values (p_restaurant_id, 'topup', p_amount_pence, 'topup:' || p_session_id, p_session_id, 'Card top up')
  on conflict (reference) do nothing;

  return jsonb_build_object('ok', true, 'posted', found);
end;
$$;

-- Stripe says how much of a charge has been refunded in total. Post the part
-- not posted yet. Each total posts once, so a retry or an out of order event
-- never takes credit twice.
create or replace function public.post_deal_refund(p_restaurant_id uuid, p_charge_id text, p_refunded_total_pence int)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_already int;
  v_delta int;
begin
  if p_charge_id is null or p_charge_id !~ '^(ch|py)_' or p_refunded_total_pence is null or p_refunded_total_pence <= 0 then
    raise exception 'bad_request' using errcode = 'P0001';
  end if;

  insert into public.deal_accounts (restaurant_id) values (p_restaurant_id) on conflict do nothing;
  perform 1 from public.deal_accounts where restaurant_id = p_restaurant_id for update;

  select coalesce(-sum(amount_pence), 0) into v_already
  from public.deal_ledger where kind = 'refund' and stripe_id = p_charge_id;

  v_delta := p_refunded_total_pence - v_already;
  if v_delta <= 0 then
    return jsonb_build_object('ok', true, 'posted', false, 'delta_pence', 0);
  end if;

  insert into public.deal_ledger (restaurant_id, kind, amount_pence, reference, stripe_id, note)
  values (p_restaurant_id, 'refund', -v_delta, 'refund:' || p_charge_id || ':' || p_refunded_total_pence,
          p_charge_id, 'Card payment refunded')
  on conflict (reference) do nothing;

  return jsonb_build_object('ok', true, 'posted', found, 'delta_pence', case when found then v_delta else 0 end);
end;
$$;

-- An admin adds or takes credit, always with a note. p_token comes from the
-- form, so pressing Save twice posts once.
create or replace function public.adjust_deal_credit(
  p_restaurant_id uuid, p_amount_pence int, p_note text, p_admin_id uuid, p_token uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_amount_pence is null or p_amount_pence = 0 or abs(p_amount_pence) > 100000 then
    raise exception 'amount_range' using errcode = 'P0001', hint = 'Use an amount between -£1000 and £1000, not zero.';
  end if;
  if p_note is null or char_length(btrim(p_note)) < 3 then
    raise exception 'note_required' using errcode = 'P0001', hint = 'Write why.';
  end if;
  if p_token is null then
    raise exception 'bad_request' using errcode = 'P0001';
  end if;

  insert into public.deal_accounts (restaurant_id) values (p_restaurant_id) on conflict do nothing;
  perform 1 from public.deal_accounts where restaurant_id = p_restaurant_id for update;

  insert into public.deal_ledger (restaurant_id, kind, amount_pence, reference, note, created_by)
  values (p_restaurant_id, 'adjustment', p_amount_pence, 'adjust:' || p_token, left(btrim(p_note), 500), p_admin_id)
  on conflict (reference) do nothing;

  return jsonb_build_object('ok', true, 'posted', found);
end;
$$;

-- Within 7 days of a redemption, an admin can give its fee back. Once.
create or replace function public.credit_back_fee(p_claim_id uuid, p_note text, p_admin_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  c public.deal_claims;
begin
  select * into c from public.deal_claims where id = p_claim_id;
  if c.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if p_note is null or char_length(btrim(p_note)) < 3 then
    raise exception 'note_required' using errcode = 'P0001', hint = 'Write why.';
  end if;

  perform 1 from public.deal_accounts where restaurant_id = c.restaurant_id for update;

  if c.status <> 'redeemed' or coalesce(c.fee_pence, 0) = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_fee');
  end if;
  if c.redeemed_at < now() - make_interval(days => public.deal_rule('dispute_days')) then
    return jsonb_build_object('ok', false, 'error', 'too_late');
  end if;

  insert into public.deal_ledger (restaurant_id, kind, amount_pence, reference, claim_id, note, created_by)
  values (c.restaurant_id, 'adjustment', c.fee_pence, 'feeback:' || c.id, c.id, left(btrim(p_note), 500), p_admin_id)
  on conflict (reference) do nothing;

  return jsonb_build_object('ok', true, 'posted', found, 'amount_pence', c.fee_pence);
end;
$$;

-- ============================================================================
-- Tidying, for the daily job
-- ============================================================================

create or replace function public.expire_deal_claims()
returns int
language sql
security invoker
set search_path = public
as $$
  with done as (
    update public.deal_claims set status = 'expired'
    where status = 'claimed' and expires_at <= now()
    returning 1
  )
  select count(*)::int from done;
$$;

-- The phone hash is only needed for 90 days (the £1 rule) and one day (the
-- daily limit). After 400 days it goes. The claim and its fee stay, for the
-- restaurant's records.
create or replace function public.purge_old_deal_devices()
returns int
language sql
security invoker
set search_path = public
as $$
  -- PIN tries only feed the hourly limit and the lock, so 90 days is plenty.
  with done as (
    update public.deal_claims set device_hash = null, ip_hash = null
    where device_hash is not null and created_at < now() - interval '400 days'
    returning 1
  ), tries as (
    delete from public.deal_pin_attempts
    where created_at < now() - interval '90 days'
    returning 1
  )
  select ((select count(*) from done) + (select count(*) from tries))::int;
$$;

-- ============================================================================
-- Access: the service role only
-- ============================================================================

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.deal_rule(text)',
    'public.deal_balance(uuid)',
    'public.deal_held(uuid)',
    'public.deal_month_fees(uuid)',
    'public.deal_state(uuid)',
    'public.set_staff_pin(uuid, text)',
    'public.start_deal(uuid, text, text, int, int, int[], time, time, text, text, uuid)',
    'public.set_deal_status(uuid, text, text)',
    'public.set_deal_cap(uuid, int)',
    'public.deal_expire_stale(uuid, text)',
    'public.deal_is_first_visit(uuid, text, uuid)',
    'public.deal_new_code()',
    'public.claim_deal(uuid, text, text, text)',
    'public.redeem_deal(text, text, text, text)',
    'public.report_deal_problem(text, text, text)',
    'public.post_deal_topup(uuid, text, int)',
    'public.post_deal_refund(uuid, text, int)',
    'public.adjust_deal_credit(uuid, int, text, uuid, uuid)',
    'public.credit_back_fee(uuid, text, uuid)',
    'public.expire_deal_claims()',
    'public.purge_old_deal_devices()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

comment on table public.deals is
  'One simple deal per restaurant (0052). Never touches halal labels, verification or search rank. Service role only.';
comment on table public.deal_ledger is
  'Deal credit, append only. Balance is the sum. Unique reference per row stops double posting (0052). Service role only.';
comment on table public.deal_claims is
  'Diner codes. device_hash is a keyed hash of a random cookie id, cleared after 400 days (0052). Service role only.';
