-- Add teardown/rebuild detection columns to parcels.
-- is_teardown_rebuild: true when build year >= 1990 and (year_built - first_assessed_year) >= 20
-- teardown_confidence: 'medium' or 'high'

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS is_teardown_rebuild boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS teardown_confidence  text;

-- Populate based on detection logic
UPDATE parcels
SET
  is_teardown_rebuild = true,
  teardown_confidence = 'medium'
WHERE
  year_built >= 1990
  AND first_assessed_year IS NOT NULL
  AND (year_built - first_assessed_year) >= 20
  AND (is_teardown_rebuild IS NULL OR is_teardown_rebuild = false);
