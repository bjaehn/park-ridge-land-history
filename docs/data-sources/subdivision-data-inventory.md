# Subdivision Data Source Inventory

Park Ridge Land History — Subdivision History Feature

Last updated: 2026-06-14

---

## Overview

This document inventories every data source investigated for subdivision history data
for Park Ridge, Illinois. It records what each source contains, how to access it, what
fields are available, whether it can be accessed programmatically, and what is needed
to use it.

Subdivision history requires evidence from official recorded plats, GIS parcel layers,
and manual historical research. No single source covers everything.

---

## Source Inventory

### 1. Cook County GIS Hosted Parcel Layer

| Field | Value |
|-------|-------|
| **Status** | Inspect required — run `scripts/data/subdivisions/01_inspect_cook_gis_fields.py` |
| **Access method** | ArcGIS REST FeatureServer |
| **URL** | `https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0` |
| **Programmatic** | Yes |
| **Confidence if available** | Medium |

**What it contains:**
The Cook County GIS parcel layer is currently used by the existing pipeline to download
parcel boundaries for Park Ridge. The layer provides PIN, PIN10, parcel type, and tax code.

Additional fields including subdivision name, lot number, and block number may be available
in this layer or in a more complete version of the layer. The field named `subdivisio` (or
similar) sometimes contains the subdivision name from the Cook County Assessor's recorded
plat data.

**Fields currently downloaded:** `name`, `pin10`, `parceltype`, `taxcode`

**Fields that may be available:** `subdivisio`, `lot`, `block` — run script 01 to verify.

**Terms:** Cook County public GIS data. Open access, no restrictions documented.

**Recommended use:**
- Primary programmatic source for subdivision names if field is present
- Confidence: medium (comes from assessor attribute, not independently verified plat date)
- Does NOT provide subdivision recording dates

---

### 2. Cook County GIS Hub Parcels Dataset

| Field | Value |
|-------|-------|
| **Status** | To investigate |
| **Access method** | ArcGIS Hub open data download or ArcGIS REST API |
| **URL** | `https://cookcountyilgis.hub.arcgis.com` |
| **Programmatic** | Yes |
| **Confidence if available** | Medium |

**What it contains:**
The Cook County GIS Hub may offer a more complete parcel dataset than the Hosted
FeatureServer layer. Worth checking for additional subdivision-related attributes.

**Fields possibly available:** Subdivision name, lot, block, legal description.

**Terms:** Cook County public GIS data. Open access.

**Recommended use:**
- Check hub search for "parcels" to find the most complete dataset
- Compare available fields to the FeatureServer layer
- Download if it has subdivision attributes not present in the FeatureServer layer

---

### 3. Cook County Assessor Parcel Universe (Socrata)

| Field | Value |
|-------|-------|
| **Status** | No subdivision fields in known columns |
| **Access method** | Socrata REST API (already used by existing pipeline) |
| **Dataset ID** | `nj4t-kc8j` at `datacatalog.cookcountyil.gov` |
| **Programmatic** | Yes |
| **Confidence if available** | Unknown |

**What it contains:**
PIN, year, class, lat/lon, municipality, township, zip code. Does not appear to include
subdivision fields in the columns currently downloaded. The full dataset schema may
include additional columns — see script 01 which queries the full column list.

**Terms:** Cook County open data. Public access via Socrata API.

**Recommended use:**
- Cross-reference to confirm Park Ridge parcel list
- Not a subdivision data source based on known schema

---

### 4. Cook County Recorder of Deeds — Recorded Subdivision Plats

| Field | Value |
|-------|-------|
| **Status** | Manual acquisition required |
| **Access method** | Manual search via ccrd.info; in-person at Clerk's office |
| **URL** | `https://ccrd.info` |
| **Programmatic** | No (possible scraping but terms unclear) |
| **Confidence if available** | High |

**What it contains:**
The official recorded subdivision plat index. Contains subdivision names, plat book and
page references, document numbers, recording dates, and grantor/grantee names.

This is the authoritative source for:
- Exact subdivision recording dates
- Original platters and developers
- Plat book and page references for archive lookup

**Fields available:** Subdivision name, plat book, plat page, document number, recording date, grantor, grantee.

**Terms:** Public record. Terms of use for bulk extraction unclear. Manual research is clearly allowed.

**Acquisition path:**
1. Go to `ccrd.info` → Search by document type "Subdivision Plats"
2. Filter by municipality or section/township
3. For Park Ridge: Maine Township, township 41N range 12E, Cook County
4. Transcribe or save records to `data/raw/park_ridge_land_family.csv`
5. Use `record_type = "subdivision_plat"` and populate plat_book, plat_page, document_number fields

**Priority:** HIGH — this source provides the recording dates and plat references that
distinguish verified from inferred subdivisions.

---

### 5. Park Ridge Land Family CSV (Internal Research File)

| Field | Value |
|-------|-------|
| **Status** | Available if populated |
| **Access method** | Local CSV at `data/raw/park_ridge_land_family.csv` |
| **Programmatic** | Yes |
| **Confidence if available** | Medium |

**What it contains:**
The `park_ridge_land_family.csv` is the primary intake format for manually researched
subdivision and land history clues. Each row is a PIN- or address-level record.

