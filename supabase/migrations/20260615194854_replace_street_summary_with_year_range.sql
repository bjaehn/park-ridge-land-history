-- Replace street_summary RPC to include oldest_year and newest_year columns.
-- DROP required because return type changed.

DROP FUNCTION IF EXISTS street_summary(text);

CREATE FUNCTION street_summary(p_street_name text)
RETURNS TABLE(
  street_name_normalized text,
  parcel_count           bigint,
  median_year            numeric,
  oldest_year            integer,
  newest_year            integer,
  total_permits          bigint,
  total_sales            bigint,
  neighborhood_id        text
) AS $$
  SELECT
    street_name_normalized,
    COUNT(*)                                                                AS parcel_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)::numeric        AS median_year,
    MIN(CASE WHEN year_built > 1800 THEN year_built END)                    AS oldest_year,
    MAX(CASE WHEN year_built > 1800 THEN year_built END)                    AS newest_year,
    COALESCE(SUM(permit_count), 0)::bigint                                  AS total_permits,
    COALESCE(SUM(sale_count), 0)::bigint                                    AS total_sales,
    MODE() WITHIN GROUP (ORDER BY neighborhood_id)                          AS neighborhood_id
  FROM parcels
  WHERE street_name_normalized = p_street_name
  GROUP BY street_name_normalized;
$$ LANGUAGE sql STABLE;
