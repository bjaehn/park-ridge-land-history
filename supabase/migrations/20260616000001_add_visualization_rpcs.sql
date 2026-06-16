-- Visualization RPCs for city, neighborhood, and subdivision charts

CREATE OR REPLACE FUNCTION city_market_history()
RETURNS TABLE(sale_year integer, sale_count integer, median_price integer) AS $$
  SELECT
    s.sale_year,
    COUNT(*)::integer,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.sale_price)::integer
  FROM sales s
  WHERE s.is_market_sale = true
    AND s.sale_price BETWEEN 50000 AND 5000000
    AND s.sale_year IS NOT NULL
  GROUP BY s.sale_year
  ORDER BY s.sale_year;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION city_assessment_trend()
RETURNS TABLE(assessment_year integer, avg_total integer) AS $$
  SELECT
    a.assessment_year,
    ROUND(AVG(a.certified_total))::integer
  FROM assessments a
  WHERE a.certified_total > 1000
  GROUP BY a.assessment_year
  ORDER BY a.assessment_year;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION city_appeals_by_year()
RETURNS TABLE(appeal_year integer, appeal_count integer) AS $$
  SELECT
    a.appeal_year,
    COUNT(*)::integer
  FROM appeals a
  WHERE a.appeal_year IS NOT NULL
  GROUP BY a.appeal_year
  ORDER BY a.appeal_year;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION city_permit_activity()
RETURNS TABLE(permit_year integer, residential_count integer, commercial_count integer) AS $$
  SELECT
    EXTRACT(YEAR FROM p.date_issued)::integer,
    COUNT(*) FILTER (WHERE p.permit_type = 'RESIDENTIAL PERMIT')::integer,
    COUNT(*) FILTER (WHERE p.permit_type = 'COMMERCIAL PERMIT')::integer
  FROM permits p
  WHERE p.date_issued IS NOT NULL
  GROUP BY EXTRACT(YEAR FROM p.date_issued)
  ORDER BY 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION neighborhood_price_comparison()
RETURNS TABLE(neighborhood_id text, year_2015 integer, year_2024 integer) AS $$
  SELECT
    sub.neighborhood_id,
    MAX(sub.median_price) FILTER (WHERE sub.sale_year = 2015),
    MAX(sub.median_price) FILTER (WHERE sub.sale_year = 2024)
  FROM (
    SELECT
      p.neighborhood_id,
      s.sale_year,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.sale_price)::integer AS median_price
    FROM sales s
    JOIN parcels p ON p.pin_normalized = s.pin
    WHERE s.is_market_sale = true
      AND s.sale_price BETWEEN 50000 AND 5000000
      AND p.neighborhood_id IS NOT NULL
      AND s.sale_year IN (2015, 2024)
    GROUP BY p.neighborhood_id, s.sale_year
  ) sub
  GROUP BY sub.neighborhood_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION neighborhood_era_distribution()
RETURNS TABLE(neighborhood_id text, era text, count integer) AS $$
  SELECT
    p.neighborhood_id,
    CASE
      WHEN p.year_built < 1920 THEN 'pre1920'
      WHEN p.year_built < 1946 THEN 'boom'
      WHEN p.year_built < 1980 THEN 'postwar'
      ELSE 'modern'
    END,
    COUNT(*)::integer
  FROM parcels p
  WHERE p.year_built IS NOT NULL
    AND p.neighborhood_id IS NOT NULL
  GROUP BY p.neighborhood_id, 2
  ORDER BY p.neighborhood_id, 2;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION subdivision_plat_by_decade()
RETURNS TABLE(decade integer, plat_count integer) AS $$
  SELECT
    (FLOOR(s.recorded_year::numeric / 10) * 10)::integer,
    COUNT(*)::integer
  FROM subdivisions s
  WHERE s.recorded_year IS NOT NULL
  GROUP BY 1
  ORDER BY 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION subdivision_build_gap()
RETURNS TABLE(
  name text,
  recorded_year integer,
  earliest_built integer,
  gap_years integer,
  lot_count integer
) AS $$
  SELECT
    s.name,
    s.recorded_year,
    MIN(p.year_built)::integer AS earliest_built,
    (MIN(p.year_built) - s.recorded_year)::integer AS gap_years,
    COUNT(psl.pin)::integer AS lot_count
  FROM subdivisions s
  JOIN property_subdivision_links psl ON psl.subdivision_id = s.id
  JOIN parcels p ON p.pin_normalized = psl.pin
  WHERE s.recorded_year IS NOT NULL
    AND p.year_built IS NOT NULL
    AND p.year_built > s.recorded_year
    AND p.year_built < 2010
  GROUP BY s.id, s.name, s.recorded_year
  HAVING COUNT(psl.pin) >= 3
    AND (MIN(p.year_built) - s.recorded_year) > 0
  ORDER BY gap_years DESC
  LIMIT 25;
$$ LANGUAGE sql STABLE;
