-- Corrects 20260707000005, which was written against migration-file history
-- that had already drifted from the live table:
--
--   * The real record is "Penny and Meachem's Subdivision"
--     (normalized_name = 'penny_and_meachems_subdivision'), not
--     'peeny_and_meachems_subdivision' as every prior migration file said.
--     Because of that, 20260707000005's plat-confirmation update, alias
--     insert, and research-task closures all matched zero rows.
--   * A "Park Ridge, a resubdivision of Blocks 1, 3, 4, and 35" entity
--     already existed live as "Resubdivision of Penny and Meachem's
--     Subdivision" (id 841e5726...), already linked to 9 real PINs across
--     Blocks 1, 4, and 5. 20260707000005's insert didn't find it (different
--     normalized_name) and created an unwanted duplicate subdivision row
--     instead.
--   * A separate, pre-existing "Brickton" subdivision row and "Penny and
--     Meachem's Subdivision" pointed to each other as parent (a circular
--     parent_subdivision_id reference), unrelated to the deed but discovered
--     while fixing the above. Resolved here by clearing Brickton's parent
--     link, since Brickton reads as the broader townsite and Penny and
--     Meachem's Subdivision as a specific plat within it.
--
-- This migration: (1) reassigns the source/lineage/timeline rows created by
-- 20260707000005 onto the correct real subdivisions, (2) deletes the
-- erroneous duplicate subdivision row, (3) applies the plat confirmation and
-- research-task closures to the real "Penny and Meachem's Subdivision" row,
-- (4) enriches the real, already-linked "Resubdivision of Penny and
-- Meachem's Subdivision" row with the deed's actual name and details instead
-- of leaving a duplicate, and (5) breaks the Brickton/Penny-Meachem's
-- parent cycle. Safe to re-run.

-- ─── Reassign rows created by 20260707000005 onto the real subdivisions ───

update subdivision_sources
set subdivision_id = (select id from subdivisions where normalized_name = 'penny_and_meachems_subdivision')
where source_key = 'deed-brickton-plat-confirmation';

update subdivision_sources
set subdivision_id = (select id from subdivisions where normalized_name = 'resubdivision_of_penny_and_meachem_s_subdivision')
where source_key = 'deed-park-ridge-resubdivision';

update historical_subdivision_lineage
set
  child_subdivision_id = (select id from subdivisions where normalized_name = 'resubdivision_of_penny_and_meachem_s_subdivision'),
  parent_subdivision_id = (select id from subdivisions where normalized_name = 'penny_and_meachems_subdivision')
where lineage_key = 'park-ridge-resubdivision-from-brickton-blocks-1-3-4-35';

update subdivision_timeline_events
set subdivision_id = (select id from subdivisions where normalized_name = 'resubdivision_of_penny_and_meachem_s_subdivision')
where title = 'Deed identifies "Park Ridge" resubdivision of Brickton Blocks 1, 3, 4, and 35';

-- Now safe to remove the erroneous duplicate entity (nothing references it).
delete from subdivisions where normalized_name = 'park_ridge_resubdivision_of_brickton';

-- ─── Apply the plat confirmation to the real Penny and Meachem's row ──────

update subdivisions
set
  recorded_date = '1873-05-31',
  recorded_year = 1873,
  document_number = '106031',
  plat_book = '4',
  plat_page = '85',
  confidence_level = 'high',
  historical_summary =
    'Deed language identifies this plat as "Brickton, being Penny and Meacham''s subdivision" of the Southeast 1/4 of Section 26, Township 41 North, Range 12 East of the Third Principal Meridian, and cites the actual recorded plat: Document No. 106031, Book 4 of Plats, page 85, recorded May 31, 1873 -- five weeks before the village incorporated as Park Ridge on July 4, 1873. This confirms the founding-history narrative already corroborated by the Park Ridge History Center and Encyclopedia of Chicago sources: George Penny and his business partner Robert Meacham platted the townsite first known as Pennyville, then Brickton, which incorporated as Park Ridge in 1873.',
  confidence_reason =
    'The recorded plat that earlier research tasks asked someone to locate has now been cited by a deed: Document No. 106031, Book 4 of Plats, page 85, recorded May 31, 1873. Combined with the two independently published secondary sources (Park Ridge History Center; Encyclopedia of Chicago) already corroborating the Penny/Meacham founding narrative, the subdivision record is raised to high confidence. Independent verification against the actual Cook County plat image has not been performed.',
  updated_at = now()
