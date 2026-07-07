-- Consolidation, file B of 3: merge the "Park Ridge" AI-deed-analysis stub
-- into "Park Ridge Resubdivision of Blocks 1, 3, 4 and 5 in Brickton" --
-- proven to be the same real plat by an exact shared PIN (09264190040000,
-- Lot 6 Block 4) on both records. The latter is kept as the survivor: best
-- name match to the user's deed, and it already holds the deed's own cited
-- parcel (Lot 19, Block 4).
--
-- Pre-merge cleanup: delete Park Ridge's duplicate property_subdivision_links
-- row for PIN 09264190040000 (keep the survivor's copy) to avoid a
-- (pin, subdivision_id) unique constraint collision inside the merge.
--
-- Idempotent: guarded on the loser not already being deprecated.

DELETE FROM property_subdivision_links
WHERE subdivision_id = '9e18d808-38ba-4236-b2af-ae2f11d2ba58'
  AND pin = '09264190040000';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM subdivisions
    WHERE id = '9e18d808-38ba-4236-b2af-ae2f11d2ba58'
      AND status IS DISTINCT FROM 'deprecated'
  ) THEN
    PERFORM merge_subdivisions(
      'c47ee850-d0fc-420f-925f-ee51ab6b4d4a',
      '9e18d808-38ba-4236-b2af-ae2f11d2ba58'
    );
  END IF;
END $$;

-- Force-refresh the cached count rather than trust the trigger (see
-- 20260707000008 for why).
SELECT _refresh_subdivision_earliest_built('c47ee850-d0fc-420f-925f-ee51ab6b4d4a');
SELECT _refresh_subdivision_earliest_built('9e18d808-38ba-4236-b2af-ae2f11d2ba58');
