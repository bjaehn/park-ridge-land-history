-- highlight_parcels's subdivision scope was deed-only (property_subdivision_links),
-- so the "Highlight reel" (oldest lots, most renovated, most recently sold,
-- largest homes) on /subdivisions/[id] only ever sampled from deed-verified
-- parcels -- same bug class as fetchSubdivisionParcels() and the /subdivisions
-- index page (fixed separately), just a third place it was hiding.
--
-- Restores the 3-source union documented in CLAUDE.md and already used by
-- get_linked_pins_for_subdivision (20260703000018): deed research, the
-- direct admin-assigned FK, and GIS-lot spatial matching.

CREATE OR REPLACE FUNCTION highlight_parcels(
  p_scope      text,
  p_scope_id   text,
  p_category   text,
  p_limit      int DEFAULT 5
)
RETURNS TABLE (
  pin          text,
  address      text,
  year_built   integer,
  permit_count integer,
  latest_sale_year integer
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_scope_clause    text;
  v_category_clause text;
  v_order_clause    text;
BEGIN
  v_scope_clause := CASE p_scope
    WHEN 'city'         THEN 'TRUE'
    WHEN 'neighborhood' THEN format(
      '(p.official_planning_neighborhood_id = %L OR p.business_district_id = %L OR p.local_neighborhood_id = %L)',
      p_scope_id, p_scope_id, p_scope_id
    )
    WHEN 'street'       THEN format('p.street_name_normalized = %L', p_scope_id)
    WHEN 'subdivision'  THEN format(
      '(
        p.pin_normalized IN (
          SELECT psl.pin FROM property_subdivision_links psl
          WHERE psl.subdivision_id = %L::uuid
        )
        OR p.subdivision_id = %L::uuid
        OR p.pin_normalized IN (
          SELECT plr.pin_normalized
          FROM parcel_lot_relationships plr
          JOIN gis_lots gl ON gl.id = plr.lot_id
          WHERE gl.subdivision_id = %L::uuid
        )
      )',
      p_scope_id, p_scope_id, p_scope_id
    )
    ELSE 'TRUE'
  END;

  v_category_clause := CASE p_category
    WHEN 'oldest'           THEN 'p.year_built IS NOT NULL AND p.year_built > 1800'
    WHEN 'most_active'      THEN 'p.permit_count IS NOT NULL AND p.permit_count > 0'
    WHEN 'newest'           THEN 'p.year_built IS NOT NULL AND p.year_built >= 2000'
    WHEN 'most_recent_sale' THEN 'p.latest_sale_year IS NOT NULL'
    WHEN 'largest'          THEN 'p.building_sqft IS NOT NULL AND p.building_sqft > 0'
    ELSE 'TRUE'
  END;

  v_order_clause := CASE p_category
    WHEN 'oldest'           THEN 'p.year_built ASC'
    WHEN 'most_active'      THEN 'p.permit_count DESC NULLS LAST'
    WHEN 'newest'           THEN 'p.year_built DESC NULLS LAST'
    WHEN 'most_recent_sale' THEN 'p.latest_sale_year DESC NULLS LAST'
    WHEN 'largest'          THEN 'p.building_sqft DESC NULLS LAST'
    ELSE 'p.pin_normalized ASC'
  END;

  RETURN QUERY EXECUTE format(
    'SELECT
       COALESCE(p.pin_normalized, p.pin_original)::text,
       p.address::text,
       p.year_built::integer,
       p.permit_count::integer,
       p.latest_sale_year::integer
     FROM parcels p
     WHERE p.address IS NOT NULL
       AND p.address <> ''''
       AND (%s)
       AND (%s)
     ORDER BY %s
     LIMIT %L',
    v_scope_clause,
    v_category_clause,
    v_order_clause,
    p_limit
  );
END;
$$;
