-- Coverage counts what search shows, not every row in the table.
--
-- The old view counted any classification other than Unverified as "verified",
-- which is not what it means, and counted rows that are not listed at all. It
-- was also readable by anyone. These views are for the admin coverage page only.

drop view if exists public.catalogue_coverage;

create view public.catalogue_coverage as
select
  coalesce(nullif(upper(regexp_replace(split_part(trim(postcode), ' ', 1), '[0-9].*$', '')), ''), '??') as district,
  coalesce(nullif(upper(split_part(trim(postcode), ' ', 1)), ''), '??') as outward,
  count(*) filter (where merged_into is null) as total,
  count(*) filter (where is_listed) as listed,
  count(*) filter (where is_listed and halal_classification = 'fully_halal') as fully_halal,
  count(*) filter (where is_listed and halal_classification = 'halal_options') as halal_options,
  count(*) filter (where is_listed and halal_classification = 'unverified') as unverified,
  count(*) filter (where merged_into is null and not is_listed and catalogue_status = 'active') as no_evidence,
  count(*) filter (where merged_into is null and catalogue_status = 'needs_review') as needs_review,
  count(*) filter (where merged_into is null and catalogue_status = 'permanently_closed') as closed,
  count(*) filter (where is_listed and brand_id is not null) as chain_branches
from public.restaurants
group by 1, 2;

create or replace view public.catalogue_borough_coverage as
select
  coalesce(borough, 'Unknown') as borough,
  count(*) filter (where merged_into is null) as total,
  count(*) filter (where is_listed) as listed,
  count(*) filter (where is_listed and halal_classification = 'fully_halal') as fully_halal,
  count(*) filter (where is_listed and halal_classification = 'halal_options') as halal_options,
  count(*) filter (where is_listed and halal_classification = 'unverified') as unverified,
  count(*) filter (where merged_into is null and not is_listed and catalogue_status = 'active') as no_evidence
from public.restaurants
group by 1;

revoke all on public.catalogue_coverage from anon, authenticated;
revoke all on public.catalogue_borough_coverage from anon, authenticated;
