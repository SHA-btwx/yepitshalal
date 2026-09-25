-- Search was slow because of one missing index. For every result it looks up
-- the place's main photo with `where restaurant_id = r.id and is_primary`, and
-- restaurant_photos had no index on restaurant_id, so each result row scanned
-- the whole table. Measured on 2026-09-25 before this change: a 1 mile search
-- around Whitechapel (491 results) took 677 ms of database time and read 67,366
-- buffers. Applied to production the same day; a 5 mile search there then took
-- 824 ms, against 1,792 ms measured on 2026-09-24.
create index if not exists restaurant_photos_restaurant_id_idx
  on public.restaurant_photos (restaurant_id);

-- The other foreign keys to a restaurant, or to a cuisine, that had no index.
-- Place pages and cuisine pages read through them, and deleting a listing has
-- to find every row that points at it. All small tables, so these build in
-- milliseconds.
create index if not exists restaurant_cuisines_cuisine_id_idx
  on public.restaurant_cuisines (cuisine_id);
create index if not exists restaurant_videos_restaurant_id_idx
  on public.restaurant_videos (restaurant_id);
create index if not exists offers_restaurant_id_idx
  on public.offers (restaurant_id);
create index if not exists restaurant_claims_restaurant_id_idx
  on public.restaurant_claims (restaurant_id);
create index if not exists restaurant_submissions_restaurant_id_idx
  on public.restaurant_submissions (restaurant_id);
create index if not exists verification_requests_restaurant_id_idx
  on public.verification_requests (restaurant_id);
create index if not exists verification_history_restaurant_id_idx
  on public.verification_history (restaurant_id);
create index if not exists catalogue_dedupe_candidates_restaurant_b_idx
  on public.catalogue_dedupe_candidates (restaurant_b);
