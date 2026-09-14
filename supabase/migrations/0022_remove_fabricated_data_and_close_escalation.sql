-- Two things that could not wait for the rest of the trust work.
--
-- 1. Fabricated demo restaurants.
--    Fifteen rows were seeded by hand while the product was being built. They
--    have invented names on real London addresses that belong to other
--    businesses, phone numbers in Ofcom's reserved drama range (020 7946 0xxx),
--    example.com websites, and halal facts claiming HMC or HFA certification
--    and "YepItsHalal Verified" status that never happened. They were the only
--    positively classified listings on the site.
--
--    They are identified by two independent markers at once (added by hand AND
--    a drama-range phone number), and the delete refuses to run unless that
--    matches exactly the fifteen rows audited, so it cannot take a real
--    restaurant with it if run against a database in a different state.
--
-- 2. Any signed-in user could make themselves an admin.
--    users_self_update let a user update their own row with no column limit,
--    including role and is_yep_plus. Sign-in creates accounts on demand, so
--    anyone could sign up, set role = 'admin', and reach every admin action,
--    or grant themselves Yep+. Nothing in the app updates users from the
--    client, so the policy is removed rather than narrowed.

do $$
declare
  n int;
begin
  select count(*) into n
  from public.restaurants
  where data_source = 'manual_admin' and phone like '020 7946 0%';

  if n <> 15 then
    raise exception 'Expected exactly 15 fabricated demo restaurants, found %. Aborting.', n;
  end if;
end $$;

-- Children cascade (photos, cuisines, hours, halal facts, claims, requests).
-- verification_history restricts deletes, and holds no rows for these.
delete from public.restaurants
where data_source = 'manual_admin' and phone like '020 7946 0%';

-- --- Privilege escalation ----------------------------------------------------
drop policy if exists users_self_update on public.users;
revoke insert, update, delete on public.users from anon, authenticated;

-- --- Forged verification requests --------------------------------------------
-- The only legitimate writer is /api/verification-requests, which uses the
-- service role. A direct insert could previously arrive already marked
-- priority (skipping payment), completed, or with an outcome classification.
drop policy if exists vr_insert_any on public.verification_requests;
revoke insert, update, delete on public.verification_requests from anon, authenticated;

-- --- Tables with row level security switched off ------------------------------
-- Both were fully writable by anyone. Neither is read by the browser.
alter table public.uk_bank_holidays enable row level security;
alter table public.daily_free_queue_counter enable row level security;
revoke insert, update, delete on public.uk_bank_holidays from anon, authenticated;
revoke insert, update, delete on public.daily_free_queue_counter from anon, authenticated;

-- --- Anonymous storage uploads -------------------------------------------------
-- Anyone could upload any file into the public restaurant-photos bucket. Admin
-- photo uploads now go through a signed upload URL issued by the server.
drop policy if exists "Anyone can upload restaurant photos" on storage.objects;
