-- Recovered 2026-09-21 from production's migration history
-- (supabase_migrations.schema_migrations, version 20260920143418).
--
-- Applied to the live database on 2026-09-20 but never saved to the repo.
-- Exactly what production ran, and idempotent.

alter table public.subscribers
  add column if not exists wanted_place_label text,
  add column if not exists wanted_region text,
  add column if not exists wanted_country text,
  add column if not exists wanted_country_code text,
  add column if not exists wanted_place_kind text,
  add column if not exists wanted_place_id text,
  add column if not exists wanted_lat double precision,
  add column if not exists wanted_lng double precision;

comment on column public.subscribers.wanted_city is
  'The canonical place name as chosen from the suggestions, or whatever was typed when nothing was chosen.';
comment on column public.subscribers.wanted_place_id is
  'OpenStreetMap type/id of the chosen place, e.g. R/146656. Null when the person typed free text instead of picking.';

create index if not exists subscribers_place_idx on public.subscribers (wanted_place_id) where wanted_place_id is not null;
create index if not exists subscribers_country_idx on public.subscribers (wanted_country_code) where wanted_country_code is not null;
