-- Replaces the app's 5 invented, era-based "neighborhoods" with the City of
-- Park Ridge's real 7 official planning neighborhoods, as named and bounded
-- (in general terms) by the 1996 Comprehensive Plan.
--
-- Investigation found that the existing official_planning:northwest_park
-- row's 1,565 assigned parcels actually sit in the central/east part of the
-- city (lat 41.997-42.028, lon -87.840 to -87.832) -- nowhere near the real
-- northwest corner -- so this was a mislabeling, not just a naming gap.
-- official_planning:south_park's geometry, by contrast, checks out: its
-- northern edge (lat 41.99673) matches Devon Avenue's real parcel-address
-- latitude band (41.99592-41.99702) almost exactly, so it is left alone.
--
-- Boundary method: rather than trace the scanned 1996 neighborhood map
-- (Figure 11) freehand, boundaries here are axis-aligned cuts along the real
-- lat/lon bands of the streets the plan names as neighborhood edges (Devon
-- Ave, Touhy Ave, Dempster St, Greenwood Ave), computed from this app's own
-- parcel address data. This is a best-effort approximation -- it doesn't
-- follow the diagonal railroad/Northwest Highway or the Des Plaines River
-- forest-preserve edge -- so every new/changed row is marked
-- boundary_confidence = 'low' and review_status = 'needs_review' for later
-- refinement via the admin boundary map editor.
--
-- Safe to re-run: guarded by ON CONFLICT and idempotent UPDATE thresholds.

-- ─── 1. Insert the 5 new official planning neighborhoods ─────────────────────

INSERT INTO neighborhoods (id, label, slug, neighborhood_type, boundary_source, boundary_confidence, review_status)
VALUES
  ('official_planning:ballard_church',   'Ballard-Church',   'ballard_church',   'official_planning',
   'Approximated as all parcels north of Dempster St / Ballard Rd (lat >= 42.038), per 1996 Comprehensive Plan p.34.', 'low', 'needs_review'),
  ('official_planning:northeast_park',   'Northeast Park',   'northeast_park',   'official_planning',
   'Approximated as lat 42.011-42.038 (Touhy Ave to Dempster St), lon >= -87.841 (east of Greenwood Ave), per 1996 Comprehensive Plan p.38.', 'low', 'needs_review'),
  ('official_planning:maine_park',       'Maine Park',       'maine_park',       'official_planning',
   'Approximated as lat 42.011-42.029 (Touhy Ave north), lon < -87.841 (west of Greenwood Ave), per 1996 Comprehensive Plan p.39.', 'low', 'needs_review'),
  ('official_planning:centennial_park',  'Centennial Park',  'centennial_park',  'official_planning',
   'Approximated as lat 41.9967-42.011 (Devon Ave to Touhy Ave), lon < -87.841 (west of Greenwood Ave), per 1996 Comprehensive Plan p.39.', 'low', 'needs_review'),
  ('official_planning:hodges_park',      'Hodges Park',      'hodges_park',      'official_planning',
   'Approximated as lat 41.9967-42.011 (Devon Ave to Touhy Ave), lon >= -87.841 (east of Greenwood Ave), per 1996 Comprehensive Plan p.40.', 'low', 'needs_review')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Recompute official_planning_neighborhood_id for every parcel ─────────
-- One deterministic geographic pass, so the previously mislabeled
-- northwest_park parcels move to wherever they actually belong.

UPDATE parcels SET official_planning_neighborhood_id = 'official_planning:south_park'
WHERE ST_Y(ST_Centroid(geometry)) < 41.9967;

UPDATE parcels SET official_planning_neighborhood_id = 'official_planning:hodges_park'
WHERE ST_Y(ST_Centroid(geometry)) >= 41.9967 AND ST_Y(ST_Centroid(geometry)) < 42.011
  AND ST_X(ST_Centroid(geometry)) >= -87.841;

UPDATE parcels SET official_planning_neighborhood_id = 'official_planning:centennial_park'
WHERE ST_Y(ST_Centroid(geometry)) >= 41.9967 AND ST_Y(ST_Centroid(geometry)) < 42.011
  AND ST_X(ST_Centroid(geometry)) < -87.841;

UPDATE parcels SET official_planning_neighborhood_id = 'official_planning:northeast_park'
WHERE ST_Y(ST_Centroid(geometry)) >= 42.011 AND ST_Y(ST_Centroid(geometry)) < 42.038
  AND ST_X(ST_Centroid(geometry)) >= -87.841;

UPDATE parcels SET official_planning_neighborhood_id = 'official_planning:maine_park'
WHERE ST_Y(ST_Centroid(geometry)) >= 42.011 AND ST_Y(ST_Centroid(geometry)) < 42.029
  AND ST_X(ST_Centroid(geometry)) < -87.841;

UPDATE parcels SET official_planning_neighborhood_id = 'official_planning:northwest_park'
WHERE ST_Y(ST_Centroid(geometry)) >= 42.029 AND ST_Y(ST_Centroid(geometry)) < 42.038
  AND ST_X(ST_Centroid(geometry)) < -87.841;

UPDATE parcels SET official_planning_neighborhood_id = 'official_planning:ballard_church'
WHERE ST_Y(ST_Centroid(geometry)) >= 42.038;

