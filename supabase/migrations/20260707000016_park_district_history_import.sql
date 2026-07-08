-- Imports the Park Ridge Park District's own history timeline (68 entries,
-- 1914-2023) from https://www.prparks.org/About-Us/District-Information/History
-- (retrieved 2026-07-07) into historical_facts, following the established
-- hand-written-batch-migration pattern used for every prior fact source
-- (20260705000001/5/6, 20260707000000_hpc_landmarks.sql).
--
-- Field mapping (no new columns needed except the one noted below -- see
-- plan discussion): amount_usd -> measurements_or_amounts (+ stated in
-- summary prose, since HistoricalFactsPanel.tsx doesn't currently render
-- measurements_or_amounts/address_or_location at all -- this is a pure
-- data addition, no app code changes); location -> address_or_location,
-- normalized to each park's CURRENT name; date precision -> date_start is
-- always a bare year, date_text carries the full date string only where
-- the page gives one (3 of 68: the 1914 founding, 2014 Centennial Aquatic
-- Center opening, 2014 100th Anniversary), otherwise date_text is just the
-- year; pin_normalized is NULL on every row -- confirmed directly against
-- live parcels data that Park District land (including the 4 specific
-- street addresses given: 10 S. Western, 531/529 Forestview, 2620 Oakton)
-- has no parcel/plat representation anywhere in this project's data model.
--
-- fact_id scheme: prd-<category-code>-<seq>, category-coded (not
-- neighborhood-scoped like crp96-*) since these entries span many
-- neighborhoods and category is what's structurally meaningful for this
-- source. Category codes: acq=land_acquisition, open=facility_opening,
-- close=facility_closing, rename=renaming, prog=program_launch,
-- event=event, reno=renovation -- fact_type carries the same value.

-- ── Rename chain: one additive, nullable, self-referencing column ─────────
-- Mirrors exactly how neighborhood_id and pin_normalized were each added to
-- this table previously. Sufficient for the ~6 linear rename chains here.

ALTER TABLE historical_facts
  ADD COLUMN IF NOT EXISTS renamed_from_fact_id text REFERENCES historical_facts(fact_id);

-- ── Source ──────────────────────────────────────────────────────────────

INSERT INTO historical_sources
  (source_id, title, creator, publisher_or_printer, publication_year, digitized_by,
   digitization_funding, source_url, source_type, notes)
VALUES
  ('park_ridge_park_district_our_story',
   'Park Ridge Park District: Our Story',
   'Park Ridge Recreation and Park District',
   NULL, NULL, NULL, NULL,
   'https://www.prparks.org/About-Us/District-Information/History',
   'website',
   'District-maintained history timeline page, retrieved 2026-07-07. Continuously updated by the district, not a fixed-edition publication, hence no publication_year.')
ON CONFLICT (source_id) DO NOTHING;

-- ── Facts ───────────────────────────────────────────────────────────────

INSERT INTO historical_facts
  (fact_id, source_id, date_start, date_end, date_text, category, fact_type, title, summary,
   address_or_location, measurements_or_amounts, people, confidence, needs_geocoding,
   neighborhood_id, city_wide, pin_normalized, source_url, extraction_notes, renamed_from_fact_id)
VALUES

