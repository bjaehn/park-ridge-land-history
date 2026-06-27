-- View that extends subdivisions with a live-computed earliest_year_built.
-- Unions all three ways a parcel can belong to a subdivision so the result
-- stays accurate when new properties are linked via any path.

CREATE OR REPLACE VIEW subdivision_index_view AS
SELECT
  s.*,
  (
    SELECT MIN(p.year_built)
    FROM parcels p
    WHERE p.year_built IS NOT NULL
      AND p.year_built > 1800
      AND (
        p.pin_normalized IN (
          SELECT psl.pin
          FROM property_subdivision_links psl
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
  ) AS earliest_year_built
FROM subdivisions s;

GRANT SELECT ON subdivision_index_view TO anon, authenticated;
