-- property_data_quality view (Property Story Sprint, Priority 9).
--
-- Scoped to what actually has a caller: the property page's "Why This
-- Matters" section shows a source-coverage line built from this view. Not
-- building the other 9 recommended views from the brief here -- they'd have
-- no page consuming them yet, which is unfinished architecture per the
-- project's own rules. See docs/data-sources/materialized-views-plan.md for
-- the documented plan for the rest.
--
-- NOT materialized: this project has no pg_cron / scheduled refresh
-- mechanism yet, and admins editing subdivisions/deed notes expect the
-- change to show up on the property page immediately. A stale materialized
-- view would be a regression, not an improvement, until a refresh job exists.

CREATE OR REPLACE VIEW property_data_quality AS
SELECT
  p.pin_normalized,
  (p.deed_notes IS NOT NULL AND btrim(p.deed_notes) != '')      AS has_legal_description,
  EXISTS (SELECT 1 FROM property_subdivision_links l WHERE l.pin = p.pin_normalized) AS has_subdivision_link,
  EXISTS (SELECT 1 FROM historical_subdivision_lineage h WHERE h.pin = p.pin_normalized) AS has_land_lineage,
  (p.year_built IS NOT NULL)                                     AS has_construction_year,
  (
    (CASE WHEN p.deed_notes IS NOT NULL AND btrim(p.deed_notes) != '' THEN 1 ELSE 0 END) +
    (CASE WHEN EXISTS (SELECT 1 FROM property_subdivision_links l WHERE l.pin = p.pin_normalized) THEN 1 ELSE 0 END) +
    (CASE WHEN EXISTS (SELECT 1 FROM historical_subdivision_lineage h WHERE h.pin = p.pin_normalized) THEN 1 ELSE 0 END) +
    (CASE WHEN p.year_built IS NOT NULL THEN 1 ELSE 0 END)
  )::numeric / 4                                                 AS citation_coverage_score
FROM parcels p
WHERE p.pin_normalized IS NOT NULL;

COMMENT ON VIEW property_data_quality IS
  'Per-parcel source coverage used by the property page "Why This Matters" section. citation_coverage_score is the fraction of {legal description, subdivision link, land lineage, construction year} present, 0-1.';
