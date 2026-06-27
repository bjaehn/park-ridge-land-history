-- Data migration: "Spanish Town" historical facts as property_events.
--
-- Source: "Park Ridge's Spanish Town" by Rachel Freundt,
-- Architecture and History of Chicagoland (Substack), April 30, 2021.
-- URL: https://chicagolandarchitecture.substack.com/p/park-ridges-spanish-town
--
-- Adds one base "Spanish Town" note to each of the seven photographed
-- addresses, plus property-specific notes where the article provides them.
-- Also adds a site note for 726 Hastings Street (Bruns' former residence,
-- now demolished).
--
-- Idempotent: every insert is guarded by a NOT EXISTS check on (pin, title).

-- ─── 1. Register the article as a source ────────────────────────────────────

INSERT INTO source_registry (
  source_key, source_name, source_type, source_url,
  publisher, access_method, coverage_area, coverage_years,
  notes, confidence_default
)
VALUES (
  'chicagoland_arch_spanish_town_2021',
  'Park Ridge''s "Spanish Town" — Architecture and History of Chicagoland',
  'manual_entry',
  'https://chicagolandarchitecture.substack.com/p/park-ridges-spanish-town',
  'Rachel Freundt',
  'manual',
  'Park Ridge, IL — Talcott Place and South Crescent Avenue',
  '1927–1929',
  'Article (April 30, 2021) documenting the Spanish Colonial Revival "Spanish Town" development by developer William Durchslag (Durchslag Real Estate Development Corporation) and architect Benedict J. Bruns (1881–1967) in Kinsey''s Talcott Road Subdivision of Park Ridge.',
  'high'
)
ON CONFLICT (source_key) DO NOTHING;

-- ─── 2. Base note for all seven Spanish Town addresses ───────────────────────

DO $$
DECLARE
  src_id uuid;
  base_title text := 'Part of "Spanish Town" development';
  base_desc  text :=
    'One of approximately twelve Spanish Colonial Revival homes built circa 1927–1929 '
    'as part of the "Spanish Town" development. '
    'Architect: Benedict J. Bruns (1881–1967). '
    'Developer: William Durchslag, Durchslag Real Estate Development Corporation. '
    'Located in Kinsey''s Talcott Road Subdivision of Park Ridge. '
    'Construction: masonry cement block and brick with textured stucco finish inside and out; clay tile roof. '
    'Interiors featured hardwood and marble floors, sunken living rooms, arched doorways, vaulted ceilings, '
    'and sometimes a balcony overlooking the stairway. '
    'Original cost: $17,000–$20,000. '
    'The style was inspired by developer Durchslag''s firsthand experience of Spanish Colonial Revival '
    'architecture in Cuba.';
  addresses text[] := ARRAY[
    '424 TALCOTT', '428 TALCOTT', '430 TALCOTT',
    '1305 S CRESCENT', '1309 S CRESCENT',
    '1328 S CRESCENT', '1337 S CRESCENT'
  ];
  addr  text;
  p_pin text;
BEGIN
  SELECT id INTO src_id
  FROM source_registry
  WHERE source_key = 'chicagoland_arch_spanish_town_2021';

  IF src_id IS NULL THEN RETURN; END IF;

  FOREACH addr IN ARRAY addresses LOOP
    SELECT pin_normalized INTO p_pin
    FROM parcels
    WHERE address ILIKE addr || '%'
      AND municipality ILIKE '%PARK RIDGE%'
    ORDER BY address
    LIMIT 1;

    IF p_pin IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM property_events
         WHERE pin = p_pin AND title = base_title AND source_id = src_id
       )
    THEN
      INSERT INTO property_events (pin, event_type, title, description, source_id)
      VALUES (p_pin, 'note', base_title, base_desc, src_id);
    END IF;
  END LOOP;
END $$;

-- ─── 3. Landmark designation — 424 Talcott Place ────────────────────────────

DO $$
DECLARE
  src_id uuid;
  p_pin  text;
  lm_title text := 'Designated Park Ridge local historic landmark (2011)';
