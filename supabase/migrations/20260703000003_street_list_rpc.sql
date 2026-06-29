-- City-wide street directory RPC. Returns one row per distinct street with
-- aggregate stats (parcel count, era, permits, sales, teardowns) and the
-- dominant official planning neighborhood via MODE().
-- Returns json to bypass PostgREST row-count cap (same pattern as permit_list).

CREATE OR REPLACE FUNCTION street_list()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_agg(row_to_json(t))
  FROM (
    WITH stats AS (
      SELECT
        street_name_normalized,
        COUNT(*)::bigint                                                  AS parcel_count,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)::numeric  AS median_year,
        MIN(CASE WHEN year_built > 1800 THEN year_built END)              AS oldest_year,
        MAX(CASE WHEN year_built > 1800 THEN year_built END)              AS newest_year,
        COALESCE(SUM(permit_count), 0)::bigint                            AS total_permits,
        COALESCE(SUM(sale_count), 0)::bigint                              AS total_sales,
        COUNT(*) FILTER (WHERE is_teardown_rebuild = true)::bigint        AS teardown_count,
        MODE() WITHIN GROUP (ORDER BY official_planning_neighborhood_id)  AS neighborhood_id
      FROM parcels
      WHERE street_name_normalized IS NOT NULL
      GROUP BY street_name_normalized
    )
    SELECT
      s.street_name_normalized,
      INITCAP(s.street_name_normalized)  AS display_name,
      s.parcel_count,
      s.median_year,
      s.oldest_year,
      s.newest_year,
      s.total_permits,
      s.total_sales,
      s.teardown_count,
      s.neighborhood_id,
      n.label                            AS neighborhood_label,
      n.slug                             AS neighborhood_slug
    FROM stats s
    LEFT JOIN neighborhoods n ON n.id = s.neighborhood_id
    ORDER BY s.street_name_normalized
  ) t
$$;

GRANT EXECUTE ON FUNCTION street_list() TO anon, authenticated;