**Fields:**
- `pin_normalized` or `pin` — the Cook County PIN if known
- `address` — property address if PIN is not available
- `title` — the subdivision name or record title
- `description` — additional context
- `record_type` — use `subdivision_plat`, `lot_block_reference`, or `subdivision_reference`
- `source_name` — where the data came from
- `source_url` — URL of the source if applicable
- `case_number` — document number, plat book/page, or other reference

**How to add data:**
1. Research a subdivision via the Recorder, an atlas, or another source
2. Add a row per parcel (or omit PIN for subdivision-wide records)
3. Re-run the pipeline starting at script 03

---

### 6. Illinois HARGIS Historic Survey

| Field | Value |
|-------|-------|
| **Status** | Partial cross-reference only |
| **Access method** | Already integrated via existing pipeline |
| **Programmatic** | Yes |
| **Confidence if available** | Low |

**What it contains:**
Illinois HARGIS includes architectural survey records for some Park Ridge properties,
with location descriptions that sometimes reference subdivision names. Coverage is sparse.

**Recommended use:** Cross-reference only. Do not use as a primary subdivision source.

---

### 7. Sanborn Fire Insurance Maps

| Field | Value |
|-------|-------|
| **Status** | Manual research required |
| **Access method** | Library of Congress Digital Collections; ProQuest (subscription) |
| **URL** | `https://www.loc.gov/collections/sanborn-maps/` |
| **Programmatic** | No |
| **Confidence if available** | Low |

**What it contains:**
Sanborn maps for Park Ridge show street layouts, lot lines, block numbers, and
building footprints. Some editions reference subdivision names on title blocks or plat
sheets. Useful for understanding neighborhood development patterns circa 1900–1950.

**Terms:** LOC digitized Sanborn maps are public domain. ProQuest editions require subscription.

**Recommended use:**
- Supplement when researching early Park Ridge neighborhoods
- Cross-reference block numbers to Cook County GIS
- Do not republish scanned map images without checking LOC license

---

### 8. Illinois Historical Aerial Photography

| Field | Value |
|-------|-------|
| **Status** | Useful for buildout context, not subdivision dates |
| **Access method** | `https://clearinghouse.isgs.illinois.edu` |
| **Programmatic** | No (download is manual) |
| **Confidence if available** | Low |

**What it contains:**
Historical aerial photography of Illinois by flight year. Useful for seeing when areas
were built out vs. vacant. Does NOT show subdivision recording dates — a subdivided
area may remain vacant for years after platting.

**Important limitation:** Aerial imagery shows physical development, not legal subdivision date.
Do NOT use aerial year as a proxy for subdivision recording year.

---

### 9. Historical Township Plat Maps and County Atlases

| Field | Value |
|-------|-------|
| **Status** | Manual research required |
| **Access method** | Newberry Library, Illinois State Archives, digitized library collections |
| **Programmatic** | No |
| **Confidence if available** | Low |

**What it contains:**
Township plat maps and county atlases from the 1800s–early 1900s show farm owner
names, section/township boundaries, and sometimes early subdivision outlines.
Specifically useful for understanding what Park Ridge looked like before residential
platting began.

**Sources for Maine Township (Park Ridge):**
- 1876 Warner and Beers Illinois atlas
- 1886 Snyder plat book of Cook County
- 1893 and later Cook County plat books
- Newberry Library (Chicago) digitized collections

**Recommended use:**
- Research pre-subdivision land ownership (farm owners, early developers)
- Identify historical land units that predate subdivision
- Use to populate `historical_land_units` table

---

## Summary: What Is Available Now vs. What Requires Research

| Source | Available Now? | Subdivision Names? | Recording Dates? | Confidence |
|--------|--------------|-------------------|-----------------|------------|
| Cook County GIS parcel layer | Yes (inspect) | Possibly | No | Medium |
| Cook County GIS Hub | To investigate | Possibly | No | Medium |
| Socrata Parcel Universe | Yes | No | No | N/A |
| Cook County Recorder plats | Manual only | Yes | Yes | High |
| Land family CSV | If populated | Yes (manual) | Possibly | Medium |
| HARGIS survey | Already integrated | Cross-ref only | No | Low |
| Sanborn maps | Manual only | Sometimes | No | Low |
| Historical aerials | Manual only | No | No | Low |
| Township plat maps | Manual only | Early only | No | Low |

---

## Recommended Next Steps

1. **Run `01_inspect_cook_gis_fields.py`** to discover whether the Cook County GIS
   parcel layer has a subdivision field. This determines if we can populate subdivision
   names programmatically.

2. **Check Cook County GIS Hub** for a more complete parcel dataset with subdivision
   attributes if the FeatureServer layer does not have them.

3. **Begin manual research at `ccrd.info`** to build a sample of verified subdivision
   records with recording dates. Start with the 10–20 largest subdivisions by parcel count.

4. **Populate `data/raw/park_ridge_land_family.csv`** with manually researched
   subdivision records as research progresses.

5. **Document in `docs/data-sources/manual-research-queue.md`** which specific
   subdivisions are priorities for manual research.
