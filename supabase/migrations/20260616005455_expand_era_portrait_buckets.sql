-- Expand neighborhood_era_distribution from 4 buckets to 7.
-- Splits the old "modern" (1980+) into: 1980-1999, 2000-2009, 2010-2019, 2020+

CREATE OR REPLACE FUNCTION neighborhood_era_distribution()
RETURNS TABLE(neighborhood_id text, era text, count integer)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.neighborhood_id,
    CASE
      WHEN p.year_built < 1920 THEN 'pre1920'
      WHEN p.year_built < 1946 THEN 'boom'
      WHEN p.year_built < 1980 THEN 'postwar'
      WHEN p.year_built < 2000 THEN 'eighties'
      WHEN p.year_built < 2010 THEN 'aughts'
      WHEN p.year_built < 2020 THEN 'teens'
      ELSE 'recent'
    END,
    COUNT(*)::integer
  FROM parcels p
  WHERE p.year_built IS NOT NULL
    AND p.neighborhood_id IS NOT NULL
  GROUP BY p.neighborhood_id, 2
  ORDER BY p.neighborhood_id, 2;
$$;
