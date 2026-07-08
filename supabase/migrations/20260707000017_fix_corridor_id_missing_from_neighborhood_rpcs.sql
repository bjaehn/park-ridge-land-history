-- Critical bug fix: "Assign parcels from boundary" on a corridor-type
-- neighborhood (e.g. /admin/neighborhoods/corridor:touhy_avenue) appeared to
-- save (assign_parcels_by_geometry returned a real, non-zero count) but the
-- assigned parcels never showed up anywhere. Root cause traced directly:
-- corridor_id was added to parcels later than official_planning_neighborhood_id/
-- business_district_id/local_neighborhood_id (20260705000004), and
-- assign_parcels_by_geometry was updated for it (20260705000007), but every
-- OTHER neighborhood-scoped RPC that filters parcels by one of these 4 typed
-- columns was never updated to include corridor_id. Confirmed live:
-- parcels.corridor_id = 'corridor:touhy_avenue' really does have 1,057 rows --
-- the assignment worked. neighborhood_streets (which drives the admin page's
-- "current streets" list the user expected to see parcels appear in) simply
-- never checked corridor_id, so it always returned empty for any corridor.
--
-- Found by grepping every function in pg_proc mentioning
-- official_planning_neighborhood_id (13 total) rather than fixing this one
-- RPC and stopping -- per CLAUDE.md's documented lesson from the identical
-- subdivision-linkage-union bug class ("grep exhaustively on the first hit").
-- 5 more RPCs had the exact same gap: neighborhood_pins, neighborhood_bbox,
-- neighborhood_decade_distribution, neighborhood_summaries, highlight_parcels.
-- 3 RPCs (street_summary, parcel_year_comparisons, permit_list) intentionally
-- use ONLY official_planning_neighborhood_id -- that's correct, per CLAUDE.md
-- ("official_planning_neighborhood_id -- primary; use this for all RPCs"),
-- not a bug, and were left unchanged.
--
-- Also restores a second, unrelated regression found in the same function
-- while fixing the corridor gap: 20260622150000 added a "clear previous
-- assignment for this specific neighborhood_id" step before writing new
-- assignments (so redrawing a boundary smaller doesn't leave stale parcels
-- assigned outside it). 20260705000007's CREATE OR REPLACE (adding the
-- corridor branch) silently dropped that clearing step for all 4 branches.
-- Restored here, combined with the corridor branch.

-- ── assign_parcels_by_geometry: restore clear-previous-assignment + keep corridor branch ──

CREATE OR REPLACE FUNCTION public.assign_parcels_by_geometry(p_neighborhood_id text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_geom geometry;
  v_type text;
  v_count integer := 0;
BEGIN
  SELECT geometry, neighborhood_type INTO v_geom, v_type
  FROM neighborhoods WHERE id = p_neighborhood_id;

  IF v_geom IS NULL THEN
    RAISE EXCEPTION 'No geometry saved for neighborhood %', p_neighborhood_id;
  END IF;

  IF v_type = 'business_district' THEN
    UPDATE parcels SET business_district_id = NULL
      WHERE business_district_id = p_neighborhood_id;
    UPDATE parcels SET business_district_id = p_neighborhood_id
      WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  ELSIF v_type = 'local_market' THEN
    UPDATE parcels SET local_neighborhood_id = NULL
      WHERE local_neighborhood_id = p_neighborhood_id;
    UPDATE parcels SET local_neighborhood_id = p_neighborhood_id
      WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  ELSIF v_type = 'corridor' THEN
    UPDATE parcels SET corridor_id = NULL
      WHERE corridor_id = p_neighborhood_id;
    UPDATE parcels SET corridor_id = p_neighborhood_id
      WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  ELSE
    UPDATE parcels SET official_planning_neighborhood_id = NULL
      WHERE official_planning_neighborhood_id = p_neighborhood_id;
    UPDATE parcels SET official_planning_neighborhood_id = p_neighborhood_id
      WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── neighborhood_streets: add corridor_id ──────────────────────────────────

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
    OR corridor_id                    = p_neighborhood_id
  )
    AND street_name_normalized IS NOT NULL
  GROUP BY street_name_normalized
  ORDER BY street_name_normalized;
