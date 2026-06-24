-- Sprint E cleanup: remove auto-generated duplicate event rows and unused column.
--
-- property_events was populated with 418K auto-ingested assessment/appeal/sale/permit
-- rows whose data is fully duplicated in the canonical assessments, appeals, sales,
-- and permits tables. Only manually-authored admin entries should live here.
-- Dropping the metadata JSONB column (never queried by the app) prevents future bloat.

DELETE FROM property_events
WHERE event_type IN ('assessment', 'appeal', 'sale', 'permit');

ALTER TABLE property_events DROP COLUMN IF EXISTS metadata;
