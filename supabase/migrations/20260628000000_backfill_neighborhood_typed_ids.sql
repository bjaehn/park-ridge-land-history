-- Backfill official_planning_neighborhood_id from the legacy neighborhood_id column
-- for parcels that have the old census-tract-based text ID but no typed FK value yet.
--
-- The new typed columns were added in 20260621000000. They are populated via
-- assign_parcels_by_geometry(), which requires a drawn boundary in the admin UI.
-- For the five original neighborhoods (neighborhood:uptown, :central, :northwest,
-- :northeast, :south), geometry assignment may not have been run, leaving the new
-- columns NULL even though parcels.neighborhood_id is already set.
--
-- This migration copies the old value to official_planning_neighborhood_id where:
--   1. neighborhood_id is set (old value exists)
--   2. official_planning_neighborhood_id is NULL (not yet assigned by geometry)
--   3. the neighborhood_id value actually exists in the neighborhoods table
--      (FK integrity guard; values not in that table are silently skipped)

UPDATE parcels
SET official_planning_neighborhood_id = neighborhood_id
WHERE neighborhood_id IS NOT NULL
  AND official_planning_neighborhood_id IS NULL
  AND neighborhood_id IN (
    SELECT id FROM neighborhoods WHERE neighborhood_type = 'official_planning'
  );
