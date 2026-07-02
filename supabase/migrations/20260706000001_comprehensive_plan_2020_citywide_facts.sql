-- City-wide historical facts from Chapter 1 of the 2020 Comprehensive Plan
-- ("Park Ridge Wonderful"): an expanded/corrected account of the 1925-26
-- master plan, and the extended timeline from 1996 through 2019 that the
-- 1996-plan-sourced facts (crp96-city-*) don't cover.
-- fact_id prefix: crp20-city-*, continuing after crp96-city-024.
-- Safe to re-run (ON CONFLICT (fact_id) DO NOTHING).

INSERT INTO historical_facts
  (fact_id, source_id, date_start, date_end, date_text, category, fact_type, title, summary,
   place_historical, place_modern, printed_page, confidence, city_wide, app_use)
VALUES

('crp20-city-001','park_ridge_comprehensive_plan_2020',1925,NULL,'1925','Government/Civic','plan_commissioned',
 'Walter Burley Griffin engaged to prepare Park Ridge''s first city plan',
 'The newly created Plan Commission engaged Prairie School architect and city planner Walter Burley Griffin -- a former Frank Lloyd Wright associate who won the 1912 international competition to design Canberra, Australia''s capital -- to prepare a master plan for Park Ridge during a period of tremendous growth.',
 NULL,'Park Ridge (citywide)',4,'high',true,
 'Corrects/expands the 1996 plan''s brief mention of the 1926 plan with a richly footnoted, primary-sourced account (crp96-city-007 covers the same event more briefly).'),

('crp20-city-002','park_ridge_comprehensive_plan_2020',1925,NULL,'November 5, 1925','Government/Civic','plan_commissioned',
 'Griffin signed his "Park Ridge Extension Plan" blueprint',
 'Griffin completed his "Park Ridge Extension Plan, General Arrangement" at 1"=400'' scale, signed and dated November 5, 1925, envisioning semi-circular streets, wide boulevards terminating in civic squares, diagonal axes, and open spaces in the City Beautiful tradition. The original blueprint is archived at the National Library of Australia; the Park Ridge Public Library obtained a digital copy in 2015.',
 NULL,'Park Ridge (citywide)',7,'high',true,'Specific date/artifact detail for the Griffin plan story.'),

('crp20-city-003','park_ridge_comprehensive_plan_2020',1925,1926,'Dec 1925 - Feb 1926','Government/Civic','plan_adopted',
 'Whether Griffin''s plan was ever formally approved is genuinely unclear',
 'A Feb 6, 1926 city ordinance references a "city plan" approved Dec 8, 1925 -- probably Griffin''s plan -- but the City''s own 1924-25 ordinance volume, including the one creating the Plan Commission, is missing from the record. Sculptor and Plan Commission member Alfonso Iannelli (who had collaborated with Frank Lloyd Wright and fellow Prairie architect Francis Barry Byrne) later confirmed Griffin was engaged in 1925, but since Griffin lived in Australia and could not follow local developments, Chicago planner F.A. Cushing Smith was engaged to take over.',
 NULL,'Park Ridge (citywide)',7,'medium',true,'Genuine historical ambiguity, footnoted to Christopher Vernon, "Finding Park Ridge," National Library of Australia Magazine (June 2015).'),

('crp20-city-004','park_ridge_comprehensive_plan_2020',1926,NULL,'February 6, 1926','Government/Civic','plan_adopted',
 'F.A. Cushing Smith''s revised master plan approved, extending planning 1.5 miles beyond city limits',
 'Smith was retained "late in 1925" to revise Griffin''s plan, keeping its main features while extending detailed planning to the full 1.5-mile radius allowed under state enabling legislation -- since Griffin''s plan had covered only the limited area then inside city limits. The City Council approved Smith''s "Master Street Plan Showing Proposed Development of Greater Park Ridge, Ill." on February 6, 1926; its area of coverage extended from Oakton Avenue in the north to Lawndale Avenue in the south.',
 NULL,'Park Ridge (citywide)',9,'high',true,'More precise version of crp96-city-007''s "1926 Master Plan" entry.'),

('crp20-city-005','park_ridge_comprehensive_plan_2020',1920,1930,'1920-1930','Population/Settlement','population_data',
 'Population more than tripled in the 1920s, from 3,383 to 10,417',
 'The Plan Commission was created in 1924 amid tremendous growth: truck farms and nurseries were giving way to residential subdivisions, Touhy Avenue was graded and paved with concrete, and a new high school -- now Maine East -- opened in 1929.',
 NULL,'Park Ridge (citywide)',4,'high',true,'More granular than the 1996 plan''s general "1920s building boom" entry (crp96-city-005).'),

