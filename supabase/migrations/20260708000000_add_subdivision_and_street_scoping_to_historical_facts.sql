-- Adds optional subdivision_id and street_name_normalized scoping to
-- historical_facts, alongside the existing neighborhood_id/city_wide
-- (20260705000000) and pin_normalized (20260707000000) scoping. This lets a
-- fact be attached to a specific subdivision or street in addition to the
-- existing scoping options.
--
-- Capability-only: no existing historical_facts rows are scoped this way,
-- and this migration does not insert any new facts. Authoring subdivision-
-- or street-scoped fact content is a separate, future task.
--
-- Note: subdivisions already have a separate historical-facts-like mechanism
-- (SubdivisionHistoryPanel, backed by subdivision_timeline_events). Adding
-- subdivision_id here is a deliberate, known duplication of scoping concepts
-- for subdivisions specifically, accepted as a tradeoff to resolve in a
-- later ticket rather than blocking this migration.
--
-- Streets have no dedicated table/id (a "street" is derived from
-- parcels.street_name_normalized), so street_name_normalized is a plain text
-- matching key with no FK target, mirroring how that field is already used
-- elsewhere (e.g. StreetListRow, parcels.street_name_normalized).
--
-- Safe to re-run (IF NOT EXISTS guards throughout).

ALTER TABLE historical_facts
  ADD COLUMN IF NOT EXISTS subdivision_id uuid REFERENCES subdivisions(id),
  ADD COLUMN IF NOT EXISTS street_name_normalized text;

CREATE INDEX IF NOT EXISTS historical_facts_subdivision_id_idx
  ON historical_facts (subdivision_id);

CREATE INDEX IF NOT EXISTS historical_facts_street_name_normalized_idx
  ON historical_facts (street_name_normalized);
