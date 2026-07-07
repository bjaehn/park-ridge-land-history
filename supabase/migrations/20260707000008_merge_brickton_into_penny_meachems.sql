-- Consolidation, file A of 3: merge the bare "Brickton" duplicate stub into
-- "Penny and Meachem's Subdivision" (the well-evidenced canonical record —
-- confirmed plat citation, resolved research tasks, existing aliases). The
-- deed itself says it plainly: "Brickton, being Penny and Meacham's
-- subdivision" -- one 1873 plat, two names. Brickton has zero aliases /
-- sources / timeline events / research tasks of its own.
--
-- Uses the existing merge_subdivisions(winner_id, loser_id) RPC
-- (20260703000012_subdivision_duplicate_detection.sql) rather than
-- hand-rolled merge SQL.
--
-- Pre-merge cleanup: Brickton's property_subdivision_links row for PIN
-- 09264180180000 (Lot 15, Block 4 -- literally the user's deed's own
-- "Parcel 2") is an exact duplicate of a row already on Penny and Meachem's
-- Subdivision. Deleting it first avoids a (pin, subdivision_id) unique
-- constraint collision inside the merge.
--
-- Post-merge fix, not optional: Penny and Meachem's Subdivision's own
-- parent_subdivision_id currently points at Brickton (a leftover circular
-- reference only half-fixed in a prior session). merge_subdivisions'
-- blanket `UPDATE subdivisions SET parent_subdivision_id = winner_id WHERE
-- parent_subdivision_id = loser_id` will match the winner's own row too,
-- leaving it self-referencing (id = parent_subdivision_id) rather than
-- pointing at the old loser id -- so this must be nulled unconditionally
-- afterward, not checked against the old id.
--
-- Idempotent: safe to re-run (deletes/updates are no-ops once applied;
-- merge_subdivisions itself would error on a second call since the loser
-- would already be deprecated with no matching links left to move, so this
-- migration guards the merge call on the loser not already being merged).

DELETE FROM property_subdivision_links
WHERE subdivision_id = '7ac50b54-fad0-4e63-9fff-81c23781e845'
  AND pin = '09264180180000';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM subdivisions
    WHERE id = '7ac50b54-fad0-4e63-9fff-81c23781e845'
      AND status IS DISTINCT FROM 'deprecated'
  ) THEN
    PERFORM merge_subdivisions(
      'da1e3035-8bef-4733-baee-cc0abb71ba57',
      '7ac50b54-fad0-4e63-9fff-81c23781e845'
    );
  END IF;
END $$;

UPDATE subdivisions
SET parent_subdivision_id = NULL, updated_at = now()
WHERE id = 'da1e3035-8bef-4733-baee-cc0abb71ba57'
  AND parent_subdivision_id IS NOT NULL;

-- linked_parcel_count is trigger-maintained but has now gone stale on a
-- merge's bulk UPDATE for the third time this project (see 20260707000002
-- and 20260707000007) -- confirmed live: real union count was 7, cache
-- still read 5 immediately after the merge above. Force a refresh rather
-- than trust the trigger.
SELECT _refresh_subdivision_earliest_built('da1e3035-8bef-4733-baee-cc0abb71ba57');
SELECT _refresh_subdivision_earliest_built('7ac50b54-fad0-4e63-9fff-81c23781e845');
