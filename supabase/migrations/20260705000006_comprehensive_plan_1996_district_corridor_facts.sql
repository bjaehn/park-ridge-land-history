-- Facts for the 4 business districts and 3 corridors added in
-- 20260705000003, linked via historical_facts.neighborhood_id.
-- Safe to re-run (ON CONFLICT (fact_id) DO NOTHING).

INSERT INTO historical_facts
  (fact_id, source_id, neighborhood_id, date_start, date_text, category, fact_type, title, summary,
   place_modern, printed_page, confidence, app_use)
VALUES

-- ── Central Business District / Uptown ─────────────────────────────────────
('crp96-cbd-001','park_ridge_comprehensive_plan_1996','business_district:uptown_cbd',NULL,'1980s','Business District','redevelopment',
 '1980s revitalization added Summit, Pickwick Plaza, and downtown public parking',
 'During the 1980s the historic core east of Prospect Avenue and north of the railroad was revitalized with the Summit shopping center and condominiums, the new Pickwick Plaza, public parking facilities in the block north of Northwest Highway, and enhanced landscaping -- though the plan says the area "has not yet achieved its ultimate potential."',
 'Central Business District (Uptown)',58,'high','Redevelopment-history fact for the CBD business district page.'),
('crp96-cbd-002','park_ridge_comprehensive_plan_1996','business_district:uptown_cbd',NULL,'1996','Roads/Development','plan_1996_proposal',
 'Redevelop the auto-dealer block if dealers ever relocate',
 'The plan recommends automobile dealers be encouraged to remain north of Touhy Avenue as long as possible; if they relocate, it recommends redeveloping that area as multi-family residences supported by convenience retail, given its walking-distance proximity to the downtown railroad station and Hinkley Park.',
 'Central Business District (Uptown)',59,'high','1996 proposal, land use category.'),
('crp96-cbd-003','park_ridge_comprehensive_plan_1996','business_district:uptown_cbd',NULL,'1996','Roads/Development','plan_1996_proposal',
 'The six-corner intersection has the City''s worst congestion, with few good fixes',
 'The Prospect/Touhy/Northwest Highway intersection experiences the heaviest congestion in the City, but the plan concludes that "radical improvement would destroy the character of the CBD only to accommodate through traffic which does not support the district or the community."',
 'Central Business District (Uptown)',58,'high','Explains why no major intersection redesign is proposed despite acknowledged congestion.'),

-- ── Dee Park District ────────────────────────────────────────────────────
('crp96-dee-001','park_ridge_comprehensive_plan_1996','business_district:dee_park',NULL,'1996','Business District','description',
 'Dee Park serves daily needs for two neighborhoods but lacks a defined form',
 'The district serves many daily needs of the Northwest Park and Maine Park neighborhoods with a mix of convenience retail, fast food, gas stations, and auto shops, but "neither its function nor its form are well defined," per the plan.',
 'Dee Park',48,'high','Baseline description for the Dee Park business-district page.'),
('crp96-dee-002','park_ridge_comprehensive_plan_1996','business_district:dee_park',NULL,'1996','Roads/Development','plan_1996_proposal',
 'Relocate the Dee Road Metra station northwest for a larger, better-access site',
 'The plan recommends relocating the Dee Road commuter rail station to the northwest, between Oakton Street and Dee Road, acquiring the two businesses on that block if they become available -- or, failing relocation, upgrading and remodeling the existing station.',
 'Dee Park',49,'high','1996 proposal, transportation category; also referenced on the Northwest Park neighborhood page.'),

-- ── South Park Business District ────────────────────────────────────────────
('crp96-spb-001','park_ridge_comprehensive_plan_1996','business_district:south_park_business_district',NULL,'1996','Business District','landmark',
 'The "flat iron" building anchors the Talcott/Devon intersection',
 'The plan calls out the historic "flat iron" building at the intersection of Talcott Road and Devon Avenue for preservation and rehabilitation, alongside street-tree additions on its north side.',
 'South Park Business District',53,'high','Landmark fact for the district page.'),
('crp96-spb-002','park_ridge_comprehensive_plan_1996','business_district:south_park_business_district',NULL,'1996','Roads/Development','plan_1996_proposal',
 'Redesign Prospect Avenue as one-way southbound with diagonal parking',
 'The plan recommends redesigning Prospect Avenue between Talcott and Devon to widen and landscape sidewalks, provide diagonal parking, and route traffic one-way southbound.',
 'South Park Business District',54,'high','1996 proposal, transportation category.'),

