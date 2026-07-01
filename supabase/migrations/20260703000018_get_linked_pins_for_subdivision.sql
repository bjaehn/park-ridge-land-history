-- The admin subdivision-map page's highlight layer was drawn from
-- fetchPinsForSubdivision() (app/admin/_actions/subdivisionMap.ts), which
-- only ever queried property_subdivision_links -- so it drew 2 parcels for
-- Arthur Dunas Subdivision while the newly-fixed count label correctly said
-- "144 linked". Same bug class as the count mismatch, different code path.
--
-- Rather than duplicate the 3-source union a third time in application
-- code, expose it as one RPC using the exact same logic as
-- _refresh_subdivision_earliest_built (20260703000017), so the map's
-- highlighted PINs and the linked_parcel_count number can never drift apart
-- again -- one definition, two callers.

CREATE OR REPLACE FUNCTION get_linked_pins_for_subdivision(p_subdivision_id uuid)
RETURNS TABLE (pin text)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT p.pin_normalized AS pin
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
    );
$$;
