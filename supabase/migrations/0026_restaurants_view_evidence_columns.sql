-- restaurants_with_coords was created from r.*, which Postgres expands into a
-- fixed column list at creation time, so it never saw the evidence columns
-- added in 0023. Columns are appended (never reordered) so the view can be
-- replaced in place without disturbing anything that depends on it.

create or replace view public.restaurants_with_coords as
select
  r.id, r.owner_id, r.name, r.slug, r.description, r.location, r.address, r.postcode,
  r.phone, r.email, r.website_url, r.menu_url, r.halal_classification, r.data_source,
  r.source_reference_id, r.source_attribution_text, r.created_at, r.updated_at,
  r.brand_id, r.branch_label, r.catalogue_status, r.last_checked_at,
  st_y(r.location::geometry) as lat,
  st_x(r.location::geometry) as lng,
  r.merged_into,
  r.is_listed,
  r.halal_evidence_strength,
  r.halal_summary,
  r.halal_checked_at,
  r.socials,
  r.borough,
  r.cuisine_label
from public.restaurants r;
