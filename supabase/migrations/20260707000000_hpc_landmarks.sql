-- Adds the City of Park Ridge Historic Preservation Commission's official
-- landmark designation list (18 properties, 2011-2023) as a new tagged
-- historical_facts source, separate from the pre-existing Park Ridge
-- Historical Society "recognized landmark" list (data/raw/park_ridge_recognized_history.csv,
-- which feeds static per-parcel JSON and is intentionally left untouched here).
--
-- Gives historical_facts an optional precise FK to parcels so landmark facts
-- can drive a property-page badge in addition to the existing neighborhood_id
-- scoping used for the neighborhood "What we know" panel.
--
-- Address-to-PIN matching was run by hand against the live parcels table
-- (ILIKE/regex lookups mirroring searchParcels() in src/lib/supabase/homeQueries.ts).
-- 10 of 18 addresses resolved cleanly to a single parcel. The remaining 8 --
-- Pickwick Building (multi-address downtown block), Clute House, Town of
-- Maine Cemetery, Solomon Cottage, Wohlers Hall, Emery Cottage, American
-- Legion Monument, and Maine Township Town Hall -- did not resolve to an
-- individual PIN (civic/institutional/multi-address properties not present
-- in the parcels table under the addresses given). Those rows still carry a
-- best-effort neighborhood_id inferred from nearby addresses on the same
-- street where possible, or city_wide = true where no nearby reference
-- point existed (American Legion Monument). None of them get a property
-- badge until a PIN is manually confirmed.
--
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT guards throughout).

ALTER TABLE historical_facts
  ADD COLUMN IF NOT EXISTS pin_normalized text REFERENCES parcels(pin_normalized);

CREATE INDEX IF NOT EXISTS historical_facts_pin_normalized_idx
  ON historical_facts (pin_normalized);

INSERT INTO historical_sources
  (source_id, title, creator, publisher_or_printer, publication_year, digitized_by,
   digitization_funding, source_url, source_type, notes)
VALUES
  ('park_ridge_historic_preservation_commission_landmarks',
   'City of Park Ridge Historic Preservation Commission -- Designated Landmarks List',
   'City of Park Ridge Historic Preservation Commission',
   'City of Park Ridge',
   NULL,
   NULL,
   NULL,
   NULL,
   'municipal landmark designation list',
   'The Commission''s official list of 18 locally-designated landmarks (2011-2023), spanning commercial, residential, and public buildings. Distinct from the Park Ridge Historical Society''s separately-maintained "recognized landmark" list, which is tracked outside historical_facts in data/raw/park_ridge_recognized_history.csv.')
ON CONFLICT (source_id) DO UPDATE SET
  title = excluded.title,
  creator = excluded.creator,
  publisher_or_printer = excluded.publisher_or_printer,
  source_type = excluded.source_type,
  notes = excluded.notes;

INSERT INTO historical_facts
  (fact_id, source_id, pin_normalized, neighborhood_id, city_wide, date_start, date_text,
   category, fact_type, title, summary, confidence, app_use)
