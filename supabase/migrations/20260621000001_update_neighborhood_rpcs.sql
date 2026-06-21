-- Update all neighborhood-related RPCs to use the three new typed columns
-- instead of the legacy neighborhood_id column on parcels.
--
-- Pattern for per-neighborhood queries: check all three columns with OR so
-- the same RPC works regardless of neighborhood type.
--
-- neighborhood_summaries() and street_summary() have return-type changes,
-- so they must be dropped before recreation.

-- ── 1. neighborhood_summaries() ──────────────────────────────────────────────
-- Return type changes: adds neighborhood_type column.

DROP FUNCTION IF EXISTS neighborhood_summaries();

CREATE FUNCTION neighborhood_summaries()
RETURNS TABLE(
  neighborhood_id   text,
  neighborhood_type text,
  parcel_count      bigint,
  median_year       numeric,
  total_permits     bigint,
  total_sales       bigint,
  recent_teardowns  bigint
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    n.id                                                                      AS neighborhood_id,
    n.neighborhood_type,
    COUNT(p.pin_normalized)::bigint                                           AS parcel_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.year_built)::numeric        AS median_year,
    COALESCE(SUM(p.permit_count), 0)::bigint                                  AS total_permits,
    COALESCE(SUM(p.sale_count), 0)::bigint                                    AS total_sales,
    COALESCE(SUM(p.nearby_teardown_count), 0)::bigint                         AS recent_teardowns
  FROM neighborhoods n
  LEFT JOIN parcels p ON (
    p.official_planning_neighborhood_id = n.id
    OR p.business_district_id           = n.id
    OR p.local_neighborhood_id          = n.id
  )
  WHERE n.neighborhood_type IS NOT NULL
  GROUP BY n.id, n.neighborhood_type
  ORDER BY n.neighborhood_type, n.id;
$$;

GRANT EXECUTE ON FUNCTION neighborhood_summaries() TO anon, authenticated;

-- ── 2. neighborhood_decade_distribution() ────────────────────────────────────

CREATE OR REPLACE FUNCTION neighborhood_decade_distribution(p_neighborhood_id text)
RETURNS TABLE(
  decade text,
  count  bigint
) AS $$
  SELECT
    decade_built  AS decade,
    COUNT(*)      AS count
  FROM parcels
  WHERE (
    official_planning_neighborhood_id = p_neighborhood_id
    OR business_district_id           = p_neighborhood_id
    OR local_neighborhood_id          = p_neighborhood_id
  )
    AND decade_built IS NOT NULL
    AND decade_built NOT IN ('Suspicious', 'Unknown')
  GROUP BY decade_built
  ORDER BY decade_built;
$$ LANGUAGE sql STABLE;

-- ── 3. neighborhood_streets() ────────────────────────────────────────────────

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
  WHERE (
    official_planning_neighborhood_id = p_neighborhood_id
    OR business_district_id           = p_neighborhood_id
    OR local_neighborhood_id          = p_neighborhood_id
  )
    AND street_name_normalized IS NOT NULL
  GROUP BY street_name_normalized
  ORDER BY street_name_normalized;
$$ LANGUAGE sql STABLE;

-- ── 4. neighborhood_bbox() ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION neighborhood_bbox(p_neighborhood_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'minLng', ST_XMin(ST_Extent(geometry)),
    'minLat', ST_YMin(ST_Extent(geometry)),
    'maxLng', ST_XMax(ST_Extent(geometry)),
    'maxLat', ST_YMax(ST_Extent(geometry))
  )
  FROM parcels
  WHERE (
    official_planning_neighborhood_id = p_neighborhood_id
    OR business_district_id           = p_neighborhood_id
    OR local_neighborhood_id          = p_neighborhood_id
  )
    AND geometry IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION neighborhood_bbox(text) TO anon, authenticated;

-- ── 5. neighborhood_price_comparison() ───────────────────────────────────────
-- Use official_planning_neighborhood_id for the price comparison chart
-- (primary type; every parcel should eventually have one).

CREATE OR REPLACE FUNCTION neighborhood_price_comparison()
RETURNS TABLE(neighborhood_id text, year_2015 integer, year_2024 integer)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    sub.official_planning_neighborhood_id AS neighborhood_id,
    MAX(sub.median_price) FILTER (WHERE sub.sale_year = 2015),
    MAX(sub.median_price) FILTER (WHERE sub.sale_year = 2024)
  FROM (
    SELECT
      p.official_planning_neighborhood_id,
      s.sale_year,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.sale_price)::integer AS median_price
    FROM sales s
    JOIN parcels p ON p.pin_normalized = s.pin
    WHERE s.is_market_sale = true
      AND s.sale_price BETWEEN 50000 AND 5000000
      AND p.official_planning_neighborhood_id IS NOT NULL
      AND s.sale_year IN (2015, 2024)
    GROUP BY p.official_planning_neighborhood_id, s.sale_year
  ) sub
  GROUP BY sub.official_planning_neighborhood_id;
