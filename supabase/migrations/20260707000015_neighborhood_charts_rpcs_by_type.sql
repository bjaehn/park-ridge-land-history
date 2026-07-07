-- Generalizes neighborhood_price_comparison() and neighborhood_era_distribution()
-- (20260621000001_update_neighborhood_rpcs.sql) from being hardcoded to
-- official_planning_neighborhood_id to accepting a p_types text[] parameter,
-- so /neighborhoods and /business-districts can show their OWN correctly
-- scoped charts instead of /neighborhoods silently showing Planning
-- District data mislabeled as its own (the same class of bug already fixed
-- once for /subdivisions in 20260707000004_subdivision_era_price_rpcs.sql).
--
-- Mirrors neighborhoodPropertyGetter() in src/lib/mapConfig.ts, which
-- already solves "which of the 4 typed FK columns applies" for the map --
-- same coalesce-by-requested-type logic, expressed in SQL instead of a
-- MapLibre expression.

DROP FUNCTION IF EXISTS neighborhood_price_comparison();

CREATE OR REPLACE FUNCTION neighborhood_price_comparison(p_types text[])
RETURNS TABLE(neighborhood_id text, year_2015 integer, year_2024 integer)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    sub.neighborhood_id,
    MAX(sub.median_price) FILTER (WHERE sub.sale_year = 2015),
    MAX(sub.median_price) FILTER (WHERE sub.sale_year = 2024)
  FROM (
    SELECT
      COALESCE(
        CASE WHEN 'official_planning' = ANY(p_types) THEN p.official_planning_neighborhood_id END,
        CASE WHEN 'business_district' = ANY(p_types) THEN p.business_district_id END,
        CASE WHEN 'corridor' = ANY(p_types) THEN p.corridor_id END,
        CASE WHEN 'local_market' = ANY(p_types) THEN p.local_neighborhood_id END
      ) AS neighborhood_id,
      s.sale_year,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.sale_price)::integer AS median_price
    FROM sales s
    JOIN parcels p ON p.pin_normalized = s.pin
    WHERE s.is_market_sale = true
      AND s.sale_price BETWEEN 50000 AND 5000000
      AND s.sale_year IN (2015, 2024)
    GROUP BY 1, s.sale_year
  ) sub
  WHERE sub.neighborhood_id IS NOT NULL
  GROUP BY sub.neighborhood_id;
$$;

GRANT EXECUTE ON FUNCTION neighborhood_price_comparison(text[]) TO anon, authenticated;

DROP FUNCTION IF EXISTS neighborhood_era_distribution();

CREATE OR REPLACE FUNCTION neighborhood_era_distribution(p_types text[])
RETURNS TABLE(neighborhood_id text, era text, count integer)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    sub.neighborhood_id,
    sub.era,
    COUNT(*)::integer
  FROM (
    SELECT
      COALESCE(
        CASE WHEN 'official_planning' = ANY(p_types) THEN p.official_planning_neighborhood_id END,
        CASE WHEN 'business_district' = ANY(p_types) THEN p.business_district_id END,
        CASE WHEN 'corridor' = ANY(p_types) THEN p.corridor_id END,
        CASE WHEN 'local_market' = ANY(p_types) THEN p.local_neighborhood_id END
      ) AS neighborhood_id,
      CASE
        WHEN p.year_built < 1920 THEN 'pre1920'
        WHEN p.year_built < 1946 THEN 'boom'
        WHEN p.year_built < 1980 THEN 'postwar'
        WHEN p.year_built < 2000 THEN 'eighties'
        WHEN p.year_built < 2010 THEN 'aughts'
        WHEN p.year_built < 2020 THEN 'teens'
        ELSE 'recent'
      END AS era
    FROM parcels p
    WHERE p.year_built IS NOT NULL
  ) sub
  WHERE sub.neighborhood_id IS NOT NULL
  GROUP BY sub.neighborhood_id, sub.era
  ORDER BY sub.neighborhood_id, sub.era;
$$;

GRANT EXECUTE ON FUNCTION neighborhood_era_distribution(text[]) TO anon, authenticated;