$$ LANGUAGE sql STABLE;

-- ── neighborhood_pins: add corridor_id ─────────────────────────────────────

CREATE OR REPLACE FUNCTION neighborhood_pins(p_neighborhood_id text)
RETURNS TABLE(pin text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT pin_normalized
  FROM parcels
  WHERE official_planning_neighborhood_id = p_neighborhood_id
     OR business_district_id = p_neighborhood_id
     OR local_neighborhood_id = p_neighborhood_id
     OR corridor_id = p_neighborhood_id;
$$;

-- ── neighborhood_bbox: add corridor_id ─────────────────────────────────────

CREATE OR REPLACE FUNCTION neighborhood_bbox(p_neighborhood_id text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER AS $$
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
    OR corridor_id                    = p_neighborhood_id
  )
    AND geometry IS NOT NULL;
$$;

-- ── neighborhood_decade_distribution: add corridor_id ──────────────────────

CREATE OR REPLACE FUNCTION neighborhood_decade_distribution(p_neighborhood_id text)
RETURNS TABLE(decade text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    decade_built  AS decade,
    COUNT(*)      AS count
  FROM parcels
  WHERE (
    official_planning_neighborhood_id = p_neighborhood_id
    OR business_district_id           = p_neighborhood_id
    OR local_neighborhood_id          = p_neighborhood_id
    OR corridor_id                    = p_neighborhood_id
  )
    AND decade_built IS NOT NULL
    AND decade_built NOT IN ('Suspicious', 'Unknown')
  GROUP BY decade_built
  ORDER BY decade_built;
$$;

-- ── neighborhood_summaries: add corridor branch to the UNION ALL ──────────

CREATE OR REPLACE FUNCTION public.neighborhood_summaries()
RETURNS TABLE(
  neighborhood_id text, neighborhood_label text, neighborhood_slug text,
  neighborhood_type text, parcel_count bigint, earliest_year integer,
  median_year numeric, total_permits bigint, total_sales bigint,
  recent_teardowns bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
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
      UNION ALL
      SELECT corridor_id,
             year_built, permit_count, sale_count, nearby_teardown_count
        FROM parcels WHERE corridor_id IS NOT NULL
    ) combined
    GROUP BY nbhd_id
  ) s ON s.nbhd_id = n.id
  ORDER BY n.neighborhood_type, n.label;
$$;

-- ── highlight_parcels: add corridor_id to the 'neighborhood' scope clause ──

CREATE OR REPLACE FUNCTION public.highlight_parcels(p_scope text, p_scope_id text, p_category text, p_limit integer DEFAULT 5)
RETURNS TABLE(pin text, address text, year_built integer, permit_count integer, latest_sale_year integer)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_scope_clause    text;
  v_category_clause text;
  v_order_clause    text;
BEGIN
  v_scope_clause := CASE p_scope
    WHEN 'city'         THEN 'TRUE'
    WHEN 'neighborhood' THEN format(
      '(p.official_planning_neighborhood_id = %L OR p.business_district_id = %L OR p.local_neighborhood_id = %L OR p.corridor_id = %L)',
      p_scope_id, p_scope_id, p_scope_id, p_scope_id
    )
    WHEN 'street'       THEN format('p.street_name_normalized = %L', p_scope_id)
    WHEN 'subdivision'  THEN format(
      '(
        p.pin_normalized IN (
          SELECT psl.pin FROM property_subdivision_links psl
          WHERE psl.subdivision_id = %L::uuid
        )
        OR p.subdivision_id = %L::uuid
        OR p.pin_normalized IN (
          SELECT plr.pin_normalized
          FROM parcel_lot_relationships plr
          JOIN gis_lots gl ON gl.id = plr.lot_id
          WHERE gl.subdivision_id = %L::uuid
        )
      )',
      p_scope_id, p_scope_id, p_scope_id
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
$$;
