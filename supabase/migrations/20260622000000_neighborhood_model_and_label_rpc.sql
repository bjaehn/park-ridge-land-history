-- Neighborhood model restructure: typed taxonomy + label-aware RPC.
--
-- Adds neighborhood_type to neighborhoods and three typed FK columns to parcels.
-- Replaces neighborhood_summaries() to join neighborhoods for human-readable labels.

-- ─── 1. neighborhoods: add typed taxonomy column ──────────────────────────────

ALTER TABLE neighborhoods
  ADD COLUMN IF NOT EXISTS neighborhood_type TEXT NOT NULL DEFAULT 'official_planning';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'neighborhoods_neighborhood_type_check'
      AND conrelid = 'neighborhoods'::regclass
  ) THEN
    ALTER TABLE neighborhoods
      ADD CONSTRAINT neighborhoods_neighborhood_type_check
        CHECK (neighborhood_type IN ('official_planning','business_district','local_market'));
  END IF;
END $$;

-- ─── 2. parcels: three typed FK neighborhood columns ─────────────────────────

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS official_planning_neighborhood_id TEXT REFERENCES neighborhoods(id),
  ADD COLUMN IF NOT EXISTS business_district_id              TEXT REFERENCES neighborhoods(id),
  ADD COLUMN IF NOT EXISTS local_neighborhood_id             TEXT REFERENCES neighborhoods(id);

CREATE INDEX IF NOT EXISTS parcels_official_planning_nbhd_idx ON parcels (official_planning_neighborhood_id);
CREATE INDEX IF NOT EXISTS parcels_business_district_idx      ON parcels (business_district_id);
CREATE INDEX IF NOT EXISTS parcels_local_neighborhood_idx     ON parcels (local_neighborhood_id);

-- ─── 3. Replace neighborhood_summaries RPC ───────────────────────────────────
-- Queries from neighborhoods as the base (all neighborhoods appear even with 0
-- parcels) and aggregates across all three typed FK columns via UNION ALL.

DROP FUNCTION IF EXISTS neighborhood_summaries();

CREATE FUNCTION neighborhood_summaries()
RETURNS TABLE(
  neighborhood_id     text,
  neighborhood_label  text,
  neighborhood_slug   text,
  neighborhood_type   text,
  parcel_count        bigint,
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
    s.median_year,
    COALESCE(s.total_permits, 0)::bigint,
    COALESCE(s.total_sales, 0)::bigint,
    COALESCE(s.recent_teardowns, 0)::bigint
  FROM neighborhoods n
  LEFT JOIN (
    SELECT
      nbhd_id,
      COUNT(*)::bigint                                                       AS parcel_count,
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
