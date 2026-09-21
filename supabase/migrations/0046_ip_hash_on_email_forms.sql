-- Recovered 2026-09-21 from production's migration history
-- (supabase_migrations.schema_migrations, version 20260920151730).
--
-- Applied to the live database on 2026-09-20 but never saved to the repo.
-- Four routes write ip_hash (feedback, language-requests, subscribe, and
-- verification-requests), and before this file only restaurant_submissions
-- had the column in the repo. Exactly what production ran, and idempotent.

-- Every form that takes an email address now records a salted hash of the IP
-- it came from, so one person cannot put a hundred other people's addresses on
-- our lists. The address itself is never stored: the hash is one way and
-- salted, so it cannot be turned back into an IP or matched against one
-- without the salt.
alter table public.subscribers add column if not exists ip_hash text;
alter table public.site_feedback add column if not exists ip_hash text;
alter table public.language_requests add column if not exists ip_hash text;
alter table public.verification_requests add column if not exists ip_hash text;

create index if not exists subscribers_ip_idx on public.subscribers (ip_hash, created_at desc) where ip_hash is not null;
create index if not exists site_feedback_ip_idx on public.site_feedback (ip_hash, created_at desc) where ip_hash is not null;
create index if not exists language_requests_ip_idx on public.language_requests (ip_hash, created_at desc) where ip_hash is not null;
-- verification_requests dates its rows by when they entered the queue.
create index if not exists verification_requests_ip_idx on public.verification_requests (ip_hash, entered_queue_at desc) where ip_hash is not null;

comment on column public.subscribers.ip_hash is
  'Salted SHA-256 of the submitting IP, first 32 chars. Used only to cap how many sign-ups one address can create. Never reversible to an IP.';
