-- Fix highlight_parcels subdivision scope: deed-verified PSL links are authoritative.
-- Fallback paths (parcel_lot_relationships, parcels.subdivision_id) only apply to
-- parcels that have NO deed_legal_description PSL link to any subdivision.
-- This prevents GIS/historical lot assignments from overriding deed research.

CREATE OR REPLACE FUNCTION highlight_parcels(
  p_scope     text,
  p_scope_id  text,
  p_category  text,
  p_limit     integer DEFAULT 5
)
RETURNS TABLE(
  pin              text,
  address          text,
  year_built       integer,
  permit_count     integer,
  latest_sale_year integer
) AS $$
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
      -- Deed-verified path: always included
      '(p.pin_normalized IN (
          SELECT psl.pin FROM property_subdivision_links psl
          WHERE psl.subdivision_id = %L::uuid
            AND psl.match_method = ''deed_legal_description''
        )
        OR (
          -- Fallback paths: only for parcels with no deed verification anywhere
          p.pin_normalized NOT IN (
            SELECT psl2.pin FROM property_subdivision_links psl2
            WHERE psl2.match_method = ''deed_legal_description''
          )
          AND (
            p.pin_normalized IN (
              SELECT psl3.pin FROM property_subdivision_links psl3
              WHERE psl3.subdivision_id = %L::uuid
            )
            OR p.subdivision_id::text = %L
            OR p.pin_normalized IN (
              SELECT plr.pin_normalized
              FROM parcel_lot_relationships plr
              JOIN gis_lots gl ON gl.id = plr.lot_id
              WHERE gl.subdivision_id = %L::uuid
            )
          )
        ))',
      p_scope_id, p_scope_id, p_scope_id, p_scope_id
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
$$ LANGUAGE plpgsql STABLE;
