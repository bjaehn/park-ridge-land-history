-- Per-neighborhood, per-business-district, and per-corridor facts from the
-- 1996 Comprehensive Plan, linked precisely via historical_facts.neighborhood_id
-- (added in 20260705000000) rather than free-text place matching.
--
-- Two kinds of rows are inserted, distinguished by fact_type:
--   - ordinary historical/descriptive facts (fact_type varies, e.g. 'landmark',
--     'demographics', 'institution')
--   - 1996 plan recommendations, fact_type = 'plan_1996_proposal' -- these are
--     NOT claims about what happened, only about what the plan proposed;
--     app UI should render them distinctly (see FactCard's fact_type badge).
--
-- Safe to re-run (ON CONFLICT (fact_id) DO NOTHING).

INSERT INTO historical_facts
  (fact_id, source_id, neighborhood_id, date_start, date_text, category, fact_type, title, summary,
   place_modern, printed_page, confidence, app_use)
VALUES

-- ── South Park (official_planning:south_park) ──────────────────────────────
('crp96-sop-001','park_ridge_comprehensive_plan_1996','official_planning:south_park',NULL,'1996','Land/Buildings','landmark',
 'South Park is anchored by five parks and a fire station',
 'The neighborhood is served by Mary Seat of Wisdom School, Fire Station No. 1, a City Water Reservoir and Pumping Station, South Park, Southwest Park, Brickton Park, and Jaycee Park.',
 'South Park',41,'high','Landmark list for neighborhood contextual panel.'),
('crp96-sop-002','park_ridge_comprehensive_plan_1996','official_planning:south_park',NULL,'1996','Roads/Development','plan_1996_proposal',
 'Reduce non-residential traffic near Higgins and Canfield',
 'The plan recommends encouraging efforts to reduce non-residential traffic in residential areas, especially near the Higgins Road and Canfield Road intersection, and providing off-street parking facilities while removing parking from the Higgins Road parkway.',
 'South Park',41,'high','1996 proposal, transportation category.'),
('crp96-sop-003','park_ridge_comprehensive_plan_1996','official_planning:south_park',NULL,'1996','Land/Property','plan_1996_proposal',
 'Redevelop the Edison Park Home property for single-family use',
 'The plan recommends the Edison Park Home property be developed for single-family residential purposes, and considers office uses (possibly with accessory retail/service) for the garden center property on Higgins Road.',
 'South Park',41,'high','1996 proposal, land use category.'),

-- ── Hodges Park (official_planning:hodges_park) ────────────────────────────
('crp96-hop-001','park_ridge_comprehensive_plan_1996','official_planning:hodges_park',NULL,'1996','Land/Buildings','landmark',
 'A curvilinear subdivision breaks from the city''s original street grid',
 'The curvilinear subdivision southeast of City Hall is described as a unique departure from the original city grid system of streets, complementing the neighborhood''s historic character.',
 'Hodges Park',40,'high','Notable urban-design landmark for the neighborhood page.'),
('crp96-hop-002','park_ridge_comprehensive_plan_1996','official_planning:hodges_park',NULL,'1996','Land/Property','plan_1996_proposal',
 'Preserve the single-family/multi-family mix just south of City Hall',
 'The plan recommends preserving the unique mixture of single-family and multiple-family residential dwellings immediately south of City Hall, alongside reducing land use conflicts where business and institutional uses sit adjacent to residential ones.',
 'Hodges Park',40,'high','1996 proposal, land use category.'),

-- ── Centennial Park (official_planning:centennial_park) ────────────────────
('crp96-cep-001','park_ridge_comprehensive_plan_1996','official_planning:centennial_park',NULL,'1996','Land/Buildings','landmark',
 'Centennial Park neighbors the Town of Maine Cemetery and three schools',
 'Included in this neighborhood are the Town of Maine Cemetery, Washington Elementary School, Lincoln Junior High School, Maine South High School, the Park Ridge Community Center, the Senior Center, Centennial Park itself, and a stretch of Cook County Forest Preserve.',
 'Centennial Park',39,'high','Landmark list for neighborhood contextual panel.'),
('crp96-cep-002','park_ridge_comprehensive_plan_1996','official_planning:centennial_park',NULL,'1996','Land/Property','plan_1996_proposal',
 'Favor multi-family over business along Touhy Avenue west of Chester',
 'The plan recommends considering multi-family residential uses rather than business along Touhy Avenue west of Chester Avenue to Greenwood Avenue, while encouraging additional multi-family residences along Touhy Avenue east of Greenwood.',
 'Centennial Park',40,'high','1996 proposal, land use/housing category.'),

-- ── Northeast Park (official_planning:northeast_park) ──────────────────────
('crp96-nep-001','park_ridge_comprehensive_plan_1996','official_planning:northeast_park',NULL,'1996','Sports/Recreation','landmark',
 'Park Ridge Country Club is the neighborhood''s largest land user',
 'The Park Ridge Country Club is the largest user of land in this neighborhood. Also included are Hinkley Park, Field Elementary School, the Park Ridge Youth Campus, several of the City''s fine boulevards, St. Andrews Lutheran School, and St. Paul of the Cross School.',
 'Northeast Park',38,'high','Landmark list for neighborhood contextual panel.'),
('crp96-nep-002','park_ridge_comprehensive_plan_1996','official_planning:northeast_park',NULL,'1996','Land/Property','plan_1996_proposal',
 'If the Country Club or Youth Campus close, keep the land as open space / single-family',
 'The plan recommends that if the Park Ridge Country Club or the Park Ridge Youth Campus uses ever terminate, the properties should become open space and single-family residential purposes, respectively -- and that the single-family residences at Greenwood/Northwest Highway (SE corner) be redeveloped only as a unit, never as single parcels for multi-family or office use.',
 'Northeast Park',38,'high','1996 proposal, land use category; contingency planning for two major institutional land users.'),

-- ── Maine Park (official_planning:maine_park) ──────────────────────────────
('crp96-map-001','park_ridge_comprehensive_plan_1996','official_planning:maine_park',NULL,'1996','Land/Buildings','landmark',
 'Maine Park''s public facilities include two parks, a forest preserve edge, and a school',
 'Maine Park, Oakton Park, the Cook County Forest Preserve, and Carpenter School provide the area with excellent public facilities, complemented by the Murphy and Park Lakes residential developments.',
 'Maine Park',39,'high','Landmark list for neighborhood contextual panel.'),
('crp96-map-002','park_ridge_comprehensive_plan_1996','official_planning:maine_park',NULL,'1996','Roads/Development','plan_1996_proposal',
 'Reduce traffic congestion on Greenwood Avenue; improve the Public Works site',
 'The plan recommends reducing traffic congestion on Greenwood Avenue and improving the Public Works facility (at Elm Street and Greenwood Avenue) to mitigate its impacts, possibly relocating certain activities.',
 'Maine Park',39,'high','1996 proposal, transportation/facilities category.'),

-- ── Northwest Park (official_planning:northwest_park) ──────────────────────
('crp96-nwp-001','park_ridge_comprehensive_plan_1996','official_planning:northwest_park',NULL,'1996','Buildings/Civic','landmark',
 'Lutheran General Hospital and Maine East High School are the neighborhood''s two largest land users',
 'Both institutions front Dempster Street. The neighborhood also has the highest proportion of multi-family residences of any neighborhood in the City, including the Resurrection Nursing Pavilion, the Beau Ridge Townhomes, and the St. Matthews Lutheran Home for the Aged at Weeg Way and Western.',
 'Northwest Park',37,'high','Landmark list for neighborhood contextual panel.'),
('crp96-nwp-002','park_ridge_comprehensive_plan_1996','official_planning:northwest_park',NULL,'1996','Roads/Development','plan_1996_proposal',
 'Relocate the Dee Road Metra station and improve pedestrian safety near the hospital',
 'The plan recommends relocating the Dee Road Metra station area with improved parking facilities, and improving pedestrian safety conditions in the vicinity of Lutheran General Hospital -- alongside establishing a new park in the triangle bounded by Dee Road, Busse Highway, and Oakton Street.',
 'Northwest Park',38,'high','1996 proposal, transportation/facilities category; cross-references the Dee Park business district.'),

-- ── Ballard-Church (official_planning:ballard_church) ───────────────────────
('crp96-bcc-001','park_ridge_comprehensive_plan_1996','official_planning:ballard_church',NULL,'1993','Buildings/Civic','institution_established',
 'Lutheran General''s 1993 master plan focused expansion on the North Campus',
 'In 1993 Lutheran General Hospital completed a preliminary long-range campus master plan envisioning limited expansion on the South and West campuses but major facility expansion on the North Campus, which sits in this neighborhood.',
 'Ballard-Church',34,'high','Cross-references the Lutheran General Hospital business-district record.'),
('crp96-bcc-002','park_ridge_comprehensive_plan_1996','official_planning:ballard_church',NULL,'1996','Government/Boundaries','plan_1996_proposal',
 'Annex compatible areas and press Cook County to inspect multi-family housing',
 'The plan recommends annexing selected unincorporated areas that are compatible with Park Ridge, and encourages Cook County to inspect multi-family housing, enforce existing codes, and consider improved codes -- since the unincorporated portion of this neighborhood was, by the plan''s own description, "by some standards overcrowded."',
 'Ballard-Church',34,'high','1996 proposal, land use/housing category; explains why this neighborhood was included in city planning despite limited City jurisdiction.')

ON CONFLICT (fact_id) DO NOTHING;
