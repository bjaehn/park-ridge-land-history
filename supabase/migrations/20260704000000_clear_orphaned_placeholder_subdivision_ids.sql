-- Clears parcels.subdivision_id where it references no real subdivisions row.
--
-- Root cause: an old bulk-ingestion script (subdivision_match_method =
-- 'assessor_subdivision_id') grouped parcels by Cook County Assessor area code
-- and stamped each group with a deterministic placeholder UUID, but never
-- created a matching subdivisions record for most groups. Of 666 distinct
-- subdivision_id values written this way, 665 point at nothing -- only
-- Arcadia Gardens was ever promoted to a real subdivisions row.
--
-- This silently defeated the plat-mapping page's bulk-link button
-- (bulkLinkParcelsByPageCodes / CandidatePropertiesPanel), which both filter
-- on `subdivision_id IS NULL` to find parcels safe to bulk-assign -- with
-- 71% of Park Ridge parcels already holding a fake subdivision_id, that
-- filter matched ~0 rows for almost any GIS page code.
--
-- Only rows written by that one low-confidence script are affected: every
-- orphaned subdivision_id has subdivision_confidence = 'low' and
-- subdivision_match_method = 'assessor_subdivision_id'. Deed-verified and
-- admin-confirmed links always point at a real subdivisions.id and are
-- untouched by the NOT EXISTS check below.

UPDATE parcels p
SET subdivision_id = NULL,
    subdivision_match_method = NULL,
    subdivision_confidence = NULL,
    subdivision_source = NULL
WHERE p.subdivision_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM subdivisions s WHERE s.id = p.subdivision_id);