('crp20-city-006','park_ridge_comprehensive_plan_2020',1928,NULL,'1928','Buildings/Civic','institution_established',
 'Pickwick Theatre opened, one of two new movie theaters',
 'The 1920s brought significant commercial expansion alongside the population boom: new banks and car dealerships were established, and two movie theaters opened, including the Pickwick Theatre in 1928 -- growth suddenly halted by the onset of the Great Depression.',
 NULL,'Pickwick Theatre',9,'high',true,'Landmark-opening date more precise than the 1996 plan''s general reference.'),

('crp20-city-007','park_ridge_comprehensive_plan_2020',1935,NULL,'1935','Land/Property','plan_adopted',
 'A 1935 plan combined two separate 1926 civic/business nodes into present-day Uptown',
 'The 1926 plan had divided civic and business uses at two distinct locations along the railroad: a historic business center straddling the tracks along Prospect, and a civic center farther northwest (near today''s Public Works Service Center). A 1935 "Plan of ''Business Center''" combined both into the present Uptown location, envisioning a new city hall, post office, and railroad depot aligned on one axis, surrounded by reflecting pools and gardens.',
 NULL,'Central Business District (Uptown)',9,'high',true,'Origin story for Uptown''s present-day layout; not covered by the 1996 plan.'),

('crp20-city-008','park_ridge_comprehensive_plan_2020',1939,NULL,'1939','Roads/Development','infrastructure',
 'WPA improved the water system; Touhy Avenue was widened',
 'Public improvements continued through the Depression: a Works Progress Administration project improved the water system, and Touhy Avenue was widened in 1939.',
 NULL,'Park Ridge (citywide)',9,'high',true,'Depression-era public works detail absent from the 1996 plan.'),

('crp20-city-009','park_ridge_comprehensive_plan_2020',1942,NULL,'1942','Roads/Development','infrastructure',
 'O''Hare began as a WWII Douglas Aircraft plant three miles away, at "Orchard Place"',
 'In 1942 the War Production Board chose an open area near Orchard Place -- a hamlet at a crossroads, three miles from Park Ridge''s center -- as the site of a Douglas C-54 Skymaster production facility with four runways. Employment swelled, and with federal assistance Park Ridge built over 600 new housing units to meet demand.',
 'Orchard Place','O''Hare International Airport',9,'high',true,'Origin story for O''Hare, whose growth repeatedly drove Park Ridge development pressure in later decades.'),

('crp20-city-010','park_ridge_comprehensive_plan_2020',1949,NULL,'1949','Roads/Development','infrastructure',
 'Renamed O''Hare International Airport, but kept the ORD code',
 'After the war, Chicago acquired the Orchard Place/Douglas Field facilities as a second municipal airport to relieve Midway. It was renamed Chicago O''Hare International Airport in 1949, honoring Navy aviator Lt. Cmdr. Edward "Butch" O''Hare -- while retaining its original "ORD" (Orchard Place) airport code.',
 'Orchard Place','O''Hare International Airport',10,'high',true,'Explains the ORD code trivia and O''Hare''s direct origin in Park Ridge-area land.'),

('crp20-city-011','park_ridge_comprehensive_plan_2020',1956,NULL,'June 5, 1956','Government/Civic','plan_adopted',
 'Comprehensive Official Plan adopted June 5, 1956, after the 1926 plan was judged outdated',
 'As postwar subdivision development continued at a brisk pace through the 1950s, the Plan Commission determined the 1926 plan no longer served the City and recommended a new one from Carl Gardner and Associates, emphasizing land use, transportation, and public facilities function. The City Council approved it June 5, 1956, supplemented by a "Statement of City Objectives" adopted September 6, 1960, which expressed a desire to "limit density" and exclude industrial uses.',
 NULL,'Park Ridge (citywide)',10,'high',true,'More precise date than crp96-city-010/011.'),

('crp20-city-012','park_ridge_comprehensive_plan_2020',1956,1960,'1956-1960','Roads/Development','infrastructure',
 'Tri-State Tollway and the Kennedy Expressway (then "Northwest Expressway") built',
 'Just west of Park Ridge, the Tri-State Tollway was constructed 1956-1958. Construction on the Northwest Expressway -- later renamed the Kennedy Expressway -- began in the mid-1950s and opened in 1960, bolstering Park Ridge''s attractiveness as a bedroom community alongside the expanding O''Hare.',
 NULL,'Park Ridge (citywide)',10,'high',true,'Regional infrastructure context for postwar growth.'),