$$;

-- ── 6. neighborhood_era_distribution() ───────────────────────────────────────

CREATE OR REPLACE FUNCTION neighborhood_era_distribution()
RETURNS TABLE(neighborhood_id text, era text, count integer)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.official_planning_neighborhood_id AS neighborhood_id,
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
    AND p.official_planning_neighborhood_id IS NOT NULL
  GROUP BY p.official_planning_neighborhood_id, 2
  ORDER BY p.official_planning_neighborhood_id, 2;
$$;

-- ── 7. street_summary() ──────────────────────────────────────────────────────
-- Return type changes: adds neighborhood_label and neighborhood_slug columns.
-- Switches neighborhood_id source from neighborhood_id to
-- official_planning_neighborhood_id (the primary type for breadcrumbs).

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
  neighborhood_id        text,
  neighborhood_label     text,
  neighborhood_slug      text
) AS $$
  SELECT
    street_name_normalized,
    COUNT(*)                                                                   AS parcel_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)::numeric           AS median_year,
    MIN(CASE WHEN year_built > 1800 THEN year_built END)                       AS oldest_year,
    MAX(CASE WHEN year_built > 1800 THEN year_built END)                       AS newest_year,
    COALESCE(SUM(permit_count), 0)::bigint                                     AS total_permits,
    COALESCE(SUM(sale_count), 0)::bigint                                       AS total_sales,
    MODE() WITHIN GROUP (ORDER BY official_planning_neighborhood_id)           AS neighborhood_id,
    (SELECT label FROM neighborhoods
      WHERE id = MODE() WITHIN GROUP (ORDER BY official_planning_neighborhood_id)) AS neighborhood_label,
    (SELECT slug FROM neighborhoods
      WHERE id = MODE() WITHIN GROUP (ORDER BY official_planning_neighborhood_id)) AS neighborhood_slug
  FROM parcels
  WHERE street_name_normalized = p_street_name
  GROUP BY street_name_normalized;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION street_summary(text) TO anon, authenticated;

-- ── 8. highlight_parcels() ───────────────────────────────────────────────────

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
      'p.pin_normalized IN (SELECT psl.pin FROM property_subdivision_links psl WHERE psl.subdivision_id = %L)',
      p_scope_id
    )
    ELSE 'TRUE'
  END;

  v_category_clause := CASE p_category
    WHEN 'oldest'           THEN 'p.year_built IS NOT NULL AND p.year_built > 1800'
    WHEN 'most_active'      THEN 'p.permit_count IS NOT NULL AND p.permit_count > 0'
    WHEN 'newest'           THEN 'p.year_built IS NOT NULL AND p.year_built >= 2000'
    WHEN 'most_recent_sale' THEN 'p.latest_sale_year IS NOT NULL'
    ELSE 'TRUE'
  END;

  v_order_clause := CASE p_category
    WHEN 'oldest'           THEN 'p.year_built ASC'
    WHEN 'most_active'      THEN 'p.permit_count DESC NULLS LAST'
    WHEN 'newest'           THEN 'p.year_built DESC NULLS LAST'
    WHEN 'most_recent_sale' THEN 'p.latest_sale_year DESC NULLS LAST'
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

-- ── 9. parcel_year_comparisons() ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION parcel_year_comparisons(p_pin text)
RETURNS TABLE(
  scope         text,
  scope_label   text,
  property_year integer,
  median_year   numeric
) AS $$
DECLARE
  v_year         integer;
  v_street       text;
  v_neighborhood text;
BEGIN
  SELECT year_built, street_name_normalized, official_planning_neighborhood_id
    INTO v_year, v_street, v_neighborhood
    FROM parcels
   WHERE pin_normalized = p_pin
   LIMIT 1;

  IF v_year IS NULL THEN RETURN; END IF;

  IF v_street IS NOT NULL THEN
    RETURN QUERY
    SELECT 'street'::text,
           'On this street'::text,
           v_year,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)
      FROM parcels
     WHERE street_name_normalized = v_street
       AND year_built IS NOT NULL;
  END IF;

  IF v_neighborhood IS NOT NULL THEN
    RETURN QUERY
    SELECT 'neighborhood'::text,
           'In this neighborhood'::text,
           v_year,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)
      FROM parcels
     WHERE official_planning_neighborhood_id = v_neighborhood
       AND year_built IS NOT NULL;
  END IF;

  RETURN QUERY
  SELECT 'city'::text,
         'Across Park Ridge'::text,
         v_year,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)
    FROM parcels
   WHERE year_built IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;
