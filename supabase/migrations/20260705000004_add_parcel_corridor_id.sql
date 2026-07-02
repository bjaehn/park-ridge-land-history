-- Adds a corridor_id FK so parcels fronting a road corridor (Busse Highway,
-- Higgins Road, Touhy Avenue) can be looked up directly, mirroring
-- business_district_id/local_neighborhood_id. Corridors are geometrically
-- thin buffered strips rather than true containment polygons, so parcels are
-- matched here by street_name_normalized rather than assign_parcels_by_geometry's
-- ST_Contains logic.
-- Safe to re-run (IF NOT EXISTS / deterministic UPDATE).

ALTER TABLE parcels ADD COLUMN IF NOT EXISTS corridor_id text REFERENCES neighborhoods(id);
CREATE INDEX IF NOT EXISTS parcels_corridor_id_idx ON parcels (corridor_id);

UPDATE parcels SET corridor_id = 'corridor:busse_highway' WHERE street_name_normalized = 'busse hwy';
UPDATE parcels SET corridor_id = 'corridor:higgins_road' WHERE street_name_normalized = 'higgins rd';
UPDATE parcels SET corridor_id = 'corridor:touhy_avenue' WHERE street_name_normalized IN ('e touhy ave','w touhy ave');
