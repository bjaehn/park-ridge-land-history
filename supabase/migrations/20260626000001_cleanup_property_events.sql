-- Cleanup: remove auto-generated duplicate event rows and unused column.
-- (Idempotent: rows already deleted and column already dropped via MCP on 2026-06-24.)
--
-- property_events was populated with 418K auto-ingested assessment/appeal/sale/permit
-- rows whose data is fully duplicated in the canonical assessments, appeals, sales,
-- and permits tables. Only manually-authored admin entries should live here.

DELETE FROM property_events
WHERE event_type IN ('assessment', 'appeal', 'sale', 'permit');

ALTER TABLE property_events DROP COLUMN IF EXISTS metadata;

-- Sync subdivisions.parcel_count to GIS lot count for resolved subdivisions
UPDATE subdivisions s
SET parcel_count = (SELECT count(*) FROM gis_lots gl WHERE gl.subdivision_id = s.id)
WHERE EXISTS (SELECT 1 FROM gis_lots gl WHERE gl.subdivision_id = s.id);
