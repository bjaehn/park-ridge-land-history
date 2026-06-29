-- Add earliest_year_built as a real column on subdivisions so it is fast to
-- read and automatically kept current by triggers whenever parcels are mapped
-- to a subdivision via any of the three paths (PSL, direct FK, or PLR→gis_lots).

-- ─── 1. Column ────────────────────────────────────────────────────────────────

ALTER TABLE subdivisions
  ADD COLUMN IF NOT EXISTS earliest_year_built integer;

-- ─── 2. Backfill from current data ───────────────────────────────────────────

UPDATE subdivisions s
SET earliest_year_built = (
  SELECT MIN(p.year_built)
  FROM parcels p
  WHERE p.year_built IS NOT NULL
    AND p.year_built > 1800
    AND (
      p.pin_normalized IN (
        SELECT psl.pin FROM property_subdivision_links psl
        WHERE psl.subdivision_id = s.id
      )
      OR p.subdivision_id = s.id
      OR p.pin_normalized IN (
        SELECT plr.pin_normalized
        FROM parcel_lot_relationships plr
        JOIN gis_lots gl ON gl.id = plr.lot_id
        WHERE gl.subdivision_id = s.id
      )
    )
);

-- ─── 3. Refresh helper function ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _refresh_subdivision_earliest_built(p_subdivision_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE subdivisions
  SET earliest_year_built = (
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
  WHERE id = p_subdivision_id;
END;
$$;

-- ─── 4. Trigger: property_subdivision_links ───────────────────────────────────

CREATE OR REPLACE FUNCTION _trg_psl_refresh_earliest_built()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD IS NOT NULL THEN
    PERFORM _refresh_subdivision_earliest_built(OLD.subdivision_id);
  END IF;
  IF NEW IS NOT NULL AND (OLD IS NULL OR NEW.subdivision_id != OLD.subdivision_id) THEN
    PERFORM _refresh_subdivision_earliest_built(NEW.subdivision_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_psl_refresh_earliest_built ON property_subdivision_links;
CREATE TRIGGER trg_psl_refresh_earliest_built
AFTER INSERT OR UPDATE OR DELETE ON property_subdivision_links
FOR EACH ROW EXECUTE FUNCTION _trg_psl_refresh_earliest_built();

-- ─── 5. Trigger: parcels (subdivision_id or year_built changed) ───────────────

CREATE OR REPLACE FUNCTION _trg_parcel_refresh_earliest_built()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.subdivision_id IS NOT NULL THEN
    PERFORM _refresh_subdivision_earliest_built(OLD.subdivision_id);
  END IF;
  IF NEW.subdivision_id IS NOT NULL
    AND (OLD.subdivision_id IS DISTINCT FROM NEW.subdivision_id
         OR OLD.year_built IS DISTINCT FROM NEW.year_built) THEN
    PERFORM _refresh_subdivision_earliest_built(NEW.subdivision_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parcel_refresh_earliest_built ON parcels;
CREATE TRIGGER trg_parcel_refresh_earliest_built
AFTER UPDATE OF subdivision_id, year_built ON parcels
FOR EACH ROW
WHEN (OLD.subdivision_id IS DISTINCT FROM NEW.subdivision_id
   OR OLD.year_built IS DISTINCT FROM NEW.year_built)
EXECUTE FUNCTION _trg_parcel_refresh_earliest_built();

-- ─── 6. Trigger: parcel_lot_relationships (PLR → gis_lots → subdivision) ──────

CREATE OR REPLACE FUNCTION _trg_plr_refresh_earliest_built()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub_id uuid;
BEGIN
  SELECT gl.subdivision_id INTO sub_id
  FROM gis_lots gl
  WHERE gl.id = COALESCE(NEW.lot_id, OLD.lot_id);

  IF sub_id IS NOT NULL THEN
    PERFORM _refresh_subdivision_earliest_built(sub_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_plr_refresh_earliest_built ON parcel_lot_relationships;
CREATE TRIGGER trg_plr_refresh_earliest_built
AFTER INSERT OR UPDATE OR DELETE ON parcel_lot_relationships
FOR EACH ROW EXECUTE FUNCTION _trg_plr_refresh_earliest_built();

-- ─── 7. Simplify subdivision_index_view (column is now on the table) ──────────

CREATE OR REPLACE VIEW subdivision_index_view AS
SELECT s.*
FROM subdivisions s;

GRANT SELECT ON subdivision_index_view TO anon, authenticated;
