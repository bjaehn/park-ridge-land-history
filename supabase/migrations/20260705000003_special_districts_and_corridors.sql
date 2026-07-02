-- Adds the 1996 Comprehensive Plan's "special districts" to the neighborhoods
-- table: the Central Business District (Uptown), Dee Park District, South
-- Park Business District, and Lutheran General Hospital become
-- business_district rows (reusing the taxonomy that already exists for
-- commercial zones); Busse Highway, Higgins Road, and Touhy Avenue become a
-- new corridor type, since they're linear road frontages rather than the
-- polygon-shaped areas the rest of the table models.
--
-- The old official_planning:uptown_park_ridge row had 0 parcels assigned
-- (it was never a real residential neighborhood -- the plan treats it as a
-- business district), so retiring it in favor of business_district:uptown_cbd
-- is not a data-loss risk. Its existing placeholder rectangle geometry is
-- reused as a starting point.
--
-- All new geometries here are small placeholder boxes near the intersections
-- the plan names (Oakton/Busse/Dee Road for Dee Park; Devon/Talcott/Courtland
-- for South Park Business District; Dempster west of Greenwood for Lutheran
-- General) rather than measured from real street-address data the way the
-- 7 official planning neighborhoods were -- so these are explicitly rougher
-- and marked accordingly. Corridor geometry is a thin buffer along the
-- relevant street's own parcel addresses where available.
--
-- Safe to re-run (ON CONFLICT / IF NOT EXISTS guards throughout).

-- ─── 1. Extend neighborhood_type to allow 'corridor' ─────────────────────────

ALTER TABLE neighborhoods DROP CONSTRAINT IF EXISTS neighborhoods_neighborhood_type_check;
ALTER TABLE neighborhoods
  ADD CONSTRAINT neighborhoods_neighborhood_type_check
  CHECK (neighborhood_type IN ('official_planning', 'business_district', 'local_market', 'corridor'));

-- ─── 2. Retire the placeholder official_planning Uptown row (0 parcels) ─────

DELETE FROM neighborhoods WHERE id = 'official_planning:uptown_park_ridge';

-- ─── 3. Business districts ────────────────────────────────────────────────

INSERT INTO neighborhoods (id, label, slug, neighborhood_type, geometry, short_description, historical_summary, boundary_source, boundary_confidence, review_status)
VALUES
  ('business_district:uptown_cbd', 'Central Business District (Uptown)', 'uptown_cbd', 'business_district',
   ST_Multi(ST_GeomFromText('POLYGON((-87.843 41.995,-87.837 41.995,-87.837 42.008,-87.843 42.008,-87.843 41.995))', 4326)),
   'The traditional downtown, anchored by the Metra station, Library, City Hall, and Pickwick Theater.',
   'The Uptown district has represented Park Ridge''s community well for over 100 years. Landmark buildings include the NBD Bank, the Public Library (built 1958, expanded 1977, at 20 South Prospect Avenue), the Pickwick Theater, City Hall (built 1955 in a colonial style, expanded 1987), and several churches. The 1980s revitalization added the Summit shopping center and condominiums and the new Pickwick Plaza. The district is split by the Union Pacific railroad and Northwest Highway/Touhy Avenue/Prospect Avenue -- a six-corner intersection the plan calls the City''s most congested. South of the tracks, a handsome "village green" setting around Hodges Park includes City Hall and a church.',
   'Reused the pre-existing official_planning:uptown_park_ridge placeholder rectangle (not measured from address data).', 'low', 'needs_review'),

  ('business_district:dee_park', 'Dee Park District', 'dee_park', 'business_district',
   ST_Multi(ST_GeomFromText('POLYGON((-87.862 42.017,-87.854 42.017,-87.854 42.023,-87.862 42.023,-87.862 42.017))', 4326)),
   'Auto-oriented post-WWII business district around the Dee Road Metra station (formerly known as Crossroads).',
   'The Dee Park district (formerly the Crossroads district) grew up around automobile traffic on Oakton Street, Northwest Highway, and Busse Highway, serving daily needs for the Northwest Park and Maine Park neighborhoods. It includes the Dee Road Metra station and numerous multi-family residences, including the 72-unit Gallery development at Busse Highway and Bouterse Avenue. The 1996 plan recommends relocating the Metra station northwest between Oakton Street and Dee Road for a larger, better-accessed site, and creating a new public park in the triangle formed by Oakton Street, Busse Highway, and Dee Road.',
   'Rough placeholder near the Oakton St / Busse Hwy intersection (not measured from Dee Road address data, which this dataset does not separately capture).', 'low', 'needs_review'),

  ('business_district:south_park_business_district', 'South Park Business District', 'south_park_business_district', 'business_district',
   ST_Multi(ST_GeomFromText('POLYGON((-87.840 41.994,-87.836 41.994,-87.836 41.998,-87.840 41.998,-87.840 41.994))', 4326)),
   'Traditional neighborhood convenience business district at Devon, Talcott, and Courtland.',
   'A traditional neighborhood convenience business district with historic buildings dating to the early 20th century alongside post-WWII construction, adjacent to Roosevelt Elementary School and the South Park recreational complex. The Devon/Talcott/Courtland intersection carries heavy traffic and lost much of its historic character to street widening, though the landscaped median on Devon Avenue west of the intersection remains. The plan singles out the "flat iron" building at Talcott and Devon for preservation and rehabilitation, and notes considerable recent private investment as evidence of strong market demand from surrounding neighborhoods.',
   'Rough placeholder near the Devon Ave / Talcott Rd / Courtland Ave intersection (not measured from address data).', 'low', 'needs_review'),

  ('business_district:lutheran_general_hospital', 'Lutheran General Hospital', 'lutheran_general_hospital', 'business_district',
   ST_Multi(ST_GeomFromText('POLYGON((-87.845 42.036,-87.838 42.036,-87.838 42.043,-87.845 42.043,-87.845 42.036))', 4326)),
   'The City''s largest employer, split by Dempster Street into North, South, and West campuses.',
   'Lutheran General Hospital and its related health care activities occupy a 64-acre campus divided by Dempster Street west of Greenwood Avenue -- the City''s largest employer and one of the largest hospitals in the Chicago area. The 22-acre South Campus (between Luther Lane and Western Avenue) holds the multi-story hospital; the 8-acre West Campus holds administrative and health-care facilities; the 28-acre North Campus (across Dempster) holds the Nesset Health Center and most hospital parking. A 1993 preliminary campus master plan envisioned major expansion on the North Campus and an enclosed pedestrian bridge connecting the North and South Campuses across Dempster Street, though the plan notes no official approval had been requested or granted as of 1996.',
   'Rough placeholder centered on Dempster St west of Greenwood Ave (not measured from address data).', 'low', 'needs_review')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Corridors ─────────────────────────────────────────────────────────