('crp20-city-013','park_ridge_comprehensive_plan_2020',1959,NULL,'Christmas Eve 1959','Buildings/Civic','institution_established',
 'Lutheran General Hospital dedicated Christmas Eve, 1959',
 'Lutheran General Hospital -- which would become the City''s largest employer -- was dedicated on Christmas Eve, 1959, ahead of a 1960 annexation of a large tract of land extending south to Higgins Road and west from Cumberland Avenue.',
 NULL,'Lutheran General Hospital',10,'high',true,'More precise dedication date than crp96-city-012''s "opened 1960."'),

('crp20-city-014','park_ridge_comprehensive_plan_2020',1968,NULL,'1968','Government/Boundaries','legal_decision',
 'Consent decree permitted multi-family development at five specific city locations',
 'In 1968 a consent decree was entered in LaSalle National Bank v. City of Park Ridge, permitting multiple-family developments at five specific locations in the city -- a legal constraint shaping where the City''s multi-family stock could grow.',
 NULL,'Park Ridge (citywide)',10,'high',true,'Legal/zoning history not present in the 1996 plan.'),

('crp20-city-015','park_ridge_comprehensive_plan_2020',1970,NULL,'1970','Population/Settlement','population_data',
 'Population peaked in 1970 at 42,614 -- decades of official forecasts overshot it badly',
 'The 1996 plan cites the 1970 peak as 42,619; this 2020 plan gives 42,614 (a small, likely rounding-related discrepancy between the two primary sources). Regional planners had forecast continued robust growth -- 47,000 by 1980, 50,700 by 2010 -- that never materialized, a cautionary note on the limits of municipal population forecasting.',
 NULL,'Park Ridge (citywide)',11,'high',true,'Corroborates/slightly conflicts with crp96-city-022''s 42,619 figure; both are kept rather than reconciled.'),

('crp20-city-016','park_ridge_comprehensive_plan_2020',1970,1979,'1970s','Education/Buildings','decline',
 '1970s enrollment decline forced school closures',
 'New housing construction slowed in the 1970s as vacant land dwindled and population growth leveled then fell. School enrollments declined at a constant 4.8% per year through most of the decade; Park Ridge-Niles School District 64 closed three schools, and Maine Township High School District 207''s enrollment peaked in 1975 with a school closure already anticipated.',
 NULL,'Park Ridge (citywide)',10,'high',true,'Explains the construction slowdown the 1996 plan also notes (crp96-city-005 context), with specific district-level detail.'),

('crp20-city-017','park_ridge_comprehensive_plan_2020',1975,NULL,'January 9, 1975','Government/Civic','civic_frustration',
 'Mayor Butler: "our lack of a workable, usable city plan"',
 'In a January 1975 letter, Mayor Martin Butler wrote that "every ounce of our Plan Commission''s effort and every possible minute of its time must be spent to develop a plan for our future... We are an aging community and are vulnerable to forced changes unless we plan for our future." The City Council directed the Planning and Zoning Commission to begin revising the 1956 plan in 1976, a five-year process assisted by the newly created Department of Community Preservation and Development.',
 NULL,'Park Ridge (citywide)',11,'high',true,'Direct quote framing the mid-1970s planning crisis that produced the 1981 plan.'),

('crp20-city-018','park_ridge_comprehensive_plan_2020',1979,NULL,'1979','Population/Regional','demographic_data',
 '1979 study: Park Ridge was shifting toward childless "empty nester" households',
 'A 1979 Department of Community Preservation and Development study found the population mix moving away from younger-children-oriented families toward adults, childless couples, and empty nesters -- older households drawn by the community''s character and services, and able to afford its costly housing. Meanwhile, in 1978-79, more than half the City''s retail sales tax revenue came from just six car dealerships and gas stations, raising fiscal-stability concerns.',
 NULL,'Park Ridge (citywide)',11,'high',true,'Demographic/fiscal precursor to the 1981 plan''s priorities.'),

('crp20-city-019','park_ridge_comprehensive_plan_2020',1981,NULL,'1981','Government/Civic','plan_adopted',
 '1981 plan adopted after the five-year revision process',
 'The new Comprehensive Plan of the City of Park Ridge, Illinois was adopted in 1981, addressing demographic shifts, housing demand, business-environment health, traffic congestion, and municipal revenue -- with an overall goal to "strengthen and maintain the City of Park Ridge as a family oriented and environmentally attractive community."',
 NULL,'Park Ridge (citywide)',11,'high',true,'More context than crp96-city-014 on why/how the 1981 plan came about.'),