-- Founding
('prd-event-001', 'park_ridge_park_district_our_story', 1914, NULL, 'June 29, 1914',
 'Government/Boundaries', 'event', 'Park Ridge Park District is created',
 'The Park Ridge Park District was formally created on June 29, 1914, beginning the district''s independent governance of the community''s parkland.',
 NULL, NULL, NULL, 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

-- Land acquisitions
('prd-acq-001', 'park_ridge_park_district_our_story', 1914, NULL, '1914',
 'Land/Property', 'land_acquisition', 'Hodges Park acquired',
 'Hodges Park was acquired in 1914, the same year the Park District was created. A related but distinct 1873 fact (prh-0052) records Leonard Hodges'' earlier offer of a church lot at the south end of the park.',
 'Hodges Park', NULL, 'Leonard Hodges', 'high', false,
 'official_planning:hodges_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Cross-references prh-0052 (1873, "Leonard Hodges offered church lot at south end of park") as an earlier, distinct predecessor event -- not a duplicate.', NULL),

('prd-acq-002', 'park_ridge_park_district_our_story', 1923, NULL, '1923',
 'Land/Property', 'land_acquisition', 'Cumberland Park purchased for $14,400',
 'Cumberland Park was purchased in 1923 for $14,400.',
 'Cumberland Park', '$14,400', NULL, 'high', false,
 'official_planning:hodges_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-acq-003', 'park_ridge_park_district_our_story', 1928, NULL, '1928',
 'Land/Property', 'land_acquisition', 'Remaining 8 acres of Playground Park purchased for $319,000',
 'The remaining 8 acres of Playground Park (later renamed Hinkley Field, now Hinkley Park) were purchased in 1928 for $319,000, following the Park Ridge Playground Stockholders'' 1926 approval to sell the land to the district.',
 'Hinkley Park', '$319,000', NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Location normalized to current name "Hinkley Park" (Playground Park -> Hinkley Field, 1952 -> Hinkley Park). See prd-rename-001 for the 1952 renaming fact.', NULL),

('prd-acq-004', 'park_ridge_park_district_our_story', 1936, NULL, '1936',
 'Land/Property', 'land_acquisition', 'South Park purchased for $27,300',
 'South Park was purchased in 1936 for $27,300.',
 'South Park', '$27,300', NULL, 'high', false,
 'official_planning:south_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-acq-005', 'park_ridge_park_district_our_story', 1937, NULL, '1937',
 'Land/Property', 'land_acquisition', 'Maine Park purchased by Maine Park District for $16,000',
 'Maine Park was purchased in 1937 for $16,000 by the Maine Park District, a separate park district that was later annexed into the Park Ridge Park District in 1954 (see prd-event-005).',
 'Maine Park', '$16,000', NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Acquired by the Maine Park District, not the Park Ridge Park District -- the two districts merged in 1954.', NULL),

('prd-acq-006', 'park_ridge_park_district_our_story', 1947, NULL, '1947',
 'Land/Property', 'land_acquisition', 'Washington Park purchased for $1,200',
 'Washington Park was purchased in 1947 for $1,200. It was renamed Rotary Park in 1968 (see prd-rename-002).',
 'Rotary Park', '$1,200', NULL, 'high', false,
 'official_planning:hodges_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Location normalized to current name "Rotary Park".', NULL),

('prd-acq-007', 'park_ridge_park_district_our_story', 1952, NULL, '1952',
 'Land/Property', 'land_acquisition', 'West Park purchased for $48,250',
 'West Park was purchased in 1952 for $48,250. It was renamed Centennial Park in 1976 (see prd-rename-003).',
 'Centennial Park', '$48,250', NULL, 'high', false,
 'official_planning:centennial_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Location normalized to current name "Centennial Park".', NULL),

('prd-acq-008', 'park_ridge_park_district_our_story', 1956, NULL, '1956',
 'Land/Property', 'land_acquisition', 'Northeast Park purchased for $48,863',
 'Northeast Park was purchased in 1956 for $48,863.',
 'Northeast Park', '$48,863', NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'NOTE: shares a name with the official_planning:northeast_park 1996-plan neighborhood district it is linked to -- these are different entities (this fact is about the specific park parcel, not the planning district).', NULL),

('prd-acq-009', 'park_ridge_park_district_our_story', 1956, NULL, '1956',
 'Land/Property', 'land_acquisition', 'Southwest Park purchased for $66,820',
 'Southwest Park was purchased in 1956 for $66,820.',
 'Southwest Park', '$66,820', NULL, 'high', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'FLAGGED FOR REVIEW: no official_planning neighborhood (of the 7 1996-plan districts) mentions "Southwest Park" by name in its historical_summary -- set city_wide=true as a fallback. Needs manual geographic verification.', NULL),

('prd-acq-010', 'park_ridge_park_district_our_story', 1956, NULL, '1956',
 'Land/Property', 'land_acquisition', 'Northwest Park purchased for $97,000',
 'Northwest Park was purchased in 1956 for $97,000. It is located at Dee Road and Glenview Avenue, next to Franklin Elementary School.',
 'Northwest Park', '$97,000', NULL, 'high', false,
 'official_planning:northwest_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Matched via explicit description in official_planning:northwest_park''s historical_summary: "Named for the park at Dee Road and Glenview Avenue, next to Franklin Elementary School."', NULL),

('prd-acq-011', 'park_ridge_park_district_our_story', 1959, NULL, '1959',
 'Land/Property', 'land_acquisition', 'Southeast Park purchased for $54,864',
 'Southeast Park was purchased in 1959 for $54,864.',
 'Southeast Park', '$54,864', NULL, 'high', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'FLAGGED FOR REVIEW: no official_planning neighborhood mentions "Southeast Park" by name in its historical_summary -- set city_wide=true as a fallback. Needs manual geographic verification.', NULL),

('prd-acq-012', 'park_ridge_park_district_our_story', 1966, NULL, '1966',
 'Land/Property', 'land_acquisition', 'Oakton Park purchased for $462,500',
 'Oakton Park was purchased in 1966 for $462,500.',
 'Oakton Park', '$462,500', NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-acq-013', 'park_ridge_park_district_our_story', 1968, NULL, '1968',
 'Land/Property', 'land_acquisition', 'North Park acquired by the City of Park Ridge',
 'North Park was acquired in 1968 by the City of Park Ridge, not the Park Ridge Park District -- included here because it appears on the district''s own history timeline, but it may belong to city rather than park-district land history.',
 'North Park', NULL, NULL, 'medium', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'FLAGGED FOR REVIEW: acquired by the City of Park Ridge, a different governmental entity than the Park District. No dollar amount given. No official_planning neighborhood match found either.', NULL),

('prd-acq-014', 'park_ridge_park_district_our_story', 1968, NULL, '1968',
 'Land/Property', 'land_acquisition', 'Woodland Park purchased for $125,000',
 'Woodland Park was purchased in 1968 for $125,000.',
 'Woodland Park', '$125,000', NULL, 'high', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'FLAGGED FOR REVIEW: no official_planning neighborhood mentions "Woodland Park" by name in its historical_summary -- set city_wide=true as a fallback. Needs manual geographic verification.', NULL),

('prd-acq-015', 'park_ridge_park_district_our_story', 1976, NULL, '1976',
 'Land/Property', 'land_acquisition', 'Jaycee Park was dedicated',
 'Jaycee Park was dedicated in 1976. No purchase price is given on the source page.',
 'Jaycee Park', NULL, NULL, 'high', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'FLAGGED FOR REVIEW: no official_planning neighborhood mentions "Jaycee Park" by name. No dollar amount given (page uses "dedicated" rather than "purchased").', NULL),

('prd-acq-016', 'park_ridge_park_district_our_story', 1983, NULL, '1983',
 'Land/Property', 'land_acquisition', 'Park District purchases Madison School for $410,000, renamed Maine Park Leisure Center',
 'The Park District purchased the former Madison School in 1983 for $410,000 and renamed it Maine Park Leisure Center in the same transaction.',
 'Maine Park Leisure Center', '$410,000', NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Acquisition and renaming happened in the same 1983 event, represented as one fact rather than a separate acquisition + renaming pair (contrast with West Park/Centennial Park and Washington Park/Rotary Park, where the rename came years after acquisition).', NULL),

('prd-acq-017', 'park_ridge_park_district_our_story', 2006, NULL, '2006',
 'Land/Property', 'land_acquisition', '2620 Oakton property adjacent to Oakton Sports Complex is purchased',
 'The property at 2620 Oakton, adjacent to the Oakton Sports Complex, was purchased in 2006.',
 '2620 Oakton', NULL, NULL, 'high', true,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'No parcel record exists for this address: checked parcels.address directly for "2620 Oakton" / "%FORESTVIEW%" / "%OAKTON%" patterns, no match. pin_normalized left NULL. needs_geocoding=true since a specific street address is known but not yet mapped to a parcel/geometry.', NULL),

('prd-acq-018', 'park_ridge_park_district_our_story', 2008, NULL, '2008',
 'Land/Property', 'land_acquisition', 'The Little Red House at 10 S. Western was purchased',
 'The Little Red House, at 10 S. Western, was purchased by the Park District in 2008.',
 '10 S. Western Ave', NULL, NULL, 'high', true,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'FLAGGED FOR REVIEW: no official_planning neighborhood historical_summary text confirms this specific address. No parcel record exists for "10 S. Western" either (checked directly against parcels.address). needs_geocoding=true.', NULL),

('prd-acq-019', 'park_ridge_park_district_our_story', 2020, NULL, '2020',
 'Land/Property', 'land_acquisition', 'Park District acquires property at 531 Forestview',
 'The Park District acquired the property at 531 Forestview in 2020. It opened in 2023 as Wildwood Nature Center (see prd-open-018) -- see that fact''s notes for an important caveat about whether this is a relocation of the existing (1986) Wildwood Nature Center or a separate facility.',
 '531 Forestview', NULL, NULL, 'high', true,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'FLAGGED FOR REVIEW: no official_planning neighborhood match found. No parcel record exists for "531 Forestview" (checked directly against parcels.address). needs_geocoding=true.', NULL),

-- Facility openings
('prd-open-001', 'park_ridge_park_district_our_story', 1929, NULL, '1929',
 'Sports/Recreation', 'facility_opening', 'Hinkley Pool opens',
 'Hinkley Pool opened in 1929.',
 'Hinkley Park', NULL, NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-open-002', 'park_ridge_park_district_our_story', 1948, NULL, '1948',
 'Sports/Recreation', 'facility_opening', 'First outdoor rinks at South Park, Hinkley Field, and Northeast Park open',
 'The district''s first outdoor skating rinks opened in 1948 at South Park, Hinkley Field, and Northeast Park.',
 'South Park; Hinkley Park; Northeast Park', NULL, NULL, 'high', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Spans 3 parks in different neighborhoods; recorded as city_wide rather than picking one neighborhood_id.', NULL),

('prd-open-003', 'park_ridge_park_district_our_story', 1954, NULL, '1954',
 'Sports/Recreation', 'facility_opening', 'West Park pool and field house built',
 'A pool and field house were built at West Park (now Centennial Park) in 1954.',
 'Centennial Park', NULL, NULL, 'high', false,
 'official_planning:centennial_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-open-004', 'park_ridge_park_district_our_story', 1969, NULL, '1969',
 'Sports/Recreation', 'facility_opening', 'South Park Recreation Center opens',
 'The South Park Recreation Center opened in 1969.',
 'South Park', NULL, NULL, 'high', false,
 'official_planning:south_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-open-005', 'park_ridge_park_district_our_story', 1981, NULL, '1981',
 'Sports/Recreation', 'facility_opening', 'Senior Center opens to the public',
 'The Park Ridge Senior Center opened to the public in 1981. It was renamed Centennial Activity Center in 2015 (see prd-rename-005).',
 'Centennial Activity Center', NULL, NULL, 'high', false,
 'official_planning:centennial_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Location normalized to current name "Centennial Activity Center".', NULL),

('prd-open-006', 'park_ridge_park_district_our_story', 1986, NULL, '1986',
 'Sports/Recreation', 'facility_opening', 'Wildwood Nature Center opens to the public',
 'Wildwood Nature Center opened to the public in 1986. Its original location is not stated on the source page; see prd-open-018 for an important caveat about the 2023 "531 Forestview opens as Wildwood Nature Center" entry, which may or may not represent this same facility relocating.',
 'Wildwood Nature Center', NULL, NULL, 'medium', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Original 1986 location/address not given on the source page. Not linked to prd-open-018 (2023) via any relationship column -- that link is uncertain, see prd-open-018''s notes.', NULL),

('prd-open-007', 'park_ridge_park_district_our_story', 1988, NULL, '1988',
 'Sports/Recreation', 'facility_opening', 'Oakton Driving Range opens to the public',
 'The Oakton Driving Range opened to the public in 1988.',
 'Oakton Sports Complex', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-open-008', 'park_ridge_park_district_our_story', 1992, NULL, '1992',
 'Sports/Recreation', 'facility_opening', 'Community Center Opens',
 'The Park Ridge Community Center opened in 1992. It was renamed Centennial Fitness Center in 2015 (see prd-rename-006).',
 'Centennial Fitness Center', NULL, NULL, 'high', false,
 'official_planning:centennial_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Location normalized to current name "Centennial Fitness Center".', NULL),

('prd-open-009', 'park_ridge_park_district_our_story', 1999, NULL, '1999',
 'Sports/Recreation', 'facility_opening', 'Paws Park opens to the public at Oakton Park',
 'Paws Park opened to the public at Oakton Park in 1999.',
 'Oakton Park', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-open-010', 'park_ridge_park_district_our_story', 2002, NULL, '2002',
 'Sports/Recreation', 'facility_opening', 'Skate Park opens at Hinkley Park',
 'A skate park opened at Hinkley Park in 2002.',
 'Hinkley Park', NULL, NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-open-011', 'park_ridge_park_district_our_story', 2002, NULL, '2002',
 'Sports/Recreation', 'facility_opening', 'Sam Biardo''s observation deck is dedicated',
 'An observation deck honoring Sam Biardo was dedicated in 2002.',
 NULL, NULL, 'Sam Biardo', 'high', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Location/park not specified on the source page.', NULL),

('prd-open-012', 'park_ridge_park_district_our_story', 2006, NULL, '2006',
 'Sports/Recreation', 'facility_opening', 'The Oakton Batting Cages open',
 'The Oakton Batting Cages opened in 2006. They permanently closed in 2023 (see prd-close-002).',
 'Oakton Sports Complex', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-open-013', 'park_ridge_park_district_our_story', 2013, NULL, '2013',
 'Sports/Recreation', 'facility_opening', 'The Oak Tree Playground at Maine Park opens',
 'The Oak Tree Playground at Maine Park opened in 2013.',
 'Maine Park', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-open-014', 'park_ridge_park_district_our_story', 2014, NULL, 'June 14, 2014',
 'Sports/Recreation', 'facility_opening', 'Centennial Aquatic Center opens to the public',
 'The Centennial Aquatic Center opened to the public on June 14, 2014.',
 'Centennial Park', NULL, NULL, 'high', false,
 'official_planning:centennial_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Image on source page: https://www.prparks.org/Portals/0/adam/Content/ZLgWh9has02PULmpdVkSHQ/Image/CAQ-Girl-Water-Walk.jpg?w=400&h=400&mode=crop', NULL),

('prd-open-015', 'park_ridge_park_district_our_story', 2016, NULL, '2016',
 'Sports/Recreation', 'facility_opening', 'Prospect Park opens to the public',
 'Prospect Park opened to the public in 2016. No separate acquisition entry for Prospect Park appears on the source page.',
 'Prospect Park', NULL, NULL, 'medium', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'No official_planning neighborhood match found; no acquisition-date entry exists on the page for this park either (unlike the other named parks). Image on source page: https://www.prparks.org/Portals/0/adam/Swiper2/ZeiX_xK-ZUikimKpAf9pfw/Image/prospect-splash-pad-pirate-ship-water-sprayers-8361.jpg?w=400&h=400&mode=crop', NULL),

('prd-open-016', 'park_ridge_park_district_our_story', 2021, NULL, '2021',
 'Sports/Recreation', 'facility_opening', 'Community Gardens open at Hinkley Park',
 'Community gardens opened at Hinkley Park in 2021.',
 'Hinkley Park', NULL, NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Image on source page: https://www.prparks.org/Portals/0/adam/Swiper2/7huQwD8TJEq5OIaJ6ZgKbw/Image/Hinkley-Park-Community-Garden.jpg?w=400&h=400&mode=crop', NULL),

('prd-open-017', 'park_ridge_park_district_our_story', 2021, NULL, '2021',
 'Sports/Recreation', 'facility_opening', 'Outdoor Nature Classroom opens at Maine Park Leisure Center',
 'An outdoor nature classroom opened at Maine Park Leisure Center in 2021.',
 'Maine Park Leisure Center', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-open-018', 'park_ridge_park_district_our_story', 2023, NULL, '2023',
 'Sports/Recreation', 'facility_opening', '531 Forestview opens as Wildwood Nature Center',
 'The property at 531 Forestview, acquired in 2020 (see prd-acq-019), opened in 2023 as Wildwood Nature Center.',
 '531 Forestview', NULL, NULL, 'medium', true,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'FLAGGED FOR REVIEW: the source page does not state whether this is the ORIGINAL Wildwood Nature Center (which opened in 1986, prd-open-006) relocating to a new address, or a separate/new facility that reuses the name. It also does not say what happened to the original site. Deliberately left unlinked (renamed_from_fact_id is NULL) rather than guessing. Image: https://www.prparks.org/Portals/0/adam/Swiper2/q_aA0EpvSkayB0ozFKvKug/Image/Wildwood-Forestview.jpg?w=400&h=400&mode=crop', NULL),

-- Facility closings
('prd-close-001', 'park_ridge_park_district_our_story', 2011, NULL, '2011',
 'Sports/Recreation', 'facility_closing', 'Oakton Pool closes',
 'Oakton Pool closed in 2011.',
 'Oakton Sports Complex', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-close-002', 'park_ridge_park_district_our_story', 2023, NULL, '2023',
 'Sports/Recreation', 'facility_closing', 'Oakton Batting Cages permanently close',
 'The Oakton Batting Cages permanently closed in 2023.',
 'Oakton Sports Complex', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

-- Renamings
('prd-rename-001', 'park_ridge_park_district_our_story', 1952, NULL, '1952',
 'Government/Boundaries', 'renaming', 'Playground Park renamed Hinkley Field',
 'Playground Park was renamed Hinkley Field in 1952. It was later known as Hinkley Park (its current name).',
 'Hinkley Park', NULL, NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Note: "Hinkley Pool" (prd-open-001) already used the Hinkley name in 1929, before this formal 1952 park-wide renaming -- the name may have applied informally to a specific facility (the pool) before covering the whole park.', 'prd-acq-003'),

('prd-rename-002', 'park_ridge_park_district_our_story', 1968, NULL, '1968',
 'Government/Boundaries', 'renaming', 'Washington Park renamed Rotary Park',
 'Washington Park, purchased in 1947, was renamed Rotary Park in 1968.',
 'Rotary Park', NULL, NULL, 'high', false,
 'official_planning:hodges_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, 'prd-acq-006'),

('prd-rename-003', 'park_ridge_park_district_our_story', 1976, NULL, '1976',
 'Government/Boundaries', 'renaming', 'West Park changes name to Centennial Park',
 'West Park, purchased in 1952, changed its name to Centennial Park in 1976.',
 'Centennial Park', NULL, NULL, 'high', false,
 'official_planning:centennial_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, 'prd-acq-007'),

('prd-rename-004', 'park_ridge_park_district_our_story', 1979, NULL, '1979',
 'Government/Boundaries', 'renaming', 'Park Ridge Park District changes its name to Park Ridge Recreation and Park District',
 'The Park Ridge Park District changed its name to the Park Ridge Recreation and Park District in 1979.',
 NULL, NULL, NULL, 'high', false,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, 'prd-event-001'),

('prd-rename-005', 'park_ridge_park_district_our_story', 2015, NULL, '2015',
 'Government/Boundaries', 'renaming', 'Park Ridge Senior Center renamed Centennial Activity Center, S.T.A.R. Membership created',
 'The Park Ridge Senior Center, opened in 1981, was renamed Centennial Activity Center in 2015; the S.T.A.R. Membership program was created at the same time.',
 'Centennial Activity Center', NULL, NULL, 'high', false,
 'official_planning:centennial_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Combined entry on the source page: renaming + new membership program launch in the same year. Recorded as one fact (fact_type=renaming) rather than split.', 'prd-open-005'),

('prd-rename-006', 'park_ridge_park_district_our_story', 2015, NULL, '2015',
 'Government/Boundaries', 'renaming', 'Community Center is renamed Centennial Fitness Center',
 'The Community Center, opened in 1992, was renamed Centennial Fitness Center in 2015.',
 'Centennial Fitness Center', NULL, NULL, 'high', false,
 'official_planning:centennial_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, 'prd-open-008'),

('prd-rename-007', 'park_ridge_park_district_our_story', 2023, NULL, '2023',
 'Government/Boundaries', 'renaming', '529 Forestview is renamed Wildwood Program Center',
 '529 Forestview, a property adjacent to 531 Forestview, was renamed Wildwood Program Center in 2023.',
 '529 Forestview', NULL, NULL, 'medium', true,
 NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'FLAGGED FOR REVIEW: the source page does not state what 529 Forestview was called or used for before this renaming, so renamed_from_fact_id is deliberately left NULL rather than guessed. No parcel record exists for "529 Forestview" either.', NULL),

-- Program launches
('prd-prog-001', 'park_ridge_park_district_our_story', 1946, NULL, '1946',
 'Sports/Recreation', 'program_launch', 'First basketball league begins',
 'The district''s first basketball league began in 1946.',
 NULL, NULL, NULL, 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-prog-002', 'park_ridge_park_district_our_story', 1948, NULL, '1948',
 'Sports/Recreation', 'program_launch', 'First youth softball and baseball clinics begin',
 'The district''s first youth 12" and 16" softball leagues and baseball clinics began in 1948.',
 NULL, NULL, NULL, 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-prog-003', 'park_ridge_park_district_our_story', 1948, NULL, '1948',
 'Sports/Recreation', 'program_launch', 'First Red Cross swim lessons begin',
 'The district''s first Red Cross swim lessons began in 1948.',
 NULL, NULL, 'American Red Cross', 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-prog-004', 'park_ridge_park_district_our_story', 1949, NULL, '1949',
 'Sports/Recreation', 'program_launch', 'First football clinics begin',
 'The district''s first football clinics began in 1949.',
 NULL, NULL, NULL, 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

-- Events
('prd-event-002', 'park_ridge_park_district_our_story', 1926, NULL, '1926',
 'Government/Boundaries', 'event', 'Park Ridge Playground Stockholders approve sale of Playground Park',
 'The Park Ridge Playground Stockholders approved the sale of Playground Park to the district in 1926, ahead of the 1928 purchase of its remaining 8 acres (see prd-acq-003).',
 'Hinkley Park', NULL, NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-event-003', 'park_ridge_park_district_our_story', 1944, NULL, '1944',
 'Government/Boundaries', 'event', 'First Recreation Director hired',
 'The district hired its first Recreation Director in 1944.',
 NULL, NULL, NULL, 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-event-004', 'park_ridge_park_district_our_story', 1949, NULL, '1949',
 'Sports/Recreation', 'event', 'First summer concert held at Hodges Park',
 'The district''s first summer concert was held at Hodges Park in 1949.',
 'Hodges Park', NULL, NULL, 'high', false,
 'official_planning:hodges_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-event-005', 'park_ridge_park_district_our_story', 1954, NULL, '1954',
 'Government/Boundaries', 'event', 'Maine Park District annexed to Park Ridge Park District',
 'The Maine Park District, which had purchased Maine Park in 1937 (see prd-acq-005), was annexed into the Park Ridge Park District in 1954.',
 'Maine Park', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-event-006', 'park_ridge_park_district_our_story', 1972, NULL, '1972',
 'Sports/Recreation', 'event', 'Olympic Trials held at Oakton Sports Complex',
 'Olympic Trials were held at Oakton Sports Complex in 1972.',
 'Oakton Sports Complex', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-event-007', 'park_ridge_park_district_our_story', 1983, NULL, '1983',
 'Land/Buildings', 'event', 'Eugene Romeo Gallery & Library donated to the Park District',
 'The Eugene Romeo Gallery & Library was donated to the Park District in 1983.',
 NULL, NULL, 'Eugene Romeo', 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-event-008', 'park_ridge_park_district_our_story', 1995, NULL, '1995',
 'Sports/Recreation', 'event', 'U.S. Masters National Outdoor Invitational Diving Championships held at Oakton Pool',
 'The U.S. Masters National Outdoor Invitational Diving Championships were held at Oakton Pool in 1995.',
 'Oakton Sports Complex', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-event-009', 'park_ridge_park_district_our_story', 2013, NULL, '2013',
 'Government/Boundaries', 'event', 'Park Ridge residents pass referendum to purchase and develop Youth Campus',
 'Park Ridge residents passed a referendum in 2013 to purchase and develop the Youth Campus.',
 'Park Ridge Youth Campus', NULL, NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Youth Campus located per official_planning:northeast_park''s historical_summary ("the Park Ridge Youth Campus"). This fact records the referendum vote, not a separate itemized purchase/opening date for the Youth Campus itself.', NULL),

('prd-event-010', 'park_ridge_park_district_our_story', 2014, NULL, 'June 29, 2014',
 'Government/Boundaries', 'event', 'Park Ridge Park District celebrates its 100th Anniversary',
 'The Park Ridge Park District celebrated its 100th Anniversary on June 29, 2014 -- exactly 100 years after its June 29, 1914 founding (see prd-event-001).',
 NULL, NULL, NULL, 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-event-011', 'park_ridge_park_district_our_story', 2022, NULL, '2022',
 'Government/Boundaries', 'event', 'Park Ridge residents pass referendum for improvements at Oakton Park and Facilities',
 'Park Ridge residents passed a referendum in 2022 for improvements at Oakton Park and other district facilities.',
 'Oakton Park', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

-- Renovations
('prd-reno-001', 'park_ridge_park_district_our_story', 1940, NULL, '1940',
 'Land/Buildings', 'renovation', 'Works Progress Administration excavates earth from Maine Park lagoons',
 'The Works Progress Administration (WPA) excavated earth from the Maine Park lagoons in 1940.',
 'Maine Park', NULL, 'Works Progress Administration', 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-reno-002', 'park_ridge_park_district_our_story', 1998, NULL, '1998',
 'Sports/Recreation', 'renovation', 'Hinkley Pool grand re-opening',
 'Hinkley Pool had its grand re-opening in 1998 after renovation.',
 'Hinkley Park', NULL, NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Image on source page: https://www.prparks.org/Portals/0/adam/Content/UXQU1x1AQkCH7_TiSN5KJA/Image/hinkley-pool-facility-lifeguard-on-duty-8530.jpg?w=400&h=400&mode=crop', NULL),

('prd-reno-003', 'park_ridge_park_district_our_story', 1998, NULL, '1998',
 'Land/Buildings', 'renovation', 'Wildwood Nature Center Grand Re-Opening',
 'Wildwood Nature Center had its grand re-opening in 1998, at the same site that opened in 1986 (see prd-open-006).',
 'Wildwood Nature Center', NULL, NULL, 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-reno-004', 'park_ridge_park_district_our_story', 1999, NULL, '1999',
 'Land/Buildings', 'renovation', 'Senior Center is renovated',
 'The Senior Center (now Centennial Activity Center) was renovated in 1999.',
 'Centennial Activity Center', NULL, NULL, 'high', false,
 'official_planning:centennial_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-reno-005', 'park_ridge_park_district_our_story', 2000, NULL, '2000',
 'Land/Buildings', 'renovation', 'Wildwood Prairie restoration begins',
 'Restoration of the Wildwood Prairie began in 2000.',
 'Wildwood Nature Center', NULL, NULL, 'high', false, NULL, true, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-reno-006', 'park_ridge_park_district_our_story', 2004, NULL, '2004',
 'Land/Buildings', 'renovation', 'Hinkley reservoir groundbreaking',
 'Groundbreaking for the Hinkley reservoir took place in 2004.',
 'Hinkley Park', NULL, NULL, 'high', false,
 'official_planning:northeast_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History', NULL, NULL),

('prd-reno-007', 'park_ridge_park_district_our_story', 2017, NULL, '2017',
 'Land/Buildings', 'renovation', 'Maine Park Leisure Center undergoes significant renovation',
 'Maine Park Leisure Center underwent a significant renovation in 2017.',
 'Maine Park Leisure Center', NULL, NULL, 'high', false,
 'official_planning:maine_park', false, NULL,
 'https://www.prparks.org/About-Us/District-Information/History',
 'Image on source page: https://www.prparks.org/Portals/0/adam/Swiper2/y2kF_3MZ70qGl3tzCQmBMw/Image/MPLC-Meeting-Room-2.jpg?w=400&h=400&mode=crop', NULL)

ON CONFLICT (fact_id) DO NOTHING;
