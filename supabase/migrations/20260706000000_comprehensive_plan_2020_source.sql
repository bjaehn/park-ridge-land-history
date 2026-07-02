-- Registers the 2020 Comprehensive Plan ("Park Ridge Wonderful") as a second
-- historical source, distinct from the 1996 plan already registered in
-- 20260705000000. This plan explicitly supersedes the 1996 plan and its
-- three amendments (Uptown Planning Study, Dee Park Plan, Higgins Road
-- Corridor Plan).
-- Safe to re-run (ON CONFLICT DO UPDATE).

INSERT INTO historical_sources
  (source_id, title, creator, publisher_or_printer, publication_year, digitized_by,
   digitization_funding, source_url, source_type, notes)
VALUES
  ('park_ridge_comprehensive_plan_2020',
   'Park Ridge Wonderful: The City of Park Ridge''s Comprehensive Plan of 2020',
   'City of Park Ridge staff, with Teska Associates, Inc. (public participation process and housing chapter)',
   'City of Park Ridge',
   2020,
   NULL,
   NULL,
   NULL,
   'adopted municipal comprehensive plan (text transcription)',
   'The City''s fifth "official plan" (after 1926, 1956, 1981, and 1996). Explicitly replaces and supersedes the 1996 Comprehensive Plan and its three amendments (Uptown Planning Study, Dee Park Plan, Higgins Road Corridor Plan). Sourced from a user-provided transcription of Chapter 1 (Introduction, History, and Community Profile) only; page numbers below refer to this chapter''s own printed pagination.')
ON CONFLICT (source_id) DO UPDATE SET
  title = excluded.title,
  creator = excluded.creator,
  publisher_or_printer = excluded.publisher_or_printer,
  publication_year = excluded.publication_year,
  source_type = excluded.source_type,
  notes = excluded.notes;

UPDATE historical_sources
SET notes = COALESCE(notes, '') ||
  ' Superseded July 2020 by Park Ridge Wonderful: The City of Park Ridge''s Comprehensive Plan of 2020 (source_id park_ridge_comprehensive_plan_2020).'
WHERE source_id = 'park_ridge_comprehensive_plan_1996'
  AND notes NOT ILIKE '%Superseded July 2020%';