('crp20-city-020','park_ridge_comprehensive_plan_2020',1989,NULL,'1989','Government/Civic','commission_created',
 'Appearance Commission and urban design guidelines both trace to 1989',
 'The desire to preserve community character led to an appearance code and the creation of the Appearance Commission design review board in 1989; that same year the City engaged Raymond J. Green & Associates and Teska Associates to prepare urban design guidelines.',
 NULL,'Park Ridge (citywide)',12,'high',true,'Consistent with crp96-city-016/017, slightly different framing/date emphasis.'),

('crp20-city-021','park_ridge_comprehensive_plan_2020',1980,1989,'1980s','Land/Buildings','construction_projects',
 'Notable 1980s projects: Summit, Pickwick Plaza, the Gallery, O''Hare Corporate Center',
 'Construction projects of note from the 1980s included the Lutheran General Hospital expansion, a new community center on Touhy, the Summit mixed-use development, Pickwick Plaza, the Village Green, the Gallery residential development near the Dee Road Metra station, the O''Hare Corporate Center on Higgins Road, and the conversion of the Park Ridge Inn to a retirement home. The number of retail establishments nonetheless declined during the decade.',
 NULL,'Park Ridge (citywide)',12,'high',true,'More complete project list than crp96-city (1996 plan) coverage of the same decade.'),

('crp20-city-022','park_ridge_comprehensive_plan_2020',1987,1989,'1987-1989','Government/Civic','civic_process',
 'Vision 2000: Mayor Butler''s 30-person forum on the City''s future',
 'In late 1987 Mayor Martin Butler started the Vision 2000 project, assembling a committee of 30 people from civic, educational, and taxing bodies. The final document, published 1989, covered human services, community ambience, economics, and education/culture -- consistent with crp96-city-015''s account.',
 NULL,'Park Ridge (citywide)',12,'high',true,'Corroborates and slightly expands crp96-city-015.'),

('crp20-city-023','park_ridge_comprehensive_plan_2020',1991,1992,'1991-1992','Government/Civic','commission_created',
 'Economic Development Committee (1991) became the Economic Development Corporation (1992)',
 'In April 1991 the City Council authorized an Economic Development Committee chaired by Mayor Ron Wietecha; it recommended a not-for-profit public-private entity for business retention and attraction, and the Economic Development Corporation of Park Ridge was formed in June 1992.',
 NULL,'Park Ridge (citywide)',13,'high',true,'More precise dates than crp96-city-019''s general "1991" entry.'),

('crp20-city-024','park_ridge_comprehensive_plan_2020',1996,NULL,'1996','Land/Property','controversy',
 'The teardown controversy: 34 demolition permits in 1996 sparked CURRB',
 'Soon after the 1996 plan''s adoption, concern grew over "teardowns" -- demolishing existing homes for substantially larger replacements many felt were out of scale with their neighborhoods. The City issued 34 single-family demolition permits in 1996. Concerned residents formed Citizens United to Retain Residential Balance (CURRB), which sought not to ban teardowns but to make their outcomes "more describable and compatible."',
 NULL,'Park Ridge (citywide)',13,'high',true,'Connects directly to the app''s own is_teardown_rebuild detection feature -- this is the controversy''s origin.'),

('crp20-city-025','park_ridge_comprehensive_plan_2020',1997,2007,'1997-2007','Land/Property','zoning_change',
 'A 1997 town hall on teardowns eventually produced a full zoning rewrite in 2007',
 'A January 22, 1997 town hall drew about 150 residents concerned with floor-area ratio, setbacks, property values, and code enforcement. The 1996 plan''s call to update zoning/subdivision codes, combined with CURRB''s advocacy, led to a complete rewrite of the City''s zoning ordinance by consulting firm Camiros, approved by the City Council in 2007.',
 NULL,'Park Ridge (citywide)',14,'high',true,'Direct throughline from the teardown controversy to the current zoning ordinance.'),

