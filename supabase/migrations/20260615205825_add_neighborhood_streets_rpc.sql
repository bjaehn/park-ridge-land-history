-- RPC for neighborhood detail page: list distinct streets with display names and counts.
-- Replaces pulling all parcel rows into JavaScript and counting client-side.

CREATE OR REPLACE FUNCTION neighborhood_streets(p_neighborhood_id text)
RETURNS TABLE(
  street_name  text,
  display_name text,
  parcel_count bigint
) AS $$
  SELECT
    street_name_normalized                AS street_name,
    INITCAP(street_name_normalized)       AS display_name,
    COUNT(*)::bigint                      AS parcel_count
  FROM parcels
  WHERE neighborhood_id = p_neighborhood_id
    AND street_name_normalized IS NOT NULL
  GROUP BY street_name_normalized
  ORDER BY street_name_normalized;
$$ LANGUAGE sql STABLE;