INSERT INTO neighborhoods (id, label, slug, neighborhood_type, geometry, short_description, historical_summary, boundary_source, boundary_confidence, review_status)
SELECT
  'corridor:busse_highway', 'Busse Highway Corridor', 'busse_highway_corridor', 'corridor',
  ST_Multi(ST_Buffer(hull, 0.0015)),
  'Commercial corridor linking Dee Park to the Central Business District, paired with the residential Northwest Highway corridor.',
  'Part of a larger Busse Highway/Northwest Highway corridor running from the Dee Park district to the Central Business District. The Northwest Highway side is predominantly residential except near Western/Elm (retail and office); the Busse Highway side, by contrast, is predominantly commercial -- professional offices, fast food, utilities, auto repair -- except for a multi-family stretch on its northeast side between Rowe and Western. The interior between the two roads (Rowe to Western) is single-family residential with attractive boulevards. The plan flags an excessive number of curb cuts between Busse Highway and the railroad tracks as a recurring appearance problem.',
  'Buffered convex hull of parcels addressed on Busse Highway (from this app''s own address data); a rough approximation of the corridor, not the full Northwest Highway pairing described in the plan.', 'low', 'needs_review'
FROM (SELECT ST_ConvexHull(ST_Collect(geometry)) AS hull FROM parcels WHERE street_name_normalized = 'busse hwy') s
ON CONFLICT (id) DO NOTHING;

INSERT INTO neighborhoods (id, label, slug, neighborhood_type, geometry, short_description, historical_summary, boundary_source, boundary_confidence, review_status)
SELECT
  'corridor:higgins_road', 'Higgins Road Corridor', 'higgins_road_corridor', 'corridor',
  ST_Multi(ST_Buffer(hull, 0.0015)),
  'The boundary corridor between Park Ridge and Chicago, near O''Hare and the Kennedy Expressway.',
  'Higgins Road forms the boundary between Park Ridge and the City of Chicago, with different land use and development standards on each side reflecting the influence of the Kennedy Expressway and O''Hare International Airport. East of Cumberland Avenue, parcels are shallow (only half a block deep), zoned general commercial, and often lack adequate off-street parking; west of Cumberland, properties are larger and more planned, including a shopping center, the O''Hare Corporate Center, and the Big Ten Conference headquarters. The plan recommends redeveloping a garden center at the corridor''s western end -- whose function, appearance, and odors it calls "inappropriate at this location" -- as a planned office complex.',
  'Buffered convex hull of parcels addressed on Higgins Road (from this app''s own address data).', 'low', 'needs_review'
FROM (SELECT ST_ConvexHull(ST_Collect(geometry)) AS hull FROM parcels WHERE street_name_normalized = 'higgins rd') s
ON CONFLICT (id) DO NOTHING;

INSERT INTO neighborhoods (id, label, slug, neighborhood_type, geometry, short_description, historical_summary, boundary_source, boundary_confidence, review_status)
SELECT
  'corridor:touhy_avenue', 'Touhy Avenue Corridor', 'touhy_avenue_corridor', 'corridor',
  ST_Multi(ST_Buffer(hull, 0.0015)),
  'Auto-oriented mixed multi-family and commercial corridor from Cumberland to Lincoln Avenue.',
  'From Cumberland Avenue to Lincoln Avenue, Touhy Avenue mixes multi-family residential with auto-oriented commercial uses -- a grocery store, restaurant, fast-food outlets, gasoline stations, and convenience shops -- at a lower standard of site and signage maintenance than the Central Business District. The plan recommends that permitted uses here directly support the CBD and adjacent residential neighborhoods rather than simply serve passing traffic, and that multi-family residential replace some business zoning west of Chester Avenue.',
  'Buffered convex hull of parcels addressed on Touhy Avenue (from this app''s own address data).', 'low', 'needs_review'
FROM (SELECT ST_ConvexHull(ST_Collect(geometry)) AS hull FROM parcels WHERE street_name_normalized in ('e touhy ave','w touhy ave')) s
ON CONFLICT (id) DO NOTHING;