where normalized_name = 'penny_and_meachems_subdivision';

-- ─── Alias: deed's spelling variant ("Meacham" vs. live "Meachem") ────────

with target as (
  select id from subdivisions where normalized_name = 'penny_and_meachems_subdivision'
), src as (
  select id from subdivision_sources where source_key = 'deed-brickton-plat-confirmation'
)
insert into subdivision_aliases (subdivision_id, alias, alias_type, source_id, confidence)
select target.id, 'Penny and Meacham''s Subdivision', 'historical_variant', src.id, 'high'
from target, src
on conflict (subdivision_id, (lower(alias))) do update set
  alias_type = excluded.alias_type,
  source_id  = excluded.source_id,
  confidence = excluded.confidence;

-- ─── Close the two open research tasks ─────────────────────────────────────

update subdivision_research_tasks t
set
  status = 'completed',
  completed_at = now(),
  notes = 'Resolved by a deed citing the recorded plat: Document No. 106031, Book 4 of Plats, page 85, recorded May 31, 1873, as "Brickton, being Penny and Meacham''s subdivision" of the SE 1/4 of Section 26, Township 41 North, Range 12 East of the Third Principal Meridian.'
from subdivisions s
where t.subdivision_id = s.id
  and s.normalized_name = 'penny_and_meachems_subdivision'
  and t.search_query in (
    'Locate recorded plat for Peeny and Meachem''s Subdivision / Brickton townsite',
    'Locate recorded plat for Peeny and Meachem''s Subdivision'
  )
  and t.status <> 'completed';

-- ─── Enrich the real, already-linked "Park Ridge" resubdivision entity ────

with target as (
  select id from subdivisions where normalized_name = 'resubdivision_of_penny_and_meachem_s_subdivision'
), src as (
  select id from subdivision_sources where source_key = 'deed-park-ridge-resubdivision'
)
insert into subdivision_aliases (subdivision_id, alias, alias_type, source_id, confidence)
select target.id, 'Park Ridge', 'historical_variant', src.id, 'medium'
from target, src
on conflict (subdivision_id, (lower(alias))) do update set
  alias_type = excluded.alias_type,
  source_id  = excluded.source_id,
  confidence = excluded.confidence;

update subdivisions
set
  confidence_level = 'medium',
  historical_summary =
    'A deed identifies this entity by its actual historical name: "Park Ridge," a resubdivision of Blocks 1, 3, 4, and 35 in Brickton (Penny and Meachem''s Subdivision), re-platted under the village''s new name. The deed cites Lot 19 in Block 4 of this resubdivision alongside a separate, un-resubdivided Brickton lot (Lot 15, Block 4), suggesting the resubdivision did not replace every original Brickton lot. This subdivision''s existing linked parcels span Blocks 1, 4, and 5, partially overlapping the deed''s cited Blocks 1, 3, 4, and 35 -- consistent with, though not an exact confirmation of, the same resubdivision.',
  confidence_reason =
    'Raised from low ("created from AI deed analysis; verification required") to medium: a deed now independently names this entity ("Park Ridge") and its parent blocks in Brickton, and its parent link to Penny and Meachem''s Subdivision matches the deed''s own parent citation. No separate recorded plat document number or date for the resubdivision itself has been located, so it stays below the high confidence of the parent Brickton plat.',
  notes =
    'Block 1 also appears in the separately-tracked "Black''s Addition to Park Ridge" lineage (carved from the north 468.6 feet of Block 1 of Penny and Meachem''s Subdivision directly, not via this resubdivision). Whether this "Park Ridge" resubdivision and Black''s Addition represent overlapping, sequential, or unrelated treatments of Block 1 is not yet resolved and needs further deed/plat research.',
  updated_at = now()
where normalized_name = 'resubdivision_of_penny_and_meachem_s_subdivision';

-- ─── Break the pre-existing Brickton / Penny-and-Meachem's parent cycle ───
-- Brickton reads as the broader townsite; Penny and Meachem's Subdivision as
-- a specific plat within it, so Brickton's own parent link is cleared.

update subdivisions
set parent_subdivision_id = null, updated_at = now()
where normalized_name = 'brickton'
  and parent_subdivision_id = (select id from subdivisions where normalized_name = 'penny_and_meachems_subdivision');
