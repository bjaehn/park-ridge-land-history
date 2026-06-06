# Data Sources

This project uses public data sources and avoids owner-name display in v1. Public schemas can change, so the pipeline starts with inspection before joins.

## Cook County Parcel Boundaries

- Cook County hosted parcel FeatureServer: `https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer`
- Cook County Open Data parcel snapshots, for example Parcel 2021: `https://datacatalog.cookcountyil.gov/Boundaries-Districts/ccgisdata-Parcel-2021/77tz-riq7`
- Cook County Open Data 2000 parcel snapshot: `https://datacatalog.cookcountyil.gov/Property-Taxation/2000Parcels/bbcr-ryng`

Use these for current parcel geometry and PIN-based mapping. The hosted service reports Illinois StatePlane CRS 3435, supports GeoJSON query output, and exposes PIN14 as the `name` field. The live downloader queries matching Park Ridge PINs in chunks and requests `outSR=4326` so browser-ready GeoJSON can be exported.

The 2000 historical parcel snapshot does not expose the same `municipality` field used by the 2021 snapshot. The 2000 downloader fetches parcels in the Park Ridge boundary extent, then keeps parcels whose centroids fall inside the current Park Ridge municipal boundary.

## Cook County Assessor Improvement Characteristics

- Dataset: `https://datacatalog.cookcountyil.gov/w/x54s-btds/qzb8-g2nd`
- Socrata API pattern: `https://datacatalog.cookcountyil.gov/resource/x54s-btds.csv`

This is improvement-level data, not parcel-level data. One PIN can have multiple rows. The v1 pipeline derives a primary improvement per PIN by preferring records with `year_built`, then the largest building square footage.

The live schema currently uses `char_yrblt` for year built, `char_bldg_sf` for building square feet, and `char_land_sf` for land square feet.

## Cook County Assessor Permits

- Dataset: `https://datacatalog.cookcountyil.gov/Property-Taxation/Assessor-Permits/6yjf-dfxs`
- Socrata API pattern: `https://datacatalog.cookcountyil.gov/resource/6yjf-dfxs.csv`

Use this optional source for the house evolution timeline. Rows are permit-level records associated with a parcel PIN and can include closed, open, and pending permits. The portal notes that rows are unique by `pin`, `permit_number`, and `date_issued`; `date_issued` is preferred for temporal comparisons; and `work_description` should be treated as the canonical work description because job and improvement codes are not always reliable.

The dataset is updated monthly and may include current-tax-year records that are not final. It also reflects permits submitted to and known by the Cook County Assessor, not the complete universe of every municipal permit ever issued. The project exports permit number, issued date, status, amount, and work description, but does not export applicant or mailing fields.

## Cook County Assessor Parcel Universe

- Dataset: `https://datacatalog.cookcountyil.gov/Property-Taxation/Assessor-Parcel-Universe/nj4t-kc8j`
- Socrata API pattern: `https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.csv`

Use this as optional parcel metadata for municipality, class, address, and tax-year context. The dataset documentation emphasizes that PINs should be zero-padded and that spatial data is attached by centroid or tax code depending on field type.

The live downloader filters Parcel Universe to `cook_municipality_name = 'CITY OF PARK RIDGE'` and a target assessment year, currently `2026`, before fetching assessor and geometry records.

## Park Ridge Public GIS

- Map gallery: `https://storymaps.arcgis.com/collections/94130fe6114d4606af97b11fd0875e25`

The gallery includes Property Search, Community Map Viewer, Zoning Map, Historic Landmarks, and 100 Year-Old Homes. If underlying ArcGIS REST layers are publicly accessible, document exact FeatureServer or MapServer endpoints before ingesting. Do not scrape aggressively.

## Park Ridge Public Case Files

- Optional local file: `data/raw/park_ridge_design_review_cases.csv`

Use this for address-level appearance review, zoning, preservation, teardown, variance, or design-review artifacts found in public agendas, packets, minutes, or case indexes. The importer accepts `pin_normalized` when present and falls back to address matching when a public record only names the property address.

The current seed file contains verified Appearance Commission agenda rows from Park Ridge Granicus pages. Keep this rights-aware: store source/document URLs and concise summaries, not copied packet text.

## Park Ridge Local History Directories

- Optional local file: `data/raw/park_ridge_directory_breadcrumbs.csv`
- Park Ridge Public Library local history collections: `https://www.parkridgelibrary.org/research-learn/local-history/`

Use this for transcribed address breadcrumbs from city directories, phone books, local indexes, and similar sources. These are meant to add historical texture to a Home Ancestry view without displaying current owner information.

The source file is intentionally header-only until entries are transcribed from library-access materials or another rights-cleared address-level source.

## Park Ridge Municipal Boundary

- U.S. Census Bureau TIGER/Line 2024 Illinois places: `https://www2.census.gov/geo/tiger/TIGER2024/PLACE/tl_2024_17_place.zip`

The app uses the Park Ridge city place polygon from TIGER/Line as the municipal boundary display layer. This replaces the earlier synthetic rectangular placeholder.

## Illinois Historical Aerial Photography

- Cook County 1938/1939 JPEG index: `https://clearinghouse.isgs.illinois.edu/webdocs/ilhap/county/j_cook.html`
- County access page: `https://clearinghouse.isgs.illinois.edu/webdocs/ilhap/county/`

These images are useful future context, but v1 does not assume they are georeferenced map tiles. Future work should identify image frames covering Park Ridge, georeference them, and publish tiles or PMTiles.

## Sanborn Maps and Historic Plats

- Optional local file: `data/raw/park_ridge_sanborn_snapshots.csv`

Sanborn and plat sources may require library access or have licensing limits. Treat them as source references unless rights allow public display. The current importer supports address or PIN-level Sanborn clues with map year, sheet, interpretation note, source link, document link, and rights note.

The source file is intentionally header-only until map sheet references are transcribed from rights-cleared Sanborn access.
