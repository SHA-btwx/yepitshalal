-- What people tell us about the site itself.
--
-- Separate from restaurant submissions, which are about a place. This is about
-- YepItsHalal: what is confusing, what is broken, what is missing. An email
-- address is required because feedback we cannot reply to is a dead end for
-- both sides, and because it is the cheapest spam filter there is.
--
-- Nobody can read this back out. Writes go through the API route with the
-- service role; reads are admin only.
-- (Applied to the live database.)

create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  message text not null,
  page_url text,
  status text not null default 'new' check (status in ('new', 'read', 'actioned', 'spam')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists site_feedback_created_idx on public.site_feedback (created_at desc);
create index if not exists site_feedback_status_idx on public.site_feedback (status);

alter table public.site_feedback enable row level security;
revoke all on public.site_feedback from anon, authenticated;