-- ─── 3. Derive each neighborhood's geometry from its now-assigned parcels ────
-- (Real parcel-shaped outlines, not hand-drawn boxes; still an approximation
-- because the underlying assignment above is axis-aligned.)

UPDATE neighborhoods n
SET geometry = sub.hull,
    boundary_confidence = 'low',
    review_status = 'needs_review'
FROM (
  SELECT official_planning_neighborhood_id AS id, ST_Multi(ST_ConvexHull(ST_Collect(geometry))) AS hull
  FROM parcels
  WHERE official_planning_neighborhood_id IS NOT NULL
  GROUP BY official_planning_neighborhood_id
) sub
WHERE n.id = sub.id;

-- ─── 4. Narrative + short description for all 7 official planning rows ──────

UPDATE neighborhoods SET
  short_description = 'City''s last great build-out, mostly single-family south of Devon Avenue.',
  historical_summary = 'South Park occupies the entire sector of the City south of Devon Avenue. Though predominantly single-family, it shows real diversity at its edges: the South Park Business District in its northeast corner, a mixed business/multi-family corridor along Higgins Road, and the Cook County Forest Preserve along its western edge. The Cumberland Avenue interchange with the Kennedy Expressway forms the City''s southern entrance.'
WHERE id = 'official_planning:south_park';

UPDATE neighborhoods SET
  short_description = 'Historic homes and subdivisions south of Touhy Avenue, sharing the Central Business District with Northeast Park.',
  historical_summary = 'Hodges Park contains a portion of the Central Business District along with some of the City''s most historic single-family homes and subdivisions -- including the curvilinear subdivision southeast of City Hall, a deliberate departure from Park Ridge''s original street grid. The neighborhood is anchored by Roosevelt School, Hodges Park, Cumberland Park, Ridge Park, and Rotary Park, and borders the South Park Business District at its southern edge.'
WHERE id = 'official_planning:hodges_park';

UPDATE neighborhoods SET
  short_description = 'Stable single-family area west of the Central Business District, home to Maine South High School.',
  historical_summary = 'A stable, predominantly single-family neighborhood containing the Town of Maine Cemetery, Washington Elementary School, Lincoln Junior High School, Maine South High School, the Park Ridge Community Center and Senior Center, Centennial Park, and a stretch of the Cook County Forest Preserve. A limited number of businesses sit along Touhy Avenue in the neighborhood''s northeast corner.'
WHERE id = 'official_planning:centennial_park';

UPDATE neighborhoods SET
  short_description = 'Named for the Country Club; the City''s Central Business District sits at its southern edge.',
  historical_summary = 'The Park Ridge Country Club is the largest single land user in this neighborhood, alongside Hinkley Park, Field Elementary School, the Park Ridge Youth Campus, several of the City''s fine boulevards, and St. Andrews Lutheran and St. Paul of the Cross schools. The Central Business District and part of the Busse Highway corridor fall within its bounds, but the balance of the neighborhood is predominantly single-family, including some of the community''s oldest and most historic homes.'
WHERE id = 'official_planning:northeast_park';

UPDATE neighborhoods SET
  short_description = 'Southwest of the Union Pacific tracks, served by both the Dee Road and downtown Metra stations.',
  historical_summary = 'Located southwest of the Union Pacific railroad tracks and served by Metra stations at Dee Road and in the Central Business District, this is predominantly a single-family neighborhood except for multi-family residences along its southern boundary at Touhy Avenue. Maine Park, Oakton Park, the Cook County Forest Preserve, and Carpenter School provide excellent public facilities, alongside the Murphy and Park Lakes developments. The City''s Public Works facility sits at Elm Street and Greenwood Avenue.'
WHERE id = 'official_planning:maine_park';

UPDATE neighborhoods SET
  short_description = 'Home to Lutheran General Hospital''s South and West campuses and Maine East High School, both on Dempster Street.',
  historical_summary = 'Named for the park at Dee Road and Glenview Avenue, next to Franklin Elementary School. The two largest land users are Lutheran General Hospital and Maine East High School, both fronting Dempster Street; the hospital''s campus plan envisions further expansion here. This neighborhood has the highest proportion of multi-family residences of any in the City, including the Resurrection Nursing Pavilion, the Beau Ridge Townhomes, and the St. Matthews Lutheran Home for the Aged. The Dee Park (formerly Crossroads) business district and Dee Road Metra station also fall within its bounds.'
WHERE id = 'official_planning:northwest_park';

UPDATE neighborhoods SET
  short_description = 'Anchored by Lutheran General Hospital''s North Campus; partly unincorporated Cook County.',
  historical_summary = 'The incorporated portion of this neighborhood includes Lutheran General Hospital''s North Campus, a multi-family area east of it, and single-family homes north of Ballard Road. Its unincorporated Cook County portions -- commercial nodes at Potter Road/Dempster Street and Potter Road/Ballard Road, a substantial medium-to-high-density multi-family area, and single-family homes in the northeast -- were included in the 1996 plan specifically so the City would have policies for dealing with the County, even though it lacks direct authority there.'
WHERE id = 'official_planning:ballard_church';

-- ─── 5. Retire the legacy neighborhood_id backfill note ─────────────────────
COMMENT ON TABLE neighborhoods IS
  'official_planning rows re-derived 2026-07-02 from the 1996 City of Park Ridge Comprehensive Plan; see 20260705000002 migration for method and confidence caveats.';