BEGIN
  SELECT id INTO src_id FROM source_registry
  WHERE source_key = 'chicagoland_arch_spanish_town_2021';

  SELECT pin_normalized INTO p_pin FROM parcels
  WHERE address ILIKE '424 TALCOTT%'
    AND municipality ILIKE '%PARK RIDGE%'
  LIMIT 1;

  IF p_pin IS NOT NULL AND src_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM property_events WHERE pin = p_pin AND title = lm_title
     )
  THEN
    INSERT INTO property_events (pin, event_type, event_year, title, description, source_id)
    VALUES (
      p_pin, 'note', 2011, lm_title,
      '424 Talcott Place is the only home in Park Ridge''s "Spanish Town" to be '
      'designated a local historic landmark, which occurred in 2011. It is the sole '
      'property in the development with formal landmark protection.',
      src_id
    );
  END IF;
END $$;

-- ─── 4. Larger / more elaborate — 1305 and 1328 S Crescent ──────────────────

DO $$
DECLARE
  src_id uuid;
  p_pin  text;
  addr   text;
  elab_title text := 'One of the larger, more elaborate homes in "Spanish Town"';
  elab_desc  text :=
    'Identified by architectural historian Rachel Freundt as one of the larger and '
    'more elaborate residences within the "Spanish Town" development on Talcott Place '
    'and South Crescent Avenue.';
BEGIN
  SELECT id INTO src_id FROM source_registry
  WHERE source_key = 'chicagoland_arch_spanish_town_2021';

  IF src_id IS NULL THEN RETURN; END IF;

  FOREACH addr IN ARRAY ARRAY['1305 S CRESCENT', '1328 S CRESCENT'] LOOP
    SELECT pin_normalized INTO p_pin FROM parcels
    WHERE address ILIKE addr || '%'
      AND municipality ILIKE '%PARK RIDGE%'
    LIMIT 1;

    IF p_pin IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM property_events WHERE pin = p_pin AND title = elab_title
       )
    THEN
      INSERT INTO property_events (pin, event_type, title, description, source_id)
      VALUES (p_pin, 'note', elab_title, elab_desc, src_id);
    END IF;
  END LOOP;
END $$;

-- ─── 5. Original tile detail — 1337 S Crescent ──────────────────────────────

DO $$
DECLARE
  src_id uuid;
  p_pin  text;
  tile_title text := 'Original decorative tile on front steps';
BEGIN
  SELECT id INTO src_id FROM source_registry
  WHERE source_key = 'chicagoland_arch_spanish_town_2021';

  SELECT pin_normalized INTO p_pin FROM parcels
  WHERE address ILIKE '1337 S CRESCENT%'
    AND municipality ILIKE '%PARK RIDGE%'
  LIMIT 1;

  IF p_pin IS NOT NULL AND src_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM property_events WHERE pin = p_pin AND title = tile_title
     )
  THEN
    INSERT INTO property_events (pin, event_type, title, description, source_id)
    VALUES (
      p_pin, 'note', tile_title,
      '1337 South Crescent retains its original decorative tiles on the front steps — '
      'a distinctive Spanish Colonial Revival detail noted by architectural historian '
      'Rachel Freundt.',
      src_id
    );
  END IF;
END $$;

-- ─── 6. Site of Bruns' former residence — 726 Hastings Street ───────────────

DO $$
DECLARE
  src_id uuid;
  p_pin  text;
  bruns_title text := 'Former home of architect Benedict J. Bruns (1927–1967)';
BEGIN
  SELECT id INTO src_id FROM source_registry
  WHERE source_key = 'chicagoland_arch_spanish_town_2021';

  SELECT pin_normalized INTO p_pin FROM parcels
  WHERE address ILIKE '726%HASTINGS%'
    AND municipality ILIKE '%PARK RIDGE%'
  LIMIT 1;

  IF p_pin IS NOT NULL AND src_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM property_events WHERE pin = p_pin AND title = bruns_title
     )
  THEN
    INSERT INTO property_events (pin, event_type, title, description, source_id)
    VALUES (
      p_pin, 'note', bruns_title,
      'Architect Benedict J. Bruns (1881–1967) — designer of all homes in the nearby '
      '"Spanish Town" development on Talcott Place and South Crescent Avenue — lived '
      'at this address from 1927 until his death in January 1967. The house overlooked '
      'the Park Ridge Country Club. The original residence has since been demolished.',
      src_id
    );
  END IF;
END $$;
