-- Fixes the "Arthur Dunas Subdivision shows 144 on the map page but 2 on
-- the list page" bug report.
--
-- Root cause: /admin/subdivision-map read subdivisions.parcel_count, a
-- STALE denormalized column set ONCE by
-- 20260626000001_cleanup_property_events.sql as `COUNT(*) FROM gis_lots`
-- (raw historical platted-lot rows, not distinct modern parcels) and never
-- refreshed since. /admin/subdivisions instead reads
-- subdivision_property_counts (COUNT DISTINCT pin from
-- property_subdivision_links only, i.e. deed-verified parcels). Both
-- numbers are individually real -- they measure different things -- but
-- neither page labeled which was which, so the mismatch read as broken data.
--
-- 20260703000003_earliest_year_built_column.sql already solved exactly this
-- class of problem for earliest_year_built: a real, trigger-maintained
-- column on subdivisions, kept current via triggers on
-- property_subdivision_links / parcels / parcel_lot_relationships, using
-- the same 3-source union CLAUDE.md documents for highlight_parcels. This
-- migration adds linked_parcel_count the same way, reusing those same
-- triggers (extending _refresh_subdivision_earliest_built rather than
-- adding new ones) instead of a live correlated subquery in the view --
-- which matters here because that view has already needed a timeout fix
-- once (20260703000002_fix_subdivision_index_view_timeout.sql).
--
-- subdivision_property_counts is NOT touched -- it's correctly scoped to
-- deed-verified counts and other things depend on that exact meaning (e.g.
-- find_research_candidates). linked_parcel_count is a second, separate,
-- clearly-named metric: "how many modern parcels are linked by ANY method
-- (deed text, admin-assigned FK, or GIS-lot spatial match), not just
-- deed-verified ones."

ALTER TABLE subdivisions ADD COLUMN IF NOT EXISTS linked_parcel_count integer;

CREATE OR REPLACE FUNCTION _refresh_subdivision_earliest_built(p_subdivision_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE subdivisions
  SET
    earliest_year_built = COALESCE(
      -- Priority 1: deed-verified links only
      (
        SELECT MIN(p.year_built)
        FROM parcels p
        JOIN property_subdivision_links psl ON psl.pin = p.pin_normalized
        WHERE psl.subdivision_id = p_subdivision_id
          AND psl.match_method = 'deed_legal_description'
          AND p.year_built IS NOT NULL
          AND p.year_built > 1800
      ),
      -- Priority 2: all linked properties (any match method, direct FK, or GIS lots)
      (
        SELECT MIN(p.year_built)
        FROM parcels p
        WHERE p.year_built IS NOT NULL
          AND p.year_built > 1800
          AND (
            p.pin_normalized IN (
              SELECT psl.pin FROM property_subdivision_links psl
              WHERE psl.subdivision_id = p_subdivision_id
            )
            OR p.subdivision_id = p_subdivision_id
            OR p.pin_normalized IN (
              SELECT plr.pin_normalized
              FROM parcel_lot_relationships plr
              JOIN gis_lots gl ON gl.id = plr.lot_id
              WHERE gl.subdivision_id = p_subdivision_id
            )
          )
      )
    ),
    linked_parcel_count = (
      SELECT count(DISTINCT p.pin_normalized)
      FROM parcels p
      WHERE
        p.pin_normalized IN (
          SELECT psl.pin FROM property_subdivision_links psl
          WHERE psl.subdivision_id = p_subdivision_id
        )
        OR p.subdivision_id = p_subdivision_id
        OR p.pin_normalized IN (
          SELECT plr.pin_normalized
          FROM parcel_lot_relationships plr
          JOIN gis_lots gl ON gl.id = plr.lot_id
          WHERE gl.subdivision_id = p_subdivision_id
        )
    )
  WHERE id = p_subdivision_id;
END;
$$;

-- Existing triggers on property_subdivision_links / parcels /
-- parcel_lot_relationships already call this function on every relevant
-- change (see 20260703000003 and 20260703000009) -- no new triggers needed,
-- they now keep linked_parcel_count current for free.

-- Backfill every subdivision once with the new column.
DO $$
DECLARE
  sub_id uuid;
BEGIN
  FOR sub_id IN SELECT id FROM subdivisions LOOP
    PERFORM _refresh_subdivision_earliest_built(sub_id);
  END LOOP;
END;
$$;

-- subdivision_index_view is `SELECT s.* FROM subdivisions s`. Postgres
-- freezes a view's `*` expansion into a fixed column list at CREATE/REPLACE
-- time -- it does not pick up new base-table columns automatically, so the
-- view needs an explicit refresh to expose linked_parcel_count. This is a
-- pure trailing-column re-expansion (ALTER TABLE ADD COLUMN always appends),
-- so it doesn't hit the "can't reorder existing view columns" restriction.
CREATE OR REPLACE VIEW subdivision_index_view AS
SELECT s.*
FROM subdivisions s;

GRANT SELECT ON subdivision_index_view TO anon, authenticated;
