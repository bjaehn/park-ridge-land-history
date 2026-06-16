-- Adds centroid and document_number columns, plus performance indexes
-- for the subdivision historical context feature.
-- Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE subdivision_geometries
  ADD COLUMN IF NOT EXISTS centroid jsonb;

ALTER TABLE subdivision_sources
  ADD COLUMN IF NOT EXISTS document_number text;

CREATE INDEX IF NOT EXISTS subdivisions_status_idx
  ON subdivisions (status)
  WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS ste_source_id_idx
  ON subdivision_timeline_events (source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ste_display_priority_idx
  ON subdivision_timeline_events (display_priority, event_year);

CREATE INDEX IF NOT EXISTS ss_source_key_lookup_idx
  ON subdivision_sources (source_key)
  WHERE source_key IS NOT NULL;