-- ── Lutheran General Hospital ────────────────────────────────────────────────
('crp96-lgh-001','park_ridge_comprehensive_plan_1996','business_district:lutheran_general_hospital',NULL,'1996','Buildings/Civic','plan_1996_proposal',
 'A grade-separated pedestrian bridge was proposed to connect the North and South campuses',
 'The 1993 preliminary campus master plan envisioned an enclosed pedestrian bridge over Dempster Street connecting the North and South Campuses to improve pedestrian safety and reduce congestion; as of 1996, no official approval had been requested or granted.',
 'Lutheran General Hospital',46,'high','1996 proposal, transportation/facilities category.'),
('crp96-lgh-002','park_ridge_comprehensive_plan_1996','business_district:lutheran_general_hospital',NULL,'1996','Land/Property','plan_1996_proposal',
 'Cap South Campus expansion; expand the North Campus instead',
 'The plan recommends the South Campus continue to accommodate the hospital but with limited expansion since it already represents the campus''s highest-density use, while the North Campus may accommodate expanded health care facilities, related parking, and stormwater detention.',
 'Lutheran General Hospital',44,'high','1996 proposal, land use category.'),

-- ── Busse Highway Corridor ───────────────────────────────────────────────────
('crp96-bhc-001','park_ridge_comprehensive_plan_1996','corridor:busse_highway',NULL,'1996','Business/Address','description',
 'Excessive curb cuts are a recurring problem between Busse Highway and the railroad',
 'Property maintenance and appearance vary from excellent to unsatisfactory along this stretch, and the plan specifically flags "the number of curb cuts" as excessive.',
 'Busse Highway Corridor',51,'high','Baseline description for the corridor page.'),
('crp96-bhc-002','park_ridge_comprehensive_plan_1996','corridor:busse_highway',NULL,'1996','Land/Property','plan_1996_proposal',
 'Rezone some B-1 parcels to R-4 to reflect real multi-family use',
 'The plan recommends rezoning several multi-family buildings northwest of Western Avenue that have historically been zoned business (B-1) but are unlikely ever to be used for business, from B-1 to R-4.',
 'Busse Highway Corridor',51,'high','1996 proposal, zoning/land use category.'),

-- ── Higgins Road Corridor ─────────────────────────────────────────────────────
('crp96-hrc-001','park_ridge_comprehensive_plan_1996','corridor:higgins_road',NULL,'1996','Business/Address','description',
 'East of Cumberland, Higgins Road parcels are only half a block deep',
 'Parcels east of Cumberland Avenue are zoned general commercial and only one-half block deep, frequently lacking off-street parking, which pushes cars into the parkway and over sidewalks.',
 'Higgins Road Corridor',56,'high','Baseline description for the corridor page.'),
('crp96-hrc-002','park_ridge_comprehensive_plan_1996','corridor:higgins_road',NULL,'1996','Land/Property','plan_1996_proposal',
 'Redevelop the garden center as a planned office complex',
 'The plan recommends redeveloping the garden center property at the corridor''s western end as a planned office complex, calling its current function, appearance, and odors "inappropriate at this location."',
 'Higgins Road Corridor',56,'high','1996 proposal, land use category.'),

-- ── Touhy Avenue Corridor ─────────────────────────────────────────────────────
('crp96-tac-001','park_ridge_comprehensive_plan_1996','corridor:touhy_avenue',NULL,'1996','Business/Address','description',
 'Touhy Avenue businesses fall short of Central Business District standards',
 'The plan notes that, with certain exceptions, the appearance of sites, buildings, and signage along this stretch is "not of the same high standard as in the Central Business District," even though many businesses serve passing motorists'' real needs.',
 'Touhy Avenue Corridor',62,'high','Baseline description for the corridor page.'),
('crp96-tac-002','park_ridge_comprehensive_plan_1996','corridor:touhy_avenue',NULL,'1996','Land/Property','plan_1996_proposal',
 'Uses here should support the CBD and neighbors, not just passing traffic',
 'The plan recommends that permitted uses in this corridor directly support the Central Business District and adjacent residential neighborhoods rather than simply serve passing traffic, and that multi-family residences be encouraged west of Chester Avenue.',
 'Touhy Avenue Corridor',63,'high','1996 proposal, land use category.')

ON CONFLICT (fact_id) DO NOTHING;
