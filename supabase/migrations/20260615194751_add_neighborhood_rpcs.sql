-- RPCs for neighborhood list and decade distribution pages.

CREATE OR REPLACE FUNCTION neighborhood_summaries()
RETURNS TABLE(
  neighborhood_id  text,
  parcel_count     bigint,
  median_year      numeric,
  total_permits    bigint,
  total_sales      bigint,
  recent_teardowns bigint
) AS $$
  SELECT
    neighborhood_id,
    COUNT(*)                                                               AS parcel_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)::numeric       AS median_year,
    COALESCE(SUM(permit_count), 0)::bigint                                 AS total_permits,
    COALESCE(SUM(sale_count), 0)::bigint                                   AS total_sales,
    COALESCE(SUM(nearby_teardown_count), 0)::bigint                        AS recent_teardowns
  FROM parcels
  WHERE neighborhood_id IS NOT NULL
  GROUP BY neighborhood_id
  ORDER BY neighborhood_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION neighborhood_decade_distribution(p_neighborhood_id text)
RETURNS TABLE(
  decade text,
  count  bigint
) AS $$
  SELECT
    decade_built  AS decade,
    COUNT(*)      AS count
  FROM parcels
  WHERE neighborhood_id = p_neighborhood_id
    AND decade_built IS NOT NULL
    AND decade_built NOT IN ('Suspicious', 'Unknown')
  GROUP BY decade_built
  ORDER BY decade_built;
$$ LANGUAGE sql STABLE;
