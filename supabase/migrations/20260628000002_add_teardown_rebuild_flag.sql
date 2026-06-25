-- Adds teardown/rebuild detection columns to parcels.
--
-- Detection logic:
--   Medium confidence: year_built >= 1990 AND first_assessed_year IS NOT NULL
--                      AND (year_built - first_assessed_year) >= 20
--   High confidence:   medium PLUS a permit record on that PIN whose description
--                      contains new-construction keywords

-- ── 1. Add columns ────────────────────────────────────────────────────────────

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS is_teardown_rebuild  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS teardown_confidence  TEXT
    CHECK (teardown_confidence IN ('high', 'medium'));

CREATE INDEX IF NOT EXISTS idx_parcels_teardown_rebuild
  ON parcels (is_teardown_rebuild) WHERE is_teardown_rebuild = TRUE;

-- ── 2. Populate medium confidence (gap logic) ─────────────────────────────────

UPDATE parcels
SET
  is_teardown_rebuild = TRUE,
  teardown_confidence = 'medium'
WHERE year_built >= 1990
  AND first_assessed_year IS NOT NULL
  AND (year_built - first_assessed_year) >= 20;

-- ── 3. Upgrade to high confidence where a new-build permit exists ──────────────

UPDATE parcels p
SET teardown_confidence = 'high'
WHERE p.is_teardown_rebuild = TRUE
  AND EXISTS (
    SELECT 1 FROM permits pm
    WHERE pm.pin = p.pin_normalized
      AND (
        pm.description ILIKE '%new house%'
        OR pm.description ILIKE '%new build%'
        OR pm.description ILIKE '%new construction%'
        OR pm.description ILIKE '%new home%'
        OR pm.description ILIKE '%new single%'
      )
  );
