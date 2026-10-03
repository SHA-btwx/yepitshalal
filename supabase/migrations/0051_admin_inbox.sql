-- 0051_admin_inbox
--
-- The admin inbox: one list of everything people send through the site's
-- forms, and a record of every reply sent back from it.
--
-- The messages themselves stay where they already live (site_feedback,
-- subscribers, language_requests, restaurant_submissions,
-- verification_requests, restaurant_ownership_claims, founder_applications).
-- These two tables only add what the inbox needs on top of them:
--
--   admin_inbox_state  whether a message has been opened, and whether it has
--                      been put away. One row per message, created the first
--                      time either happens, so a message with no row is new.
--
--   admin_replies      each answer: the email sent through Resend from the
--                      same yepitshalal.com address the message went to, or a
--                      note that it was answered another way (a Founder is
--                      reached on Instagram or by phone, never by email).
--
-- Nothing here is readable from a browser. Row level security is on with no
-- policies and anon and authenticated lose every grant, so only the service
-- role can touch either table, and the admin pages only use it after
-- requireAdmin().
--
-- Retention: a reply carries the person's address and our words to them, so
-- it is kept for the same two years /privacy gives "What you write to us".
-- purge_expired_personal_data() (0047) is not applied yet; when it is, add
--   delete from public.admin_replies where created_at < now() - interval '2 years';
-- to it. admin_inbox_state holds ids and timestamps only, nothing personal.

create table if not exists public.admin_inbox_state (
  source text not null
    check (source in ('feedback', 'where_next', 'language', 'submission', 'verification', 'ownership', 'founder')),
  source_id uuid not null,
  read_at timestamptz,
  archived_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (source, source_id)
);

create table if not exists public.admin_replies (
  id uuid primary key default gen_random_uuid(),
  source text not null
    check (source in ('feedback', 'where_next', 'language', 'submission', 'verification', 'ownership', 'founder')),
  source_id uuid not null,
  channel text not null default 'email'
    check (channel in ('email', 'instagram', 'phone', 'other')),
  -- Email replies only. The from address is always one of hello@, info@ or
  -- help@yepitshalal.com, chosen by the server from the message, never typed.
  from_address text,
  to_address text,
  subject text,
  body text,
  -- Resend's id for the email, to look it up in Resend's logs.
  resend_id text,
  sent_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (channel <> 'email' or (from_address is not null and to_address is not null and resend_id is not null))
);

create index if not exists admin_replies_by_message
  on public.admin_replies (source, source_id, created_at desc);

alter table public.admin_inbox_state enable row level security;
alter table public.admin_replies enable row level security;

revoke all on table public.admin_inbox_state from anon, authenticated;
revoke all on table public.admin_replies from anon, authenticated;

comment on table public.admin_inbox_state is
  'Read and archived marks for the admin inbox. Service role only.';
comment on table public.admin_replies is
  'Replies sent from the admin inbox, and answers given another way. Service role only. Two year retention, see 0051.';

-- ---------------------------------------------------------------------------
-- The first admin, without a round trip.
--
-- public.users gets its row from handle_new_user() the first time someone
-- signs in. An address listed here becomes an admin the moment that row is
-- made, and the invite is used up. The address itself is never committed to
-- the repo: it is inserted by hand when this migration is applied, with
--   insert into public.admin_invites (email) values ('...');
--   update public.users set role = 'admin' where lower(email) = '...';
-- (the update covers someone who had already signed in).
-- ---------------------------------------------------------------------------

create table if not exists public.admin_invites (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.admin_invites enable row level security;
revoke all on table public.admin_invites from anon, authenticated;

create or replace function public.apply_admin_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_invites where email = lower(new.email);
  if found then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

revoke all on function public.apply_admin_invite() from public, anon, authenticated;

drop trigger if exists users_apply_admin_invite on public.users;
create trigger users_apply_admin_invite
  before insert on public.users
  for each row execute function public.apply_admin_invite();

comment on table public.admin_invites is
  'Addresses that become admins on their first sign in. Service role only. Used up on use.';
