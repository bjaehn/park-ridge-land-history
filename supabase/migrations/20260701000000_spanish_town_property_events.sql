-- Registers the Freundt "Spanish Town" Substack article as a source and inserts
-- historical notes into property_events for the seven identifiable surviving
-- Spanish Town homes mentioned by address in the article.
--
-- Source: "Park Ridge's Spanish Town" by Rachel Freundt, Chicagoland Architecture
-- & History (Apr 30, 2021).
-- https://chicagolandarchitecture.substack.com/p/park-ridges-spanish-town
--
-- Idempotent: source ON CONFLICT, events guarded by NOT EXISTS.

-- ─── Source registration ─────────────────────────────────────────────────────

INSERT INTO source_registry (
  source_key, source_name, source_type, source_url, publisher,
  access_method, coverage_area, coverage_years, confidence_default, notes
) VALUES (
  'freundt_spanish_town_2021',
  'Park Ridge''s "Spanish Town" - Chicagoland Architecture & History',
  'manual_entry',
  'https://chicagolandarchitecture.substack.com/p/park-ridges-spanish-town',
  'Rachel Freundt',
  'manual',
  'Park Ridge, IL - Talcott Place and S. Crescent Ave',
  '1927-1929',
  'medium',
  'Substack article (Apr 30, 2021) on the Spanish Colonial Revival enclave known as "Spanish Town" in southern Park Ridge. Covers architect Benedict J. Bruns (1881-1967), developer William Durchslag / Durchslag Real Estate Development Corporation, Kinsey''s Talcott Road Subdivision, and surviving homes on Talcott Place and S. Crescent Ave. Cites the City of Park Ridge Historic Landmark Designation Report (2011), Chicago Tribune (May 1, 1927 and Jan 23, 1967), and SAIC Digital Collections.'
) ON CONFLICT (source_key) DO NOTHING;

-- ─── Property events ─────────────────────────────────────────────────────────
-- Shared description for all seven Spanish Town homes.

DO $$
DECLARE
  base_desc text := 'One of approximately twelve homes in the "Spanish Town" development built 1927-1929 by architect Benedict J. Bruns (1881-1967) and developer William Durchslag of the Durchslag Real Estate Development Corporation, Kinsey''s Talcott Road Subdivision. Inspired by Spanish Colonial Revival architecture Durchslag encountered in Cuba. Constructed of masonry cement block and brick finished with textured stucco inside and out. Interiors featured hardwood and marble floors, sunken living rooms, arched doorways, vaulted ceilings, and sometimes a balcony overlooking the stairway. Original cost $17,000-$20,000.';
  base_title text := 'Spanish Town - Spanish Colonial Revival (1927-1929)';
BEGIN

  -- 424 Talcott Place - only Park Ridge local historic landmark in Spanish Town (2011)
  IF NOT EXISTS (SELECT 1 FROM property_events WHERE pin = '12022080160000' AND source_id = 'freundt_spanish_town_2021' AND title = base_title) THEN
    INSERT INTO property_events (pin, event_type, event_year, title, description, source_id)
    VALUES ('12022080160000', 'note', 1927, base_title, base_desc || ' This home is the only Park Ridge local historic landmark in Spanish Town, designated in 2011.', 'freundt_spanish_town_2021');
  END IF;

  -- 428 Talcott Place
  IF NOT EXISTS (SELECT 1 FROM property_events WHERE pin = '12022080150000' AND source_id = 'freundt_spanish_town_2021' AND title = base_title) THEN
    INSERT INTO property_events (pin, event_type, event_year, title, description, source_id)
    VALUES ('12022080150000', 'note', 1927, base_title, base_desc, 'freundt_spanish_town_2021');
  END IF;

  -- 430 Talcott Place
  IF NOT EXISTS (SELECT 1 FROM property_events WHERE pin = '12022080140000' AND source_id = 'freundt_spanish_town_2021' AND title = base_title) THEN
    INSERT INTO property_events (pin, event_type, event_year, title, description, source_id)
    VALUES ('12022080140000', 'note', 1927, base_title, base_desc, 'freundt_spanish_town_2021');
  END IF;

  -- 1305 S Crescent Ave - one of the larger and more elaborate homes
  IF NOT EXISTS (SELECT 1 FROM property_events WHERE pin = '12022090010000' AND source_id = 'freundt_spanish_town_2021' AND title = base_title) THEN
    INSERT INTO property_events (pin, event_type, event_year, title, description, source_id)
    VALUES ('12022090010000', 'note', 1927, base_title, base_desc || ' The article identifies this as one of the larger and more elaborate homes in the development.', 'freundt_spanish_town_2021');
  END IF;

  -- 1309 S Crescent Ave
  IF NOT EXISTS (SELECT 1 FROM property_events WHERE pin = '12022090020000' AND source_id = 'freundt_spanish_town_2021' AND title = base_title) THEN
    INSERT INTO property_events (pin, event_type, event_year, title, description, source_id)
    VALUES ('12022090020000', 'note', 1927, base_title, base_desc, 'freundt_spanish_town_2021');
  END IF;

  -- 1328 S Crescent Ave - one of the larger and more elaborate homes
  IF NOT EXISTS (SELECT 1 FROM property_events WHERE pin = '12022040370000' AND source_id = 'freundt_spanish_town_2021' AND title = base_title) THEN
    INSERT INTO property_events (pin, event_type, event_year, title, description, source_id)
    VALUES ('12022040370000', 'note', 1927, base_title, base_desc || ' The article identifies this as one of the larger and more elaborate homes in the development.', 'freundt_spanish_town_2021');
  END IF;

  -- 1337 S Crescent Ave - has decorative tiles on the front steps (explicitly noted in article)
  IF NOT EXISTS (SELECT 1 FROM property_events WHERE pin = '12022160010000' AND source_id = 'freundt_spanish_town_2021' AND title = base_title) THEN
    INSERT INTO property_events (pin, event_type, event_year, title, description, source_id)
    VALUES ('12022160010000', 'note', 1927, base_title, base_desc || ' This home has decorative tiles on the front steps, a detail specifically noted in the article.', 'freundt_spanish_town_2021');
  END IF;

END $$;