('crp20-city-026','park_ridge_comprehensive_plan_2020',2000,2009,'2000-2009','Business District','plan_adopted',
 'Uptown Planning Study (2002) led to a TIF district and the Residences and Shops of Uptown Park Ridge',
 'The 1996 plan flagged Uptown for special attention; a 2000-2002 planning effort by Trkla, Pettigrew, Allen & Payne produced the Uptown Planning Study, adopted as a comprehensive-plan amendment in 2002, recommending TIF or special service area financing. The City established the Uptown TIF district, and by 2009 the Residences and Shops of Uptown Park Ridge development (three phases, on a car-dealership site) added over 70,000 sq ft of retail and 187 dwelling units, attracting Trader Joe''s, Jos A. Bank, Chico''s, Kriser''s, and Houlihan''s.',
 'Central Business District (Uptown)','Central Business District (Uptown)',14,'high',true,'Major post-1996 Uptown redevelopment the 1996 plan itself only anticipated as a recommendation (crp96-cbd-* facts).'),

('crp20-city-027','park_ridge_comprehensive_plan_2020',2008,NULL,'April 2008','Business District','closure',
 'Napleton GM dealership closure (2008) broke a year-old sales-tax rebate deal',
 'In April 2008 the City learned the Napleton GM dealership at Busse and Greenwood would close the following month, voiding a sales tax rebate agreement less than a year old -- amid a broader recession that hurt the Uptown TIF''s and City general fund''s finances.',
 NULL,'Busse Highway Corridor',14,'high',true,'Illustrates the fiscal vulnerability the 1979 study (crp20-city-018) had already flagged around car-dealership tax dependence.'),

('crp20-city-028','park_ridge_comprehensive_plan_2020',2004,2014,'2004-2014','Government/Civic','commission_created',
 'Economic development structures churned: EDC disbanded 2004, a Task Force ran 2011-2014',
 'The original Economic Development Corporation disbanded in 2004; the City briefly tried a single retail-recruitment staffer, then formed an Economic Development Task Force in 2011 that operated until about 2014.',
 NULL,'Park Ridge (citywide)',14,'high',true,'Shows economic-development institutions were unstable for a decade before 2010s rejuvenation.'),

('crp20-city-029','park_ridge_comprehensive_plan_2020',2012,2015,'early-mid 2010s','Business District','redevelopment',
 'Whole Foods (2012) and Mariano''s led a mid-2010s retail rejuvenation',
 'By the early-to-mid 2010s several commercial districts showed signs of rejuvenation: Whole Foods opened in 2012, Mariano''s followed in the space vacated by Dominick''s, and loosened liquor laws helped restaurants like the Harp & Fiddle and Shakou fill long-vacant storefronts. Some businesses still failed -- a corner space at the Pickwick Theatre building cycled through several restaurants before Pazza di Pizza took it.',
 NULL,'Central Business District (Uptown)',14,'high',true,'Recent commercial-district history connecting to the app''s permit/teardown data era.'),

('crp20-city-030','park_ridge_comprehensive_plan_2020',2014,2015,'2014-2015','Land/Property','legal_decision',
 '400 Talcott mixed-use project: denied, then won in court against the City',
 'A mixed-use proposal at Talcott and Vine was denied in 2014; the developer sued and prevailed, with a November 2015 judgment finding the City failed to follow its own zoning standards. A subsequent resident lawsuit against the development was dismissed, though the episode prompted zoning ordinance changes.',
 NULL,'South Park Business District',15,'high',true,'Recent, legally consequential land-use controversy (400 West Talcott, LLC v. City of Park Ridge, 14 CH 17457).'),

('crp20-city-031','park_ridge_comprehensive_plan_2020',2015,2019,'2015-2019','Land/Property','construction_activity',
 'Robust late-2010s construction: ~2 dozen teardown/rebuild permit pairs per year',
 'The 2015-2019 period saw robust housing construction, with roughly two dozen single-family demolition permits and a matching number of replacement-home permits approved each year, plus a limited number of multi-family/mixed-use developments.',
 NULL,'Park Ridge (citywide)',15,'high',true,'Directly quantifies the teardown/rebuild rate the app''s own permit and is_teardown_rebuild data can be checked against.'),

('crp20-city-032','park_ridge_comprehensive_plan_2020',2020,NULL,'2020','Government/Civic','plan_adopted',
 'Park Ridge Wonderful (2020) is the City''s fifth official comprehensive plan',
 'Following the 1926 (Griffin/Smith), 1956 (Carl Gardner), 1981, and 1996 plans, Park Ridge Wonderful: The City of Park Ridge''s Comprehensive Plan of 2020 is the City''s fifth official plan, explicitly superseding the 1996 plan and its three later amendments (Uptown Planning Study, Dee Park Plan, Higgins Road Corridor Plan).',
 NULL,'Park Ridge (citywide)',1,'high',true,'Frames this document''s place at the end of the planning-legacy timeline started by crp96-city-006 through -021.')

ON CONFLICT (fact_id) DO NOTHING;
