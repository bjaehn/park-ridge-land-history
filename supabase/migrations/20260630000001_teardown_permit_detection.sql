-- Upgrade teardown detection to use explicit permit descriptions.
--
-- The year-built heuristic in 20260628000002 catches medium-confidence cases.
-- This migration adds high-confidence detection from actual permit records.
--
-- Pattern 1 - deconstruction or demolition of a residence:
--   "DECONSTRUCTION OF SINGLE FAMILY RESIDENCE"
--   "DEMOLITION OF SINGLE FAMILY RESIDENCE"
--
-- Pattern 2 - new single-family construction with new utility hookups,
-- which signals ground-up replacement rather than renovation:
--   "NEW TWO STORY SINGLE FAMILY RESIDENCE WITH NEW UTILITY CONNECTIONS"
--
-- Both patterns are matched case-insensitively against permits.description.
-- The UPDATE runs on all parcels, not just ones already flagged medium, so
-- permit-confirmed teardowns are caught even when the year-built gap is small.

UPDATE parcels p
SET
  is_teardown_rebuild = true,
  teardown_confidence  = 'high'
WHERE
  teardown_confidence IS DISTINCT FROM 'high'
  AND EXISTS (
    SELECT 1
    FROM   permits pm
    WHERE  pm.pin = p.pin_normalized
      AND  (
               pm.description ILIKE '%deconstruction%residence%'
            OR pm.description ILIKE '%deconstruction%single family%'
            OR pm.description ILIKE '%demolition%residence%'
            OR pm.description ILIKE '%demolition%single family%'
            OR (
                   pm.description ILIKE '%new%single family%'
               AND pm.description ILIKE '%new utility%'
            )
          )
  );
