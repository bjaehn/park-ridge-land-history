# Park Ridge Land History Digital Source Registry Plan

Last inspected: 2026-06-23

This is a planning registry. Sources marked for verification must be confirmed during implementation before production ingestion or public display.

| Source | Owner | URL or access path | Source type | Facts available | Matching keys | Authority | Structure | Automation potential | Review burden | Risk | Recommended phase | Admin queue needed | Frontend use |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Assessor Parcel Universe | Cook County Assessor | `https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json` | Socrata API | PIN, municipality, township, class, lat, lon, ZIP | PIN, municipality | 5 | 5 | 5 | 2 | 2 | 1 | Unmatched PIN, duplicate PIN, missing address | Property identity, search, coverage |
| Assessor parcel addresses | Cook County Assessor | `https://datacatalog.cookcountyil.gov/resource/3723-97qp.json` | Socrata API | Situs address, city, state, ZIP, PIN10, year | PIN, PIN10, address | 5 | 5 | 5 | 3 | 2 | 1 | Missing address, duplicate address | Address confidence, search |
| Assessor property characteristics | Cook County Assessor | `https://datacatalog.cookcountyil.gov/resource/x54s-btds.json` | Socrata API | Year built, building square feet, land square feet, residential characteristics, card | PIN, year | 5 | 5 | 5 | 3 | 2 | 1 | Conflicting year built, conflicting square footage | Construction era, home and lot comparison |
| Parcel sales | Cook County Assessor | `https://datacatalog.cookcountyil.gov/resource/wvhk-k5uv.json` | Socrata API | Sale date, price, document number, deed type, filters | PIN, document number | 5 | 5 | 5 | 2 | 2 | 1 | Conflicting sale history | Sale timeline, turnover |
| Assessed values | Cook County Assessor | `https://datacatalog.cookcountyil.gov/resource/uzyt-m557.json` | Socrata API | Mailed, certified, board values by year | PIN, year | 5 | 5 | 5 | 1 | 2 | 1 | Source schema changed | Assessment trend |
| Assessment appeals | Cook County Assessor | `https://datacatalog.cookcountyil.gov/resource/y282-6ig3.json` | Socrata API | Case, appeal year, status, value change, reasons | PIN, case number, year | 5 | 5 | 4 | 2 | 2 | 1 | Source schema changed | Assessment caveats |
| Assessor permit data | Cook County Assessor | `https://datacatalog.cookcountyil.gov/resource/6yjf-dfxs.json` | Socrata API | Permit date, permit number, status, amount, description | PIN, address, permit number | 4 | 4 | 5 | 3 | 2 | 1 | Permit unmatched, messy description | Permit timeline, known changes |
| Assessor proximity data | Cook County Assessor | `https://datacatalog.cookcountyil.gov/resource/ydue-e5u3.json` | Socrata API | Nearby park, Metra, trails, roads, foreclosure context | PIN10, year | 4 | 5 | 4 | 2 | 3 | 1 | Source caveat review | Nearby civic context |
| Cook County parcel geometry | Cook County GIS | `https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0/query` | ArcGIS FeatureServer | Parcel polygons, PIN, parcel metadata | PIN, geometry | 5 | 5 | 5 | 3 | 2 | 1 | Conflicting geometry, unmatched PIN | Map, block, neighborhood, subdivision matching |
| Cook County parcel snapshots | Cook County GIS or Open Data | Existing repo historical scripts and data catalog search | Socrata or file download | Historical parcel polygons by snapshot year | PIN, geometry, year | 5 | 4 | 3 | 4 | 3 | 3 | Historical claim needs review | Parcel change evidence |
| Park Ridge map gallery | City of Park Ridge | `https://storymaps.arcgis.com/collections/94130fe6114d4606af97b11fd0875e25` | ArcGIS collection | Map layer discovery for local civic data | Layer id, geometry, address | 5 | 3 | 3 | 3 | 3 | 2 | Data source changed schema | Civic context, source links |
| Park Ridge zoning layer | City of Park Ridge | Verify ArcGIS FeatureServer from city maps | ArcGIS FeatureServer | Zoning district, zoning geometry, ordinance link | Geometry, address | 5 | 3 | 3 | 2 | 3 | 2 | Low-confidence geometry match | Zoning snapshot |
| Lead service inventory | City of Park Ridge or Illinois EPA | Verify city GIS or state source | GIS layer or spreadsheet | Service line material, unknown status, update date | Address, service location | 5 | 3 | 3 | 4 | 4 | 2 | Lead service address unmatched | Infrastructure card with caveat |
| Historic landmarks | City of Park Ridge, Historic Preservation Commission | Verify city source and Park Ridge History Center references | GIS, page, or spreadsheet | Landmark address, name, recognition year, notes | Address | 4 | 3 | 3 | 4 | 3 | 2 | Landmark address unmatched | Historic badge, nearby landmarks |
| 100-year homes | City of Park Ridge, Historic Preservation Commission | Verify city source | GIS, page, or spreadsheet | Recognition status, address, year, source | Address | 4 | 3 | 3 | 4 | 3 | 2 | Historical recognition review | 100-year home badge |
| Active projects | City of Park Ridge | Verify ArcGIS or city data page | GIS or page | Project locations, type, status | Address, geometry | 4 | 3 | 3 | 3 | 3 | 2 | Source freshness review | Civic context |
| Civic layers | City of Park Ridge | Verify ArcGIS layer services | ArcGIS FeatureServer | Public parking, beats, sweeping zones, urban forest zones | Geometry | 4 | 3 | 3 | 2 | 2 | 2 | Low-confidence geometry match | Context near a property |
| Census Decennial and ACS | U.S. Census Bureau | `https://api.census.gov/data.html` and TIGER files | API and downloads | Population, housing units, occupancy, tract context | GEOID, geometry | 5 | 5 | 4 | 2 | 2 | 2 | Boundary approximation | City and neighborhood context |
| OpenStreetMap | OpenStreetMap Foundation | Overpass API or extracts | Community map data | Streets, parks, trails, civic buildings, POI | Geometry, OSM id | 3 | 4 | 4 | 2 | 2 | 2 | Source caveat review | Nearby civic context |
| FEMA NFHL | FEMA | Verify NFHL REST service or downloads | GIS service | Flood zone, panel, map references | Geometry | 5 | 4 | 4 | 3 | 3 | 2 | Flood caveat review | Flood map reference |
| Illinois historical aerial photography | Illinois State Geological Survey | `https://clearinghouse.isgs.illinois.edu/data/imagery/illinois-historical-aerial-photography` | Image metadata and scans | Aerial image year, frame, coverage | Geometry after georeference | 4 | 2 | 2 | 5 | 3 | 3 | Historical claim needs review | Historical map gallery |
| Sanborn maps | Library of Congress or licensed providers | `https://www.loc.gov/collections/sanborn-maps/` and licensed sources | Scanned maps | Sheet, year, buildings, streets, use | Coverage, address after interpretation | 4 | 2 | 1 | 5 | 4 | 3 | OCR and licensing review | Map evidence timeline |
| Planning documents | City of Park Ridge | Verify city document library | PDFs | Comprehensive plan, land use, transportation, neighborhoods | Document section, geometry if maps extracted | 5 | 2 | 2 | 5 | 3 | 3 | Historical claim needs review | Planning timeline, neighborhood context |
| Recorded documents and plats | Cook County Clerk or Recorder | Verify access and terms | Search index, PDFs, images | Recording dates, document numbers, legal descriptions, plats | PIN, legal description, document number | 5 | 2 | 2 | 5 | 4 | 3 | Manual legal interpretation | Subdivision genealogy |

## Source Registry Fields

Each source registry row should store:

- Source id
- Source name
- Source owner
- Source URL
- Source type
- Authority level
- License or terms notes
- Refresh frequency
- Access method
- File format or API type
- Matching keys
- Expected facts
- Last checked date
- Last successful ingestion date
- Current status
- Risk notes
- Admin notes

## First Sources to Implement

1. Cook County parcel geometry and addresses
2. Assessor Parcel Universe
3. Assessor property characteristics
4. Parcel sales
5. Assessed values and appeals
6. Assessor permit data

These sources are official, structured, already represented in repo scripts, matchable by PIN, and useful on property pages immediately.
