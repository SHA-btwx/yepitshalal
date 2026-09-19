-- When someone started supporting the site.
--
-- The account page says "Supporter since <month>", so the date has to be a
-- stored fact rather than something inferred from the renewal date. Stripe is
-- the source of truth for billing; this is only what we show back to the person.

alter table public.subscriptions
  add column if not exists created_at timestamptz not null default now();
