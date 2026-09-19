-- Which places we have actually checked ourselves.
--
-- Today the answer is none of them. Every label on the site rests on what a
-- restaurant publishes about itself, plus open map and hygiene data. That is a
-- reasonable place to start and a bad thing to leave unsaid, so the site now
-- says it, and this column is what lets a listing say the opposite once it is
-- true: somebody from YepItsHalal visited, phoned, or saw the documents.
--
-- Derived, never set by hand: refresh_halal_status() owns it, from the presence
-- of a current yepitshalal_check or a verified certification record.
-- (Applied to the live database; the function body is reproduced there.)

alter table public.restaurants
  add column if not exists checked_by_us boolean not null default false;

comment on column public.restaurants.checked_by_us is
  'We checked this place ourselves: a yepitshalal_check or a certification we verified. Set by refresh_halal_status().';
