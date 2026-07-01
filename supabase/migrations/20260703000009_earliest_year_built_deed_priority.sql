-- earliest_year_built: source deed-verified properties first, then fall back to
-- all linked properties (admin-assigned, GIS lots, direct subdivision_id FK).
--
-- Priority 1: MIN(year_built) from PSL rows with match_method = 'deed_legal_description'
-- Priority 2: MIN(year_built) from all properties linked to the subdivision by any path

CREATE OR REPLACE FUNCTION _refresh_subdivision_earliest_built(p_subdivision_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE subdivisions
  SET earliest_year_built = COALESCE(
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
  )
  WHERE id = p_subdivision_id;
END;
$$;

-- Re-backfill all subdivisions with the new priority logic.
DO $$
DECLARE
  sub_id uuid;
BEGIN
  FOR sub_id IN SELECT id FROM subdivisions LOOP
    PERFORM _refresh_subdivision_earliest_built(sub_id);
  END LOOP;
END;
$$;
