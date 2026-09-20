-- People who asked to hear when we reach their city.
--
-- The site covers London and says so everywhere. The obvious next question a
-- visitor from Manchester or Toronto has is "when me?", and until now there
-- was nowhere to put that. This is that place.
--
-- Two things are deliberate. The wanted city is free text, because a dropdown
-- of cities we have not researched would be us guessing on their behalf, and
-- "anywhere in Scotland honestly" is a more useful answer than a coordinate.
-- And every row carries an unsubscribe token from the moment it exists, so
-- there is never a period where somebody is on a list they cannot get off.
--
-- Nobody can read this back out: writes go through the API route with the
-- service role, reads are admin only.
-- (Applied to the live database.)

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  wanted_city text,
  source text,
  locale text not null default 'en',
  status text not null default 'active' check (status in ('active', 'unsubscribed', 'bounced', 'spam')),
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- The address is lowercased before it is stored, so uniqueness lives on the
-- column itself: an index on lower(email) cannot be an ON CONFLICT target.
alter table public.subscribers add constraint subscribers_email_key unique (email);
create index if not exists subscribers_created_idx on public.subscribers (created_at desc);
create index if not exists subscribers_city_idx on public.subscribers (lower(wanted_city)) where wanted_city is not null;
create unique index if not exists subscribers_token_key on public.subscribers (unsubscribe_token);

alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;

comment on table public.subscribers is
  'People who asked to hear when we reach a new city or ship something. Written only by the API route with the service role; never readable by anon or authenticated. One row per email address.';
