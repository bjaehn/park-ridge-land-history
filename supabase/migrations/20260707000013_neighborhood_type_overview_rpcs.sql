-- Supports splitting "Official Planning Neighborhoods" and "Business
-- Districts" off /neighborhoods into their own pages (/planning-districts,
-- /business-districts), each needing: (1) a first-built year per
-- neighborhood alongside the existing median, and (2) a multi-boundary map
-- overview showing every neighborhood of one type at once.

-- ─── 1. Add earliest_year to neighborhood_summaries() ─────────────────────
-- Return type changes (new column), so DROP + CREATE rather than
-- CREATE OR REPLACE. Adds MIN(year_built) alongside the existing
-- PERCENTILE_CONT median in the same combined UNION ALL subquery.

DROP FUNCTION IF EXISTS neighborhood_summaries();

CREATE FUNCTION neighborhood_summaries()
RETURNS TABLE(
  neighborhood_id     text,
  neighborhood_label  text,
  neighborhood_slug   text,
  neighborhood_type   text,
  parcel_count        bigint,
  earliest_year       integer,
  median_year         numeric,
  total_permits       bigint,
  total_sales         bigint,
  recent_teardowns    bigint
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    n.id,
    n.label,
    n.slug,
    n.neighborhood_type,
    COALESCE(s.parcel_count, 0)::bigint,
    s.earliest_year,
    s.median_year,
    COALESCE(s.total_permits, 0)::bigint,
    COALESCE(s.total_sales, 0)::bigint,
    COALESCE(s.recent_teardowns, 0)::bigint
  FROM neighborhoods n
  LEFT JOIN (
    SELECT
      nbhd_id,
      COUNT(*)::bigint                                                       AS parcel_count,
      MIN(year_built) FILTER (WHERE year_built IS NOT NULL AND year_built > 1800) AS earliest_year,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)::numeric       AS median_year,
      COALESCE(SUM(permit_count),         0)::bigint                         AS total_permits,
      COALESCE(SUM(sale_count),           0)::bigint                         AS total_sales,
      COALESCE(SUM(nearby_teardown_count),0)::bigint                         AS recent_teardowns
    FROM (
      SELECT official_planning_neighborhood_id AS nbhd_id,
             year_built, permit_count, sale_count, nearby_teardown_count
        FROM parcels WHERE official_planning_neighborhood_id IS NOT NULL
      UNION ALL
      SELECT business_district_id,
             year_built, permit_count, sale_count, nearby_teardown_count
        FROM parcels WHERE business_district_id IS NOT NULL
      UNION ALL
      SELECT local_neighborhood_id,
             year_built, permit_count, sale_count, nearby_teardown_count
        FROM parcels WHERE local_neighborhood_id IS NOT NULL
    ) combined
    GROUP BY nbhd_id
  ) s ON s.nbhd_id = n.id
  ORDER BY n.neighborhood_type, n.label;
$$;

-- ─── 2. Multi-boundary GeoJSON for a whole neighborhood_type ──────────────
-- Mirrors get_neighborhood_boundary_geojson (20260630000004), but returns
-- one Feature per neighborhood of the given type instead of a single row.

CREATE OR REPLACE FUNCTION get_neighborhood_type_boundaries_geojson(p_type text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(json_agg(
      json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(n.geometry)::json,
        'properties', json_build_object('id', n.id, 'label', n.label, 'slug', n.slug)
      )
    ) FILTER (WHERE n.geometry IS NOT NULL), '[]'::json)
  )
  FROM neighborhoods n
  WHERE n.neighborhood_type = p_type;
$$;

GRANT EXECUTE ON FUNCTION get_neighborhood_type_boundaries_geojson(text) TO anon, authenticated;

-- ─── 3. Combined bbox for a whole neighborhood_type ───────────────────────
-- Mirrors neighborhood_bbox (20260617130000), but keyed directly off
-- neighborhoods.geometry (confirmed 100% populated for official_planning
-- and business_district) rather than the legacy parcels.neighborhood_id
-- join, since that's what's actually being drawn on the overview map.

CREATE OR REPLACE FUNCTION get_neighborhood_type_bbox(p_type text)
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
  FROM neighborhoods
  WHERE neighborhood_type = p_type
    AND geometry IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION get_neighborhood_type_bbox(text) TO anon, authenticated;
