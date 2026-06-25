-- Fixes highlight_parcels subdivision scope to include GIS-bulk-linked parcels.
--
-- Previously, the subdivision scope only checked property_subdivision_links (deed-
-- researched links), missing parcels linked via parcels.subdivision_id (GIS bulk
-- import). This caused only 1 property to appear per category for most subdivisions.
-- The fix mirrors fetchSubdivisionParcels(), which unions both sources.

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
    WHEN 'neighborhood' THEN format('p.neighborhood_id = %L', p_scope_id)
    WHEN 'street'       THEN format('p.street_name_normalized = %L', p_scope_id)
    WHEN 'subdivision'  THEN format(
      '(p.pin_normalized IN (SELECT psl.pin FROM property_subdivision_links psl WHERE psl.subdivision_id = %L::uuid) OR p.subdivision_id::text = %L)',
      p_scope_id, p_scope_id
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