VALUES
  ('hpc-landmark-001', 'park_ridge_historic_preservation_commission_landmarks', NULL,
   'official_planning:northeast_park', false, 2011, '2011',
   'Land/Buildings', 'landmark', 'Pickwick Building',
   'Designated a Park Ridge landmark in 2011. The 1928 Pickwick complex at 3-11 S. Prospect Ave. and 6-11 S. Northwest Hwy. combines an Art Deco movie theatre, stage, retail, and office building in the heart of downtown.',
   'high', 'Neighborhood historical-facts panel entry. No property badge: spans a multi-address downtown block that did not resolve to a single parcel.'),

  ('hpc-landmark-002', 'park_ridge_historic_preservation_commission_landmarks', NULL,
   'official_planning:hodges_park', false, 2011, '2011',
   'Land/Buildings', 'landmark', 'Clute House',
   'Designated a Park Ridge landmark in 2011. Named for early residents Walter and Beulah Clute, who were connected to the Park Ridge Artists Colony. Located at 720 Garden St.',
   'high', 'Neighborhood historical-facts panel entry. No property badge: 720 Garden St. did not resolve to a parcel in the current dataset.'),

  ('hpc-landmark-003', 'park_ridge_historic_preservation_commission_landmarks', '12022080160000',
   'official_planning:south_park', false, 2011, '2011',
   'Land/Buildings', 'landmark', 'Spanish Colonial (424 Talcott Place)',
   'Designated a Park Ridge landmark in 2011. A private residence in the Spanish Colonial style at 424 Talcott Place.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel.'),

  ('hpc-landmark-004', 'park_ridge_historic_preservation_commission_landmarks', '09271140320000',
   'official_planning:maine_park', false, 2011, '2011',
   'Land/Buildings', 'landmark', 'Helen Unseth House',
   'Designated a Park Ridge landmark in 2011. A private residence at 808 Park Plaine Ave. designed by architect Bruce Goff, built in 1940.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel.'),

  ('hpc-landmark-005', 'park_ridge_historic_preservation_commission_landmarks', NULL,
   'official_planning:centennial_park', false, 2011, '2011',
   'Land/Buildings', 'landmark', 'Town of Maine Cemetery',
   'Designated a Park Ridge landmark in 2011. Chartered in 1858 at 2101 W. Touhy Ave., with a distinctive gatehouse and Civil War memorial context.',
   'high', 'Neighborhood historical-facts panel entry. No property badge: cemetery/exempt land not present in the parcels dataset under this address.'),

  ('hpc-landmark-006', 'park_ridge_historic_preservation_commission_landmarks', '09264170160000',
   'official_planning:northeast_park', false, 2011, '2011',
   'Land/Buildings', 'landmark', 'Malone House',
   'Designated a Park Ridge landmark in 2011. An early Park Ridge house at 201 Grand Blvd. associated with second mayor William H. Malone.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel.'),

  ('hpc-landmark-007', 'park_ridge_historic_preservation_commission_landmarks', '09264150220000',
   'official_planning:northeast_park', false, 2012, '2012',
   'Land/Buildings', 'landmark', 'Iannelli Home and Studio',
   'Designated a Park Ridge landmark in 2012. Home and studio of designer and sculptor Alfonso Iannelli at 255-257 N. Northwest Hwy., who lived and worked in Park Ridge.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel. Only 255 N. Northwest Hwy. resolved to a parcel; 257 shares the same building/PIN.'),

  ('hpc-landmark-008', 'park_ridge_historic_preservation_commission_landmarks', '09264250090000',
   'official_planning:northeast_park', false, 2012, '2012',
   'Land/Buildings', 'landmark', 'Tudor Revival by Zook & McCaughey (519 Cedar St.)',
   'Designated a Park Ridge landmark in 2012. A Tudor Revival private residence at 519 Cedar St. designed by architects H. R. Zook and William McCaughey.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel.'),

  ('hpc-landmark-009', 'park_ridge_historic_preservation_commission_landmarks', '09264250040000',
   'official_planning:northeast_park', false, 2012, '2012',
   'Land/Buildings', 'landmark', 'Cotswold Cottage by Iannelli & Byrne',
   'Designated a Park Ridge landmark in 2012. A Cotswold Cottage-style private residence at 611 Cedar St. by Alfonso Iannelli and Barry Byrne, part of the Cedar Court enclave associated with William Malone.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel.'),

  ('hpc-landmark-010', 'park_ridge_historic_preservation_commission_landmarks', '09264190090000',
   'official_planning:northeast_park', false, 2014, '2014',
   'Land/Buildings', 'landmark', 'Henri A. Eicher House',
   'Designated a Park Ridge landmark in 2014. One of Park Ridge''s oldest residences, at 312 Cedar St., connected to Henri Eicher and the Kalo Workshop.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel.'),

  ('hpc-landmark-011', 'park_ridge_historic_preservation_commission_landmarks', '09353010240000',
   'official_planning:centennial_park', false, 2014, '2014',
   'Land/Buildings', 'landmark', 'C. T. Carroll Residence',
   'Designated a Park Ridge landmark in 2014. A private residence at 720 S. Lincoln Ave. designed by architect William McCaughey, built in 1956.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel.'),

  ('hpc-landmark-012', 'park_ridge_historic_preservation_commission_landmarks', '09263180440000',
   'official_planning:maine_park', false, 2015, '2015',
   'Land/Buildings', 'landmark', 'Georgian (122 N. Delphia Ave.)',
   'Designated a Park Ridge landmark in 2015. A Georgian-style private residence at 122 N. Delphia Ave., built in the World War II era.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel.'),

  ('hpc-landmark-013', 'park_ridge_historic_preservation_commission_landmarks', NULL,
   'official_planning:northeast_park', false, 2017, '2017',
   'Land/Buildings', 'landmark', 'Solomon Cottage',
   'Designated a Park Ridge landmark in 2017. The former school building at 721 N. Prospect Ave. was the first cottage built for the Illinois Industrial School for Girls after its 1908 relocation to Park Ridge.',
   'high', 'Neighborhood historical-facts panel entry. No property badge: 721 N. Prospect Ave. did not resolve to a parcel in the current dataset.'),

  ('hpc-landmark-014', 'park_ridge_historic_preservation_commission_landmarks', NULL,
   'official_planning:northeast_park', false, 2017, '2017',
   'Land/Buildings', 'landmark', 'Wohlers Hall',
   'Designated a Park Ridge landmark in 2017, alongside Emery Cottage, as part of the former Illinois Industrial School for Girls campus at 733 N. Prospect Ave.',
   'high', 'Neighborhood historical-facts panel entry. No property badge: 733 N. Prospect Ave. did not resolve to a parcel in the current dataset.'),

  ('hpc-landmark-015', 'park_ridge_historic_preservation_commission_landmarks', NULL,
   'official_planning:northeast_park', false, 2017, '2017',
   'Land/Buildings', 'landmark', 'Emery Cottage',
   'Designated a Park Ridge landmark in 2017, alongside Wohlers Hall, as part of the former Illinois Industrial School for Girls campus at 733 N. Prospect Ave.',
   'high', 'Neighborhood historical-facts panel entry. No property badge: 733 N. Prospect Ave. did not resolve to a parcel in the current dataset.'),

  ('hpc-landmark-016', 'park_ridge_historic_preservation_commission_landmarks', NULL,
   NULL, true, 2018, '2018',
   'Land/Buildings', 'landmark', 'American Legion Monument',
   'Designated a Park Ridge landmark in 2018. A World War II monument at 833 W. Talcott Ave. maintained by the American Legion.',
   'high', 'City-wide historical-facts panel entry. No nearby parcel reference point existed on this street segment to infer a neighborhood, and 833 W. Talcott Ave. did not resolve to a parcel.'),

  ('hpc-landmark-017', 'park_ridge_historic_preservation_commission_landmarks', '09264250420000',
   'official_planning:northeast_park', false, 2021, '2021',
   'Land/Buildings', 'landmark', 'Tudor Revival by Zook & McCaughey (515 Cedar St.)',
   'Designated a Park Ridge landmark in 2021. A second Tudor Revival private residence at 515 Cedar St. by architects H. R. Zook and William McCaughey, on the same block as the 519 Cedar St. landmark.',
   'high', 'Feeds property-page Designated Landmark badge and neighborhood historical facts panel.'),

  ('hpc-landmark-018', 'park_ridge_historic_preservation_commission_landmarks', NULL,
   'official_planning:ballard_church', false, 2023, '2023',
   'Land/Buildings', 'landmark', 'Maine Township Town Hall',
   'Designated a Park Ridge landmark in 2023. The township''s public government building at 1700 W. Ballard Rd.',
   'high', 'Neighborhood historical-facts panel entry. No property badge: 1700 W. Ballard Rd. did not resolve to a parcel in the current dataset.')

ON CONFLICT (fact_id) DO UPDATE SET
  pin_normalized = excluded.pin_normalized,
  neighborhood_id = excluded.neighborhood_id,
  city_wide = excluded.city_wide,
  date_start = excluded.date_start,
  date_text = excluded.date_text,
  category = excluded.category,
  fact_type = excluded.fact_type,
  title = excluded.title,
  summary = excluded.summary,
  confidence = excluded.confidence,
  app_use = excluded.app_use;
