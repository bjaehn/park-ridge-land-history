-- Rebuild subdivision_index_view with the same deed-priority logic used in
-- highlight_parcels and fetchSubdivisionParcels: deed_legal_description PSL links
-- are authoritative; fallback paths (direct FK, PLR) only apply to parcels with
-- no deed verification anywhere.

CREATE OR REPLACE VIEW subdivision_index_view AS
SELECT
  s.*,
  (
    SELECT MIN(p.year_built)
    FROM parcels p
    WHERE p.year_built IS NOT NULL
      AND p.year_built > 1800
      AND (
        -- Deed-verified to this subdivision (authoritative)
        p.pin_normalized IN (
          SELECT psl.pin
          FROM property_subdivision_links psl
          WHERE psl.subdivision_id = s.id
            AND psl.match_method = 'deed_legal_description'
        )
        OR (
          -- Fallback: parcel has no deed verification anywhere
          p.pin_normalized NOT IN (
            SELECT psl2.pin
            FROM property_subdivision_links psl2
            WHERE psl2.match_method = 'deed_legal_description'
          )
          AND (
            p.pin_normalized IN (
              SELECT psl3.pin
              FROM property_subdivision_links psl3
              WHERE psl3.subdivision_id = s.id
            )
            OR p.subdivision_id = s.id
            OR p.pin_normalized IN (
              SELECT plr.pin_normalized
              FROM parcel_lot_relationships plr
              JOIN gis_lots gl ON gl.id = plr.lot_id
              WHERE gl.subdivision_id = s.id
            )
          )
        )
      )
  ) AS earliest_year_built
FROM subdivisions s;

GRANT SELECT ON subdivision_index_view TO anon, authenticated;
