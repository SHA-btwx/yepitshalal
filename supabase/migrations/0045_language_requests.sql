-- Recovered 2026-09-21 from production's migration history
-- (supabase_migrations.schema_migrations, version 20260920151221).
--
-- Applied to the live database on 2026-09-20 but never saved to the repo, so
-- until this file existed the repo had no definition of this table at all,
-- even though app/api/language-requests/route.ts writes to it. Exactly what
-- production ran, and idempotent.

create table if not exists public.language_requests (
  id uuid primary key default gen_random_uuid(),
  -- The canonical language chosen from the list, or whatever was typed when
  -- nothing matched. Same shape as the city waitlist, for the same reason:
  -- "farsi", "Persian" and "persian" have to end up as one row to be counted.
  language text not null,
  language_code text,
  -- Optional. Somebody voting for a language should not have to hand over an
  -- address to do it; when they do, we can tell them it is ready.
  email text,
  -- Which page and which language they were reading when they asked.
  source text,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

create index if not exists language_requests_code_idx on public.language_requests (language_code) where language_code is not null;
create index if not exists language_requests_created_idx on public.language_requests (created_at desc);

alter table public.language_requests enable row level security;
revoke all on public.language_requests from anon, authenticated;

comment on table public.language_requests is
  'Votes for a language YepItsHalal is not in yet. Written only by the API route with the service role; never readable by anon or authenticated.';
