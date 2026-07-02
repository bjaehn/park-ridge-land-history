-- Adds the 1996 City of Park Ridge Comprehensive Plan as a historical source,
-- and gives historical_facts an optional precise FK to neighborhoods plus a
-- city_wide flag, so newly-added facts don't have to rely on fuzzy
-- place_modern text matching the way the 1926-book facts (prh-*) do.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT guards throughout).

ALTER TABLE historical_facts
  ADD COLUMN IF NOT EXISTS neighborhood_id text REFERENCES neighborhoods(id),
  ADD COLUMN IF NOT EXISTS city_wide boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS historical_facts_neighborhood_id_idx
  ON historical_facts (neighborhood_id);

INSERT INTO historical_sources
  (source_id, title, creator, publisher_or_printer, publication_year, digitized_by,
   digitization_funding, source_url, source_type, notes)
VALUES
  ('park_ridge_comprehensive_plan_1996',
   'Comprehensive Plan for the City of Park Ridge',
   'Teska Associates, Inc., with Business Districts, Inc. and the Yas/Fischel Partnership',
   'City of Park Ridge',
   1996,
   NULL,
   NULL,
   NULL,
   'adopted municipal comprehensive plan (text transcription)',
   'Adopted July 15, 1996 by the Park Ridge City Council. Prepared for the Department of Community Preservation and Development and the Planning and Zoning Commission. Sourced from a user-provided full-text transcription; page numbers below refer to the plan''s own printed pagination.')
ON CONFLICT (source_id) DO UPDATE SET
  title = excluded.title,
  creator = excluded.creator,
  publisher_or_printer = excluded.publisher_or_printer,
  publication_year = excluded.publication_year,
  source_type = excluded.source_type,
  notes = excluded.notes;

-- Corroborate the existing Brickton/Pennyville founding facts (already recorded
-- against "Peeny and Meachem's Subdivision" via subdivision_timeline_events)
-- with the 1996 plan's own account of the same history, rather than duplicating
-- the facts themselves.
WITH target AS (
  SELECT id FROM subdivisions WHERE normalized_name = 'peeny_and_meachems_subdivision'
)
INSERT INTO subdivision_sources
  (subdivision_id, source_key, title, source_type, source_name, source_url,
   reliability_tier, notes)
SELECT target.id, 'park-ridge-comprehensive-plan-1996', 'Comprehensive Plan for the City of Park Ridge (1996)',
       'adopted municipal comprehensive plan', 'City of Park Ridge / Teska Associates, Inc.', NULL,
       'official',
       'Historical Perspective section (pp. 4) corroborates the brickyard-to-incorporation sequence: George Penny''s 1853 brickyard partnership with Robert Meacham, the community known first as Pennyville then Brickton, and incorporation as the Village of Park Ridge on July 4, 1873 following the brickyard''s closing. Notes population of ~400 by the 1870s and names the ridge line along Prospect Street (separating the Des Plaines and Chicago River watersheds) as the source of the "Park Ridge" name.'
FROM target
ON CONFLICT (source_key) DO UPDATE SET
  subdivision_id = excluded.subdivision_id,
  title = excluded.title,
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  reliability_tier = excluded.reliability_tier,
  notes = excluded.notes,
  updated_at = now();
