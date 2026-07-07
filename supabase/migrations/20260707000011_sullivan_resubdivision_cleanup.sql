-- Follow-up to the Brickton/Park Ridge consolidation: investigated "William
-- Sullivan's Resubdivision" (flagged as out of scope there). It is NOT a
-- duplicate -- it's a legitimate, already well-documented third-generation
-- resubdivision: Brickton (1873) -> Park Ridge resubdivision of Blocks 1,
-- 3, 4, and 5 -> William Sullivan's Resubdivision, which combined a piece
-- of Lot 19/Block 4 (Park Ridge) with a 19-foot sliver of Lot 15/Block 4
-- (still original Brickton) into one new lot. That lot became a separate
-- tax parcel with a house built in 2007: 225 Prospect Ave. Its older
-- neighbor on the remainder of the original Lot 19 (built 1874) is 231
-- Prospect Ave.
--
-- Two cleanup items surfaced:
--
-- 1. Both 231 and 225 Prospect Ave were ALSO directly linked to "Penny and
--    Meachem's Subdivision" (the top-level parent plat) under a coarse
--    "Lot 15, Block 4" claim, duplicating/conflicting with their far more
--    precise links to Park Ridge Resubdivision and William Sullivan's
--    Resubdivision respectively. Every other entity checked (e.g. Black's
--    Addition to Park Ridge) follows a one-parcel-one-most-specific-link
--    pattern with no such redundancy -- these two coarse links are removed.
--
-- 2. The existing historical_subdivision_lineage row for William Sullivan's
--    Resubdivision (created before this session, high confidence, correctly
--    FK'd to the Park Ridge entity via parent_subdivision_id) has a
--    denormalized parent_subdivision TEXT snapshot that still reads the
--    pre-rename name from the prior consolidation migration
--    (20260707000010). Updated to match.
--
-- Idempotent: deletes are no-ops if already applied; the lineage text
-- update is a plain UPDATE keyed by lineage_key.

DELETE FROM property_subdivision_links
WHERE subdivision_id = 'da1e3035-8bef-4733-baee-cc0abb71ba57'
  AND pin IN ('09264180170000', '09264180180000')
  AND lot_number = '15'
  AND block_number = '4';

UPDATE historical_subdivision_lineage
SET
  parent_subdivision = 'Park Ridge (Resubdivision of Brickton)',
  plain_english_summary = 'Lot 2 in William Sullivan''s Resubdivision was created from Lot 19, Block 4 in the Park Ridge (Resubdivision of Brickton).',
  development_chain = (
    SELECT jsonb_agg(
      CASE
        WHEN elem = 'Park Ridge Resubdivision of Blocks 1, 3, 4 and 5 in Brickton'
          THEN to_jsonb('Park Ridge (Resubdivision of Brickton)'::text)
        ELSE to_jsonb(elem)
      END
    )
    FROM jsonb_array_elements_text(development_chain) AS elem
  ),
  updated_at = now()
WHERE lineage_key = 'william-sullivan-s-resubdivision--from--park-ridge-resubdivision-of-blocks-1-3-4-and-5-in-brickton--lot-2';

SELECT _refresh_subdivision_earliest_built('da1e3035-8bef-4733-baee-cc0abb71ba57');
