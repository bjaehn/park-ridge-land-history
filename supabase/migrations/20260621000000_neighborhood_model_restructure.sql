-- Neighborhood model restructure: introduce three-taxonomy system.
-- Replaces the single neighborhood_id with three typed columns and adds
-- neighborhood_type to the neighborhoods table.
--
-- Old model: parcels.neighborhood_id → one of five census-tract-based IDs
-- New model: three coexisting typed columns, each FK to neighborhoods.id
--   official_planning_neighborhood_id → city planning districts (primary)
--   business_district_id              → commercial zones (optional)
--   local_neighborhood_id             → informal/realtor names (optional)
--
-- The old neighborhood_id column is preserved for now (Phase 2 drops it).

-- ── 1. Add neighborhood_type to neighborhoods table ──────────────────────────

ALTER TABLE neighborhoods
  ADD COLUMN IF NOT EXISTS neighborhood_type TEXT NOT NULL DEFAULT 'official_planning'
    CHECK (neighborhood_type IN ('official_planning', 'business_district', 'local_market'));

CREATE INDEX IF NOT EXISTS idx_neighborhoods_type ON neighborhoods (neighborhood_type);

-- Tag the five old census-tract neighborhoods as official_planning so they
-- remain valid until the admin retires them.
UPDATE neighborhoods
   SET neighborhood_type = 'official_planning'
 WHERE id IN (
   'neighborhood:uptown',
   'neighborhood:central',
   'neighborhood:northwest',
   'neighborhood:northeast',
   'neighborhood:south'
 );

-- ── 2. Add three typed FK columns to parcels ─────────────────────────────────

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS official_planning_neighborhood_id TEXT
    REFERENCES neighborhoods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_district_id TEXT
    REFERENCES neighborhoods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS local_neighborhood_id TEXT
    REFERENCES neighborhoods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parcels_official_planning
  ON parcels (official_planning_neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_parcels_business_district
  ON parcels (business_district_id);
CREATE INDEX IF NOT EXISTS idx_parcels_local_neighborhood
  ON parcels (local_neighborhood_id);
