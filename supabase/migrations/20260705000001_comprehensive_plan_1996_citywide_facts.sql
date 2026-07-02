-- City-wide historical facts extracted from the 1996 Comprehensive Plan:
-- the planning legacy timeline (1924 Plan Commission through the 1996 plan
-- itself) and the population/housing/demographic figures from Figures 3-4.
-- These are city_wide = true (no single neighborhood), so they surface on
-- the /city page rather than any one /neighborhoods/[slug] page.
-- Safe to re-run (ON CONFLICT (fact_id) DO NOTHING).

INSERT INTO historical_facts
  (fact_id, source_id, date_start, date_end, date_text, category, fact_type, title, summary,
   place_historical, place_modern, printed_page, confidence, city_wide, app_use)
VALUES
  ('crp96-city-001','park_ridge_comprehensive_plan_1996',1873,NULL,'July 4, 1873','Government/Boundaries','incorporation',
   'Ridge line along Prospect Street gave the city its name',
   'The plan explains that when the brickyard-era community of Brickton incorporated as a Village in 1873, it took the name "Park Ridge" from the ridge line along Prospect Street, which separates the Des Plaines and Chicago River watersheds.',
   'Brickton','Prospect Street ridge line',4,'high',true,
   'Name-origin fact for city history page; complements the Brickton/Pennyville founding facts already attached to Peeny and Meachem''s Subdivision.'),

  ('crp96-city-002','park_ridge_comprehensive_plan_1996',1909,NULL,'1909','Education/Buildings','institution_established',
   'Edison Park Home and Park Ridge School for Girls established',
   'Among the important institutions established in Park Ridge in the early 1900s were the Edison Park Home and the Park Ridge School for Girls, now known as the Park Ridge Youth Campus.',
   NULL,'Park Ridge Youth Campus',4,'high',true,
   'Early-institution timeline entry.'),

  ('crp96-city-003','park_ridge_comprehensive_plan_1996',1910,NULL,'1910','Government/Civic','government_change',
   'Park Ridge changed from village to city government',
   'By 1910 Park Ridge had a population of over 2,000 inhabitants and decided to change from a village form of government to city government.',
   NULL,'Park Ridge (citywide)',4,'high',true,
   'Governance-history timeline entry.'),

  ('crp96-city-004','park_ridge_comprehensive_plan_1996',1911,NULL,'1911','Sports/Recreation','institution_established',
   'Park Ridge Country Club established',
   'The Park Ridge Country Club was established in 1911, part of a wave of important institutions founded in the community in the early 1900s.',
   NULL,'Park Ridge Country Club',4,'high',true,
   'Early-institution timeline entry; also relevant to the Northeast Park neighborhood record.'),

  ('crp96-city-005','park_ridge_comprehensive_plan_1996',1920,1929,'1920s','Land/Property','building_boom',
   '1920s building boom subdivided the city''s remaining farmland',
   'During the 1920s a major building boom saw real estate developers profit from demand for new housing; farmers sold land to developers, and nurseries and greenhouses gave way to new subdivisions. New streets and blocks were platted over old homesteads, and wide boulevards and parkways replaced narrow dirt roads. The commercial area expanded with banks, car dealerships, stores, and two movie theaters. The Pickwick Theater and Maine East High School were both built at the close of this period, which ended abruptly with the Depression.',
   NULL,'Park Ridge (citywide)',4,'high',true,
   'Major development-era summary; ties to teardown/rebuild and subdivision-era context across the app.'),

  ('crp96-city-006','park_ridge_comprehensive_plan_1996',1924,NULL,'1924','Government/Civic','commission_created',
   'Park Ridge Plan Commission created — among the first in the nation',
   'The City was among the first in Illinois and the nation to create a Plan Commission, doing so in 1924, four years before the U.S. Department of Commerce''s 1928 model planning law was even published.',
   NULL,'Park Ridge (citywide)',2,'high',true,
   'Planning-legacy timeline entry #1 of 6 (1924 -> 1926 -> 1956 -> 1981 -> 1989 -> 1996).'),

  ('crp96-city-007','park_ridge_comprehensive_plan_1996',1926,NULL,'1926','Government/Civic','plan_adopted',
   'First Comprehensive Plan adopted (the "city beautiful" plan)',
   'Consulting town planner A. Cushing Smith prepared the community''s first Comprehensive Plan, adopted by the City Council in 1926, emphasizing the "city beautiful movement" and urban design; several of the city''s boulevards trace to this plan. Elsewhere the 1996 plan credits the underlying 1926 Master Plan design to Walter Burley Griffin and A. Cushing Smith jointly (Figure 9), so both names are recorded here.',
   NULL,'Park Ridge (citywide)',2,'high',true,
   'Planning-legacy timeline entry #2 of 6.'),

  ('crp96-city-008','park_ridge_comprehensive_plan_1996',1940,1945,'early 1940s','Land/Property','housing_shortage',
   'WWII-era Douglas Aircraft employment caused a housing shortage',
   'Growth was halted until the early 1940s, when World War II increased employment at Douglas Aircraft (the site that became O''Hare Field), causing a serious local housing shortage. The federal government participated in a housing construction program in Park Ridge and surrounding communities to meet that demand.',
   'Douglas Aircraft','O''Hare International Airport site',5,'high',true,
   'Explains the WWII-era construction gap between the 1920s boom and the 1950s boom.'),

  ('crp96-city-009','park_ridge_comprehensive_plan_1996',1950,1959,'1950s','Land/Property','peak_construction_decade',
   '1950s was the single biggest decade for home construction',
   'After the war, government-guaranteed veteran loans and readily available mortgage money stimulated additional subdivision development; a larger number of homes were built in the City during the 1950s than in any other decade.',
   NULL,'Park Ridge (citywide)',5,'high',true,
   'Directly supports the app''s construction-by-decade charts and postwar-neighborhood narratives (Northwest Park, South Park).'),

  ('crp96-city-010','park_ridge_comprehensive_plan_1996',1956,NULL,'June 1956','Government/Civic','plan_adopted',
   'Second Comprehensive Plan adopted, emphasizing function over design',
   'Chicago firm Carl Gardner and Associates prepared an expanded, more "comprehensive" plan, recommended by the Plan Commission and adopted by the City Council in June 1956. It emphasized the "function" of the community and its elements -- land use, transportation, public utilities and facilities -- and served the City well through its period of peak development and population growth.',
   NULL,'Park Ridge (citywide)',2,'high',true,
   'Planning-legacy timeline entry #3 of 6.'),

  ('crp96-city-011','park_ridge_comprehensive_plan_1996',1960,NULL,'1960','Government/Civic','plan_adopted',
   'City Objectives adopted to complement the 1956 plan',
   'A set of City Objectives, complementing the 1956 Comprehensive Plan, was subsequently approved by the City Council in 1960.',
   NULL,'Park Ridge (citywide)',3,'high',true,
   'Minor planning-legacy timeline entry between the 1956 and 1981 plans.'),

  ('crp96-city-012','park_ridge_comprehensive_plan_1996',1960,NULL,'1960','Buildings/Civic','institution_established',
   'Lutheran General Hospital opened',
   'Lutheran General Hospital opened its doors in 1960, becoming what the 1996 plan calls the City''s largest single employer and one of the largest hospitals in the Chicago area.',
   NULL,'Lutheran General Hospital',5,'high',true,
   'Cross-references the Lutheran General Hospital special-district record.'),

  ('crp96-city-013','park_ridge_comprehensive_plan_1996',1964,NULL,'1964','Education/Buildings','institution_established',
   'Maine South High School completed',
   'Maine South High School was completed in 1964, part of a wave of 1960s transportation and institutional expansion that included O''Hare''s growth and the Kennedy Expressway/Tri-State Tollway construction.',
   NULL,'Maine South High School',5,'high',true,
   'Ties school-construction history to 1960s transportation expansion.'),

  ('crp96-city-014','park_ridge_comprehensive_plan_1996',1981,NULL,'1981','Government/Civic','plan_adopted',
   'Third Comprehensive Plan adopted, focused on preservation',
   'The City Council adopted a new Comprehensive Plan prepared by the City''s own Department of Community Preservation and Development and its Planning and Zoning Commission. With the City fully developed and little room to grow, this plan emphasized preserving and enhancing the community''s residential environment, and recommended annual review rather than waiting decades between updates.',
   NULL,'Park Ridge (citywide)',3,'high',true,
   'Planning-legacy timeline entry #4 of 6; this is the plan the 1996 document repeatedly updates and supersedes, including its neighborhood boundaries.'),

  ('crp96-city-015','park_ridge_comprehensive_plan_1996',1987,1989,'1987-1989','Government/Civic','civic_process',
   'Vision 2000 process convened ~30 civic leaders',
   'In 1987 the Mayor invited about 30 civic leaders to a process that produced the 1989 report "Vision 2000," covering a broader scope than a typical comprehensive plan -- Human Services, Community Amenities/Ambiance, and Local Government -- with many of its recommendations already implemented by 1996.',
   NULL,'Park Ridge (citywide)',3,'high',true,
   'Planning-legacy timeline entry #5 of 6.'),

  ('crp96-city-016','park_ridge_comprehensive_plan_1996',1989,NULL,'1989','Government/Civic','study_commissioned',
   'Urban Design Guidelines prepared; foundation for the Appearance Commission',
   'The Department of Community Preservation and Development retained Raymond J. Green & Associates and Teska Associates, Inc. to prepare Urban Design Guidelines focused on the visual appearance of public and private spaces. This report became the foundation for the Appearance Commission, formed in 1991.',
   NULL,'Park Ridge (citywide)',3,'high',true,
   'Explains the origin of the Appearance Commission referenced throughout the plan''s design-guideline recommendations.'),

  ('crp96-city-017','park_ridge_comprehensive_plan_1996',1991,NULL,'1991','Government/Civic','commission_created',
   'Appearance Commission formed',
   'The Appearance Commission was formed in 1991 to review the aesthetic aspects of buildings in the community, growing out of the 1989 Urban Design Guidelines study.',
   NULL,'Park Ridge (citywide)',3,'high',true,
   'Referenced repeatedly across neighborhood/district recommendations for design guideline preparation.'),

  ('crp96-city-018','park_ridge_comprehensive_plan_1996',1991,NULL,'1991','Roads/Development','study_commissioned',
   'Comprehensive Traffic and Parking Study commissioned',
   'The City commissioned a Comprehensive Traffic and Parking Study from Metropolitan Transportation Group, Inc. and Walker Parking Consultants, Inc., covering both specific intersection/street engineering and the functional classification of streets as a system.',
   NULL,'Park Ridge (citywide)',3,'high',true,
   'Direct source for the Functional Classification Criteria table (Figure 7) and Transportation Plan Map (Figure 8) referenced in the 1996 plan.'),

  ('crp96-city-019','park_ridge_comprehensive_plan_1996',1991,NULL,'1991','Government/Civic','commission_created',
   'Economic Development Commission (later Corporation) authorized',
   'The City Council authorized creation of a twelve-member Economic Development Commission in 1991, which later became the Economic Development Corporation -- a public-private partnership with its own board and staff pursuing economic development, expansion, and diversification.',
   NULL,'Park Ridge (citywide)',3,'high',true,
   'Referenced in Central Business District and special-district management recommendations.'),

  ('crp96-city-020','park_ridge_comprehensive_plan_1996',1993,NULL,'1993','Government/Boundaries','annexation',
   'Park Ridge Manor subdivision and a Dempster/Potter commercial parcel annexed',
   'In 1993 the Park Ridge Manor residential subdivision and a commercial area at the northeast corner of Dempster Street and Potter Road were annexed to the City.',
   NULL,'Dempster Street / Potter Road',16,'high',true,
   'Relevant to the Ballard-Church neighborhood record, which discusses further annexation candidates.'),

  ('crp96-city-021','park_ridge_comprehensive_plan_1996',1996,NULL,'July 15, 1996','Government/Civic','plan_adopted',
   '1996 Comprehensive Plan adopted',
   'The City Council adopted this Comprehensive Plan on July 15, 1996, prepared by Teska Associates, Inc. with Business Districts, Inc. and the Yas/Fischel Partnership. It sets out to balance preservation of residential neighborhoods with economic revitalization and the City''s fiscal health -- the primary source for most of the neighborhood- and district-level history captured elsewhere in this app.',
   NULL,'Park Ridge (citywide)',1,'high',true,
   'Planning-legacy timeline entry #6 of 6 -- this document itself.'),

  ('crp96-city-022','park_ridge_comprehensive_plan_1996',1950,1990,'1950-1990 (Figure 3)','Population/Settlement','population_data',
   'Population peaked in 1970, then declined through the 1980s',
   'City population by decade: 16,510 (1950); 32,659 (1960); 42,619 (1970, the peak); 38,704 (1980); 36,175 (1990). The 1980s decline of 6.5% matched a trend seen in roughly 60 other mature Chicago-area suburbs. Households over the same period: 4,788; 9,289; 12,898; 13,215; 13,406 -- households kept rising even as population fell, reflecting shrinking household size.',
   NULL,'Park Ridge (citywide)',5,'high',true,
   'Backing data for any city-wide population chart; complements construction-by-decade charts already on /city.'),

  ('crp96-city-023','park_ridge_comprehensive_plan_1996',1970,1990,'1970 vs. 1990 (Figure 4)','Industry/Housing','housing_data',
   'Housing mix shifted from single-family toward multi-family and townhomes',
   'Housing units by type, 1970 vs. 1990: single-family detached fell from 83.5% to 77.8% of the stock; multi-family rose from 15.9% to 19.4%; townhomes rose from 0.7% to 3.0%. In raw counts, townhouses grew from 92 units in 1970 to 408 in 1990 (+343%), and multi-family units grew from 2,081 to 2,299 (+10%). Roughly 65% of all dwelling units were over thirty years old by the mid-1990s.',
   NULL,'Park Ridge (citywide)',6,'high',true,
   'Backing data for a city-wide housing-type chart; corroborates the 1996 plan''s stated goal of permitting only "limited numbers" of multi-family units at specific locations.'),

  ('crp96-city-024','park_ridge_comprehensive_plan_1996',1980,1989,'1980s','Population/Regional','demographic_data',
   '1980s brought an older, more diverse, more affluent population in fewer, smaller households',
   'During the 1980s: residents 65+ increased 32.0% and residents 0-4 increased 21.3%, while residents 5-24 declined; Asian/Pacific population increased 64% and Spanish-origin population increased 71%, while white non-Spanish-speaking population fell 9%; mean household income rose 97.6%; one-person households increased 23.4% and average household size fell from 2.9 to 2.6 persons.',
   NULL,'Park Ridge (citywide)',6,'high',true,
   'Demographic-shift companion to the population and housing-type facts above.')
ON CONFLICT (fact_id) DO NOTHING;
