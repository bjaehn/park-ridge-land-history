-- Consolidation, file C of 3 (final): merge "Resubdivision of Penny and
-- Meachem's Subdivision" into "Park Ridge Resubdivision of Blocks 1, 3, 4
-- and 5 in Brickton", then rename the survivor for clarity.
--
-- "Resubdivision of Penny and Meachem's Subdivision" carries a deed source
-- (source_key='deed-park-ridge-resubdivision'), a historical_subdivision_
-- lineage row (lineage_key='park-ridge-resubdivision-from-brickton-blocks-
-- 1-3-4-35'), and a timeline event that a prior session mistakenly attached
-- here instead of to the entity merged in this file -- merging carries all
-- three onto the correct surviving record automatically via
-- merge_subdivisions' standard reassignment behavior.
--
-- Pre-merge cleanup: that same prior-session mistake also added a "Park
-- Ridge" alias directly on this loser. File B's merge already placed an
-- identical "Park Ridge" alias on the survivor (preserving the OTHER
-- loser's name), so without deleting this one first, the merge's alias
-- reassignment would collide on the (subdivision_id, lower(alias)) unique
-- index and abort the whole merge call.
--
-- subdivision_constituent_lots (a table referenced in migration history as
-- a merge_subdivisions blind spot) does not exist in this database, so no
-- check/fix needed for it. subdivision_geometries, neighborhood_subdivision_
-- links, page_subref_map, recorder_plat_index, and subdivision_lots were
-- all confirmed empty for every entity in this 3-file consolidation.
--
-- Idempotent: guarded on the loser not already being deprecated; alias
-- insert and rename use OR REPLACE-equivalent guards.

DELETE FROM subdivision_aliases
WHERE subdivision_id = '841e5726-85dd-48c9-beac-b025b57a0539'
  AND lower(alias) = 'park ridge';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM subdivisions
    WHERE id = '841e5726-85dd-48c9-beac-b025b57a0539'
      AND status IS DISTINCT FROM 'deprecated'
  ) THEN
    PERFORM merge_subdivisions(
      'c47ee850-d0fc-420f-925f-ee51ab6b4d4a',
      '841e5726-85dd-48c9-beac-b025b57a0539'
    );
  END IF;
END $$;

SELECT _refresh_subdivision_earliest_built('c47ee850-d0fc-420f-925f-ee51ab6b4d4a');
SELECT _refresh_subdivision_earliest_built('841e5726-85dd-48c9-beac-b025b57a0539');

-- Preserve the pre-rename identity as an alias before renaming.
INSERT INTO subdivision_aliases (subdivision_id, alias, alias_type, confidence)
SELECT id, name, 'former_name', 'high'
FROM subdivisions
WHERE id = 'c47ee850-d0fc-420f-925f-ee51ab6b4d4a'
ON CONFLICT (subdivision_id, (lower(alias))) DO NOTHING;

-- Rename only name/display_name/slug -- NOT normalized_name, which this
-- project has already been bitten by once this session (20260707000005's
-- stale `WHERE normalized_name = 'peeny_and_meachems_subdivision'` silently
-- no-op'd after a live rename it didn't know about).
UPDATE subdivisions
SET
  name = 'Park Ridge (Resubdivision of Brickton)',
  display_name = 'Park Ridge (Resubdivision of Brickton)',
  slug = 'park-ridge-resubdivision-of-brickton',
  confidence_level = 'medium',
  historical_summary =
    'Deed language identifies "Park Ridge" as a resubdivision of Blocks 1, 3, 4, and 35 in Brickton (Penny and Meachem''s Subdivision), re-platted under the village''s new name after its 1873 incorporation. This record consolidates three separate AI-deed-analysis stub entities that all described the same real plat under different names ("Park Ridge," "Park Ridge Resubdivision of Blocks 1, 3, 4 and 5 in Brickton," and "Resubdivision of Penny and Meachem''s Subdivision") -- two of the three shared an identical linked parcel (Lot 6, Block 4), and this record already held the deed''s own cited parcel (Lot 19, Block 4) before the consolidation. Whether this resubdivision''s Block 1 portion overlaps with the separately-tracked "Black''s Addition to Park Ridge" (carved from the north 468.6 feet of Block 1 of the same parent plat) is not yet resolved and needs further deed/plat research.',
  confidence_reason =
    'Raised from low ("Created from AI deed analysis; verification required") to medium: a deed independently names this entity ("Park Ridge") and its parent blocks in Brickton, matching two of the three now-consolidated stub records, one of which already held the deed''s own cited parcel (Lot 19, Block 4). No separate recorded plat document number or date for the resubdivision itself has been located, so it stays below the high confidence of the confirmed parent Brickton plat.',
  notes =
    'Consolidated from 3 duplicate AI-deed-analysis entities on ' || to_char(now(), 'YYYY-MM-DD') || '. Block 1 also appears in the separately-tracked "Black''s Addition to Park Ridge" lineage (carved from the north 468.6 feet of Block 1 of Penny and Meachem''s Subdivision directly, not via this resubdivision) -- whether these overlap or are sequential/unrelated treatments of Block 1 is still an open research question.',
  updated_at = now()
WHERE id = 'c47ee850-d0fc-420f-925f-ee51ab6b4d4a';
