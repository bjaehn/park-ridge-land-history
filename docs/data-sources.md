# Data Sources For Road & Parcel History

This inventory supports the Road & Parcel History Timeline. It separates immediately usable data from sources that require download, georeferencing, manual digitization, licensing review, or access confirmation.

| Source | URL or Access | Data Type | Coverage | Format | Status | Can Support Exact Dates? | Notes |
|---|---|---|---|---|---|---|---|
| Park Ridge Map Gallery / ArcGIS StoryMaps | `https://storymaps.arcgis.com/collections/94130fe6114d4606af97b11fd0875e25` | Local GIS maps, landmarks, civic context | Park Ridge | ArcGIS web maps/layers | `available_now`, some layers `access_uncertain` | Usually no | Useful for local context, historic landmarks, possible 100-year-old-home layers, and municipal reference. Inspect layer services before production use. |
| Cook County GIS parcel service | `https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer` | Current parcel geometry | Cook County | ArcGIS FeatureServer / GeoJSON export | `available_now` | No | Good modern baseline. Current parcel boundaries do not reconstruct historical subdivision timing. |
| Cook County Open Data parcel snapshots | `https://datacatalog.cookcountyil.gov/` | Parcel-year snapshots | Cook County | Socrata CSV/GeoJSON/API | `available_now` for some years, `requires_download` | No | Useful for parcel-change comparison by tax year. Date is snapshot year, not creation date. |
| CookViewer | `https://maps.cookcountyil.gov/cookviewer/` | Public property/GIS viewer | Cook County | Web app | `available_now` | No | Useful for manual validation and property context. Not ideal as an automated source without underlying layer URLs. |
| Cook County Assessor parcel/property data | `https://datacatalog.cookcountyil.gov/Property-Taxation/Assessor-Parcel-Universe/nj4t-kc8j` and related Assessor datasets | PINs, property attributes, building years | Cook County | Socrata CSV/API | `available_now` | Building years only | Supports building-age layer. Building year is not parcel creation date or road date. |
| Illinois Historical Aerial Photography | `https://clearinghouse.isgs.illinois.edu/webdocs/ilhap/county/j_cook.html` | 1938/1939 Cook County aerial imagery | Cook County | Scanned aerial images | `requires_download`, `requires_georeferencing`, `requires_manual_digitization` | Observed dates only | Strong earliest aerial baseline. Needs sheet selection, georeferencing, and tiling before map overlay. |
| USGS topoView / Historical Topographic Maps | `https://ngmdb.usgs.gov/topoview/` | Historical topo maps, including Park Ridge-area quadrangles | National | GeoPDF/JPEG/KMZ depending source | `requires_download`, likely `requires_georeferencing` | Observed dates only | Good mid-century context. Less detailed than parcels or Sanborn maps. |
| Sanborn Fire Insurance Maps | Library of Congress where available: `https://www.loc.gov/collections/sanborn-maps/`; ProQuest/EDR/LightBox via libraries/subscription | Streets, blocks, parcels, buildings, building use | Partial by municipality/year | Scanned map sheets | `access_uncertain`, often `requires_manual_digitization` | Observed/map-published dates only | Excellent evidence where Park Ridge coverage exists. Access and reuse terms vary. |
| Later regional aerial imagery | Cook County, CMAP, local/regional GIS portals | Aerial imagery | Regional | Tiles/images | `requires_download`, `access_uncertain` | Observed dates only | Useful for 1970s-2000s validation if accessible with usable licensing. |
| Subdivision plats and recorder documents | Cook County Recorder / Clerk records, document search | Legal subdivision evidence | Parcel/subdivision specific | PDF/images/index records | `requires_manual_research` | Sometimes yes | Best source for legal subdivision dates when a plat is found. Requires PIN/legal-description research. |
| Manual digitization / historian review | Internal review workflow | Reviewed road/parcel evidence | Any selected area | GeoJSON plus evidence records | `requires_manual_digitization` | Depends on source | Needed to move road records from demo to reviewed/verified. |

## Confidence Guidance

- `high`: source is clear, georeferenced/aligned, and checked by a human.
- `medium`: source likely shows the feature, but alignment or visibility has some uncertainty.
- `low`: weak signal, partial visibility, or uncertain match.
- `unknown`: placeholder, unreviewed, or no evidence yet.

## Current MVP Status

The app currently ships with a sample road/parcel timeline dataset so the UI and map logic can be tested. The road dates are not official historical findings. Production-quality records require ILHAP, Sanborn, topo, parcel snapshots, or subdivision evidence to be reviewed and attached record by record.
