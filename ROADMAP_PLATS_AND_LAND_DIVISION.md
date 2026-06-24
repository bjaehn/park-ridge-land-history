# Roadmap: Plats and Land Division Intelligence

**Park Ridge Land History — GIS-first plat and lot integration plan**

Last updated: 2026-06-23
Status: Architecture approved, implementation not started

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Already Exists](#2-what-already-exists)
3. [Parcels vs. Plat Lots — Why the Distinction Matters](#3-parcels-vs-plat-lots--why-the-distinction-matters)
4. [Data Sources](#4-data-sources)
5. [Database Schema](#5-database-schema)
6. [Ingestion Scripts](#6-ingestion-scripts)
7. [Parcel-to-Lot Matching Logic](#7-parcel-to-lot-matching-logic)
8. [Subdivision Polygon Generation](#8-subdivision-polygon-generation)
9. [UI Surfaces](#9-ui-surfaces)
10. [Confidence Model](#10-confidence-model)
11. [Citation and Source Model](#11-citation-and-source-model)
12. [Known Limitations](#12-known-limitations)
13. [Sprint Plan](#13-sprint-plan)
14. [Validation Checklist](#14-validation-checklist)
15. [Manual Steps and Commands](#15-manual-steps-and-commands)

---

## 1. Executive Summary

The app currently has a well-developed subdivision history system built on deed language — recorded in `subdivisions`, `subdivision_lots`, `property_subdivision_links`, and `historical_subdivision_lineage`. That system is deed-first: it records what we learn from individual deed or mortgage language about which historical plat lot a modern parcel came from. It is not geometry-first.

This roadmap introduces the geometry-first counterpart: ingesting Cook County's GIS plat lot layer, spatially matching those lots to current tax parcels, and surfacing the result as a "Land Ancestry" chain on every property page.

The Cook County Lots GIS layer contains polygon geometries for recorded subdivision plat lots across Cook County. This is the most authoritative publicly available spatial dataset for the connection between a modern property and its original subdivision lot. It should be the primary source before any deed research is attempted.

The smallest useful vertical slice is:

1. Register the Cook County Lots dataset in a `source_registry` table.
2. Ingest Cook County Lots geometries for the Park Ridge area into a `gis_lots` table.
3. Spatially match current parcels to those lots and record results in `parcel_lot_relationships`.
4. Show the matched lot, block, subdivision name, confidence, and source on the property detail page.
5. Validate the result against two known test cases.

---

## 2. What Already Exists

Understanding the existing schema prevents duplicating work.

### Existing tables relevant to this effort

| Table | Purpose | Status |
|---|---|---|
| `parcels` | Current tax parcel records with geometry, address, PIN, year_built | Populated |
| `subdivisions` | Normalized subdivision entities | Partially populated (deed-sourced) |
| `subdivision_lots` | Individual lot/block records linked to a subdivision | Partially populated, no GIS geometry yet |
| `property_subdivision_links` | Parcel PIN to subdivision mapping (deed-sourced) | Partially populated |
| `historical_subdivision_lineage` | Parent-child plat chain records from deed language | Partially populated |
| `subdivision_geometries` | Geometry records for subdivision boundary polygons | Schema exists, no data |
| `subdivision_timeline_events` | Events in a subdivision's history | Partially populated |
| `subdivision_sources` | Citations for subdivision records | Partially populated |
| `historical_land_units` | Pre-subdivision farms and tracts from historical maps | Schema exists, no data |

### What the existing pipeline covers

The ingestion pipeline in `scripts/data/subdivisions/` downloads the Cook County Assessor's internal `misc_subdivision_id` codes (format: `0915F_F`) from the Socrata Parcel Universe dataset. These are internal assessment-area codes, not legal plat names. They are useful for grouping parcels by assessment area but do not provide:

- Legal plat lot numbers or block numbers
- Plat recording dates or document numbers
- Plat lot geometries
- Subdivision names as recorded on plat documents

The existing deed-sourced data in `property_subdivision_links` and `subdivision_lots` is accurate but sparse — it covers only properties for which deed language was analyzed, not all Park Ridge parcels.

### What is missing

1. No `source_registry` table for formal dataset tracking.
2. No `gis_lots` table for raw Cook County plat lot geometries.
3. No `gis_parcels` table for raw Cook County GIS parcel geometries (distinct from the enriched `parcels` table).
4. No `parcel_lot_relationships` table with spatial overlap metrics.
5. No ingestion script targeting the Cook County Lots GIS layer specifically.
6. No automated spatial parcel-to-lot matching.
7. No "Land Ancestry" UI section on property pages.
8. No city-level "How Park Ridge Was Divided" view.
9. No map layer toggle for plat lots.

---

## 3. Parcels vs. Plat Lots — Why the Distinction Matters

This distinction is the conceptual foundation of the entire feature. It must be explained in the UI.

### Tax parcels (what `parcels` stores today)

A tax parcel is the unit of property taxation. Cook County assigns each parcel a PIN (Property Index Number). The parcel boundary is the current legal ownership boundary. It can and does differ from the original plat lot boundary for many reasons:

- Lot splits: one original lot was divided into two or more parcels.
- Lot consolidations: two original lots were merged into one parcel.
- Lot line adjustments: a small strip of land was transferred between adjacent lots.
- Street vacations: a vacated alley or road remnant was absorbed into an adjacent parcel.
- Resubdivisions: an entire block was re-platted and all lots redrawn.

A tax parcel boundary says nothing about what was on the land when it was originally subdivided.

### Plat lots (what we will store in `gis_lots`)

A plat lot is a lot as drawn on a recorded subdivision plat. The plat is a legal document recorded with the Cook County Clerk/Recorder. It defines:

- The lot number and block number within the subdivision.
- The geometric boundary of each lot as of the plat recording date.
- The subdivision name.
- The section, township, and range of the land.

A property's legal description almost always references a plat lot: "Lot 14 in Block 3 of Kinsey's Park Ridge Subdivision." That description connects the modern address to a specific lot on a specific recorded plat.

### Why they diverge

Most Park Ridge properties still sit on a lot that closely matches its original plat lot. But some do not. When a modern parcel boundary differs from a plat lot boundary, the relationship must be classified and documented rather than assumed.

### Why the distinction matters for users

A home buyer or local historian who wants to understand the land history of a property needs to know:

- What was the original subdivision?
- What lot number was this property originally?
- When was that subdivision recorded?
- Who was the original developer or grantor?
- How does this property relate to the original plat?

This cannot be answered from the tax parcel record alone. It requires the plat lot layer.

---

## 4. Data Sources

### Primary source: Cook County GIS plat lots

| Field | Value |
|---|---|
| Source name | Cook County GIS — Subdivision Lots (current year) |
| Publisher | Cook County GIS Department |
| Data type | Polygon feature layer |
| Geometry type | Polygon (EPSG:4326 or EPSG:3435 — verify on download) |
| Access method | ArcGIS FeatureServer REST API (JSON) or bulk download (Shapefile/GeoJSON) |
| ArcGIS REST services root | https://gis.cookcountyil.gov/arcgis/rest/services |
| Key fields | PIN, lot number, block number, subdivision name, section, township, range, geometry |
| Update frequency | Periodic; not real-time |
| How used | Primary source for plat lot geometries; spatial match to `parcels` |
| Limitations | Geometry accuracy depends on GIS digitization quality; some older plats may have poor georeferencing; subdivision name spelling may vary |
| Confidence | High for geometry shape; medium for name spelling |

**Note:** The specific FeatureServer layer ID for the Lots layer must be confirmed at the ArcGIS REST services endpoint above. Look for services named "Lots," "SubdivisionLots," "PlattedLots," or similar. Use `scripts/data/subdivisions/01_inspect_cook_gis_fields.py` as a model for field inspection before ingestion.

**Alternative download:** Cook County GIS data is also available through the Cook County Open Data portal at https://hub.cookcountyil.gov (search for "lots" or "subdivision plats"). Shapefile and GeoJSON formats are typically available. If the FeatureServer is slow or has pagination issues, a bulk download is preferable.

### Secondary source: Cook County GIS current parcels

| Field | Value |
|---|---|
| Source name | Cook County GIS — Parcels (current year) |
| Publisher | Cook County GIS Department |
| Data type | Polygon feature layer |
| Geometry type | Polygon |
| Access method | ArcGIS FeatureServer REST API or bulk download |
| Key fields | PIN (14-digit), address, geometry |
| How used | Cross-check against enriched `parcels` table; supplement missing geometries; provide authoritative parcel boundaries for spatial matching |
| Limitations | PIN format may differ from 14-digit normalized form in the app |
| Confidence | High |

### Historical parcel layers

| Field | Value |
|---|---|
| Source name | Cook County GIS — Historical Parcels (2000, 2021) |
| Publisher | Cook County GIS Department |
| Data type | Polygon feature layers |
| Key fields | PIN, year, geometry |
| How used | Show how parcel boundaries have changed over time; cross-reference with lot geometry |
| Status | GeoJSON snapshots already exist in `public/data/historical/` for 2000 and 2021 |
| Confidence | Medium (dependent on GIS digitization quality for historical records) |

### Cook County Clerk recorded documents

| Field | Value |
|---|---|
| Source name | Cook County Clerk / Recorder of Deeds — Property Records |
| Publisher | Cook County Clerk |
| Access method | Web search at https://www.cookcountyclerkil.gov (plat books) and https://www.cookcountyassessor.com |
| Key fields | Document number, recording date, plat book, plat page, grantor/grantee, legal description |
| How used | Validation only: confirm plat recording dates and document numbers for subdivisions found in the GIS Lots layer; resolve name spelling discrepancies; document edge cases |
| Limitations | Not available as bulk download; requires property-by-property or subdivision-by-subdivision lookup; plat books have been partially digitized |
| Confidence | High when the document is found; manual process |

### CookViewer (manual validation)

| Field | Value |
|---|---|
| Source name | CookViewer — Cook County GIS public map viewer |
| URL | https://cookviewer1.cookcountyil.gov |
| Type | Interactive web map |
| How used | Manual validation of lot geometry, parcel boundary, and subdivision name for specific test cases; not used for bulk ingestion |

### Cook County Assessor — Parcel Universe (Socrata)

| Field | Value |
|---|---|
| Source name | Cook County Assessor — Parcel Universe |
| URL | https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json |
| Key fields | `pin`, `misc_subdivision_id`, `misc_subdivision_data_year` |
| How used | Already used in existing pipeline for `misc_subdivision_id` codes; continue as supplementary source for grouping parcels by assessment area |
| Note | `misc_subdivision_id` is an internal Cook County Assessor area code, not a legal plat name; not suitable as the primary subdivision identifier |

### Park Ridge municipal GIS

| Field | Value |
|---|---|
| Source name | Park Ridge municipal GIS layers |
| Publisher | City of Park Ridge, IL |
| Access method | Check https://www.parkridgeil.gov for any GIS open data portal or ArcGIS map gallery |
| Key fields | Unknown until inspected |
| How used | Supplement if city maintains its own lot or subdivision layer; verify neighborhood and street boundaries |
| Status | Not yet confirmed available; must check before depending on this source |
| Confidence | Unknown |

### PLSS (Public Land Survey System)

| Field | Value |
|---|---|
| Source name | PLSS — Section, Township, Range grid |
| Publisher | BLM General Land Office / USGS |
| Access method | Available from the BLM National Integrated Land System (NILS) or from the Cook County GIS layers |
| Key fields | Section, Township, Range, geometry |
| How used | Provide section/township/range context for plat lots and subdivision pages |
| Note | Park Ridge spans portions of townships 41N and 42N, ranges 11E and 12E of the Third Principal Meridian |

---

## 5. Database Schema

### 5.1 New table: `source_registry`

Formally tracks every dataset or document used as a data source. Replaces the ad-hoc `source_name` / `source_url` text columns scattered across existing tables.

```sql
create table if not exists source_registry (
  id                uuid primary key default gen_random_uuid(),
  source_key        text not null unique,        -- stable identifier, e.g. 'cook_gis_lots_2024'
  source_name       text not null,
  source_type       text not null,               -- 'gis_feature_layer', 'bulk_download', 'web_api', 'recorded_document', 'manual_entry'
  source_url        text,
  publisher         text,
  access_method     text,                        -- 'arcgis_rest', 'socrata', 'bulk_download', 'manual'
  retrieved_at      timestamptz,
  coverage_area     text,                        -- e.g. 'Cook County, IL'
  coverage_years    text,                        -- e.g. '2024' or '2000-2024'
  license_or_terms  text,
  notes             text,
  confidence_default text not null default 'medium'
                      check (confidence_default in ('high','medium','low','unknown')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
```

### 5.2 New table: `gis_lots`

Stores raw Cook County plat lot geometries as imported. This is a raw GIS import table — normalization and enrichment happen downstream in `subdivision_lots`.

```sql
create table if not exists gis_lots (
  id                    uuid primary key default gen_random_uuid(),
  source_id             uuid references source_registry (id),
  source_year           integer,                 -- data year, e.g. 2024
  source_feature_id     text,                    -- original OID or feature ID from GIS source
  geometry              geometry(Geometry, 4326),
  pin                   text,                    -- if GIS lots layer carries a PIN
  lot_number            text,
  block_number          text,
  subdivision_name      text,                    -- as recorded in GIS source (may have spelling variants)
  normalized_subdivision_name text,             -- normalized form for matching
  subdivision_id        uuid references subdivisions (id),  -- FK set during normalization
  township              text,
  range                 text,
  section               text,
  plss_description      text,                    -- full PLSS string if available
  legal_context         text,                    -- any additional legal description context from GIS field
  raw_properties        jsonb,                   -- full original feature properties for auditability
  confidence            text not null default 'medium'
                          check (confidence in ('high','medium','low','unknown')),
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists gis_lots_geometry_idx on gis_lots using gist (geometry);
create index if not exists gis_lots_subdivision_name_idx on gis_lots (lower(subdivision_name));
create index if not exists gis_lots_normalized_name_idx on gis_lots (normalized_subdivision_name);
create index if not exists gis_lots_lot_block_idx on gis_lots (lot_number, block_number);
create index if not exists gis_lots_source_feature_idx on gis_lots (source_feature_id);
create index if not exists gis_lots_subdivision_id_idx on gis_lots (subdivision_id);
```

### 5.3 New table: `gis_parcels`

Stores raw Cook County GIS parcel geometries. Separate from the enriched `parcels` table, which carries assessor data. This is the authoritative geometry record.

```sql
create table if not exists gis_parcels (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid references source_registry (id),
  source_year       integer,
  source_feature_id text,
  pin               text,                        -- may be 10-digit or 14-digit; normalize on import
  pin_normalized    text,                        -- always 14-digit, no hyphens
  address           text,
  geometry          geometry(Geometry, 4326),
  raw_properties    jsonb,
  confidence        text not null default 'high'
                      check (confidence in ('high','medium','low','unknown')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists gis_parcels_geometry_idx on gis_parcels using gist (geometry);
create index if not exists gis_parcels_pin_normalized_idx on gis_parcels (pin_normalized);
```

### 5.4 New table: `parcel_lot_relationships`

Stores the result of spatial matching between tax parcels and GIS plat lots. Each row records one parcel-to-lot spatial overlap event with full metrics.

```sql
create table if not exists parcel_lot_relationships (
  id                              uuid primary key default gen_random_uuid(),
  parcel_id                       uuid references gis_parcels (id),
  lot_id                          uuid references gis_lots (id),
  pin_normalized                  text not null,   -- denormalized for fast lookup
  overlap_area_sqm                numeric,         -- intersection area in square meters
  overlap_pct_of_parcel           numeric,         -- what share of the parcel is covered by this lot
  overlap_pct_of_lot              numeric,         -- what share of the lot is covered by this parcel
  relationship_type               text not null,
    -- 'exact_or_near_exact'       -- >=95% overlap both ways
    -- 'parcel_contains_lot'       -- lot is entirely inside parcel
    -- 'lot_contains_parcel'       -- parcel is entirely inside lot
    -- 'parcel_part_of_lot'        -- parcel is a subset of lot, lot spills outside
    -- 'parcel_spans_multiple_lots'-- parcel overlaps multiple lots (not recorded here; see summary row)
    -- 'ambiguous'                 -- overlaps exist but no clear dominant relationship
    -- 'no_clear_match'            -- minimal or no overlap
  match_confidence                text not null default 'unknown'
                                    check (match_confidence in ('high','medium','low','unknown')),
  match_method                    text not null default 'spatial',
    -- 'spatial'                   -- derived from geometry intersection
    -- 'deed_confirmed'            -- spatial result confirmed by deed language
    -- 'manual'                    -- manually reviewed and assigned
  is_dominant_lot                 boolean,         -- true if this is the best-matching lot for this parcel
  notes                           text,
  created_at                      timestamptz not null default now()
);

create index if not exists plr_pin_idx on parcel_lot_relationships (pin_normalized);
create index if not exists plr_parcel_id_idx on parcel_lot_relationships (parcel_id);
create index if not exists plr_lot_id_idx on parcel_lot_relationships (lot_id);
create index if not exists plr_relationship_type_idx on parcel_lot_relationships (relationship_type);
create index if not exists plr_confidence_idx on parcel_lot_relationships (match_confidence);
```

### 5.5 Existing table enhancements

**`subdivisions` table** — already has nearly everything needed. No structural changes required. The roadmap's new `gis_lots.subdivision_id` FK links back here.

**`subdivision_lots` table** — already has `original_geometry` and `current_parcel_geometry` columns. After GIS ingestion, these can be populated from `gis_lots` geometry for lots that have been matched.

**`property_subdivision_links` table** — already exists and stores the PIN-to-subdivision relationship. After spatial matching, the `match_method` column can be updated to `spatial_gis` for rows derived from the GIS lots layer, distinguishing them from existing `deed_legal_description` rows.

---

## 6. Ingestion Scripts

All scripts follow existing project conventions:
- Python 3.12 in `scripts/data/subdivisions/`
- Use `.env` for credentials
- Support `--dry-run` and `--sample` flags
- Idempotent (upsert, not truncate-and-replace)
- Log clearly with progress counts
- Store raw properties in `raw_properties` jsonb

### 6.1 `scripts/ingest-cook-county-lots.py`

**Purpose:** Download Cook County plat lot geometries for the Park Ridge area and upsert into `gis_lots`.

**Steps:**
1. Load Park Ridge boundary polygon (from `public/data/park_ridge_parcels_map.geojson` convex hull, or from a Park Ridge municipal boundary shapefile if available).
2. Query the Cook County ArcGIS FeatureServer for the Lots layer, clipping to the Park Ridge bounding box.
   - If FeatureServer supports spatial query: use `geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&geometry=<bbox>`.
   - If not: download all Cook County lots (expect a large file) and filter by intersection post-download.
3. Normalize `subdivision_name` to lowercase, strip punctuation, trim whitespace.
4. Upsert into `gis_lots` using `source_feature_id` as the idempotency key.
5. Record source in `source_registry` with `retrieved_at` timestamp.
6. Print summary: total lots downloaded, total for Park Ridge area, unique subdivision names.

**Output:** `gis_lots` table populated; `source_registry` row for the Lots layer.

### 6.2 `scripts/ingest-cook-county-parcels-gis.py`

**Purpose:** Download Cook County GIS parcel geometries for Park Ridge and upsert into `gis_parcels`.

**Steps:**
1. Query Cook County GIS FeatureServer for current parcels, filtered to Park Ridge bounding box.
2. Normalize PIN to 14-digit format (strip hyphens, zero-pad).
3. Upsert into `gis_parcels` using `pin_normalized` as the idempotency key.
4. Record source in `source_registry`.

**Note:** The existing `parcels` table already contains geometry from the main pipeline. `gis_parcels` is the raw-import counterpart. Both are kept to separate raw GIS data from enriched assessor data.

### 6.3 `scripts/match-parcels-to-lots.py`

**Purpose:** Spatially intersect `gis_parcels` with `gis_lots`, compute overlap metrics, classify relationships, and upsert into `parcel_lot_relationships`.

**Runs entirely in PostGIS** — no geometry computation in Python:
1. Call a Supabase RPC function (or run SQL directly via service role) that computes:
   ```sql
   ST_Area(ST_Intersection(p.geometry, l.geometry)) as overlap_area
   ST_Area(ST_Intersection(...)) / ST_Area(p.geometry) as pct_of_parcel
   ST_Area(ST_Intersection(...)) / ST_Area(l.geometry) as pct_of_lot
   ```
2. Classify relationship type (see Section 7).
3. Assign confidence (see Section 10).
4. Upsert into `parcel_lot_relationships`.
5. Update `is_dominant_lot` to true for the best-matching lot per parcel.
6. Write summary stats: parcels matched at high/medium/low/none confidence.

### 6.4 `scripts/generate-subdivision-polygons.py`

**Purpose:** For each subdivision name in `gis_lots`, dissolve all lots into a single polygon and upsert into `subdivision_geometries`.

**Steps:**
1. Group `gis_lots` by `subdivision_id` (after subdivision name normalization and FK assignment).
2. For each group, compute `ST_Union(geometry)` as the subdivision boundary.
3. Upsert into `subdivision_geometries` with `geometry_source = 'gis_lots_dissolved'` and `geometry_method = 'union_of_gis_lots'`.
4. Record confidence as `medium` (boundary is inferred from lot geometries, not from a source that shows the subdivision boundary directly).
5. Add note: "Boundary generated by dissolving individual lot polygons from Cook County GIS Lots layer. Verify against recorded plat for accuracy."

### 6.5 `scripts/normalize-subdivision-names.py`

**Purpose:** Match raw `gis_lots.subdivision_name` values to existing `subdivisions` records or create new ones.

**Steps:**
1. Pull all distinct `subdivision_name` values from `gis_lots`.
2. For each, attempt fuzzy match to existing `subdivisions.normalized_name` (using difflib or rapidfuzz).
3. If match confidence > 0.90: set `gis_lots.subdivision_id` to the matched subdivision.
4. If no match: create a new `subdivisions` row with `entity_type = 'subdivision'`, `geometry_status = 'in_progress'`, `confidence_level = 'medium'`, and `source_name = 'cook_county_gis_lots'`.
5. Print a report of matched, created, and ambiguous names for human review.

### 6.6 `scripts/validate-plat-data.py`

**Purpose:** Run validation checks against known test cases and produce a QA report.

**Test cases (see Section 14):**
- 1325 S Washington St / PIN 12-01-116-015 / George C. Yost's Washington Avenue Resubdivision
- 1328 S Vine / PIN 12-02-209-011-0000 / Lot 4, Block 3, Kinsey Talcott Road Subdivision

**Checks:**
- Does the PIN appear in `gis_parcels`?
- Does the PIN have a matching row in `parcel_lot_relationships`?
- Does the matched lot's `subdivision_name` match the expected subdivision?
- Does the matched lot's `lot_number` and `block_number` match the deed description?
- Is the confidence at least `medium`?

---

## 7. Parcel-to-Lot Matching Logic

All matching runs in PostGIS. The Python scripts call RPCs or use the service-role client to execute SQL.

### Intersection query

```sql
select
  p.pin_normalized,
  p.id as parcel_id,
  l.id as lot_id,
  l.subdivision_name,
  l.lot_number,
  l.block_number,
  ST_Area(ST_Intersection(p.geometry, l.geometry)) as overlap_area_sqm,
  ST_Area(ST_Intersection(p.geometry, l.geometry)) / ST_Area(p.geometry) as overlap_pct_of_parcel,
  ST_Area(ST_Intersection(p.geometry, l.geometry)) / ST_Area(l.geometry) as overlap_pct_of_lot
from gis_parcels p
join gis_lots l on ST_Intersects(p.geometry, l.geometry)
where ST_Area(ST_Intersection(p.geometry, l.geometry)) > 0.5  -- minimum 0.5 sqm to exclude slivers
```

### Relationship classification rules

| Condition | relationship_type |
|---|---|
| overlap_pct_of_parcel >= 0.95 AND overlap_pct_of_lot >= 0.95 | `exact_or_near_exact` |
| overlap_pct_of_lot >= 0.95 AND overlap_pct_of_parcel < 0.95 | `parcel_contains_lot` |
| overlap_pct_of_parcel >= 0.95 AND overlap_pct_of_lot < 0.95 | `lot_contains_parcel` |
| overlap_pct_of_parcel >= 0.70 AND single dominant lot | `parcel_part_of_lot` |
| parcel intersects 2+ lots AND combined pct >= 0.85 | `parcel_spans_multiple_lots` |
| overlap exists but no condition above met | `ambiguous` |
| overlap_area_sqm < 0.5 (sliver) | `no_clear_match` |

### Confidence assignment rules

| Condition | match_confidence |
|---|---|
| `exact_or_near_exact` | `high` |
| `parcel_contains_lot` with overlap_pct_of_lot >= 0.95 | `high` |
| `lot_contains_parcel` with overlap_pct_of_parcel >= 0.95 | `high` |
| `parcel_spans_multiple_lots` with combined coverage >= 0.90 | `medium` |
| `parcel_part_of_lot` with single dominant lot >= 0.70 | `medium` |
| `ambiguous` — multiple lots, no dominant one | `low` |
| `no_clear_match` — sliver or no overlap | `low` |
| Lot has no lot_number or no subdivision_name | Downgrade one level |
| Geometry mismatch (lot is much larger than parcel, e.g. a whole block) | Downgrade to `low` |

### Multiple-lot handling

When a parcel spans multiple lots, all matching lot rows are recorded in `parcel_lot_relationships` with `is_dominant_lot = false`. One summary record with `relationship_type = 'parcel_spans_multiple_lots'` is also inserted. The UI shows all constituent lots.

---

## 8. Subdivision Polygon Generation

After `gis_lots` is populated:

1. Run `normalize-subdivision-names.py` to assign `subdivision_id` FKs on `gis_lots`.
2. For each subdivision (by `subdivision_id`), compute `ST_Union(geometry)` of all its lots.
3. Insert result into `subdivision_geometries` with:
   - `geometry_source = 'cook_county_gis_lots'`
   - `geometry_method = 'dissolve_lots'`
   - `georeference_confidence = 'medium'`
   - A note explaining the boundary is the union of lot polygons, not directly sourced from a plat boundary layer.

**Normalization rules:**
- Lowercase the raw name; strip leading/trailing whitespace.
- Remove common punctuation variants: `'s` and `'s` both normalize the same way.
- Do not merge two subdivisions just because names are similar. A fuzzy match score >= 0.90 still requires human review before merging.
- When in doubt, keep them separate and add them to a review list.
- Never invent alternate names. Store them in `subdivisions.alternate_names` only when evidence supports the equivalence.

---

## 9. UI Surfaces

### 9.1 Property page — Land Ancestry section

**Location in page order:** Between the "Introductory narrative" and the stat grid (position 3.5 in the canonical order, after narrative but before stats).

**Component:** `src/components/ui/LandAncestryPanel.tsx`

**Content (what to show):**

```
Land Ancestry
─────────────────────────────────────────
[Confidence badge: HIGH / MEDIUM / LOW]

This property sits on Lot [X] in Block [Y] of [Subdivision Name],
originally recorded in [year / "an unknown year"].

Chain:
  [Address / PIN] → [Lot X, Block Y] → [Subdivision Name]
  → [Section Z, Township T, Range R] → Cook County, IL

Source: Cook County GIS Lots layer ([year]) · [confidence explanation]

[Warning if ambiguous or low confidence]
[Button: View subdivision page]
[Button: See all lots in this subdivision]
```

**When no match exists:**
```
Land Ancestry — Research Needed
─────────────────────────────────────────
We have not yet matched this property to a recorded plat lot.
This could mean the original plat is not yet in our dataset, or the
parcel boundary differs significantly from any recorded lot.
[Source note]
```

**Design requirements:**
- Use a card with a subtle border and a chain/link icon in the header.
- Confidence badge must use the existing `ConfidenceBadge` component.
- The ancestry chain is displayed linearly: property → lot → subdivision → section/township/range.
- Source is always shown, even for high-confidence matches.
- No em dashes in any user-facing text.

### 9.2 Subdivision page enhancements

The existing `/subdivisions/[id]` page should be extended to show:

- If GIS lot geometries exist: render the lot polygons on the map in addition to the subdivision boundary.
- Show a table of all lots with lot number, block, area, and matched current PIN (if any).
- Show "N lots matched to current parcels" stat.
- Show how many parcels have high vs. medium vs. low confidence matches.
- Add a source badge distinguishing "GIS-derived" from "deed-sourced" data.

No new page is required — extend the existing page component.

### 9.3 City page — "How Park Ridge Was Divided" section

**Location in page order:** After construction by decade chart (position 10.5 in canonical order).

**Component:** `src/components/ui/SubdivisionMapSection.tsx`

**Content:**

- A map showing subdivision polygons color-coded by decade of recording.
- A timeline bar chart: number of subdivisions recorded by decade.
- Stats: total known subdivisions, total GIS-matched lots, total parcels with high-confidence matches, parcels with no known lot match.
- A brief explanation card: "Why are there different shapes? Tax parcels today often differ from the original lots. When two lots were combined into one home or a lot was split, the boundary changed. We match each property to its original plat lot using GIS data from Cook County."
- Toggle between: show all, show GIS-confirmed only, show deed-only.

### 9.4 Map layer toggle for plat lots

**Existing map:** `src/components/MapView.tsx` with the lens selector in `src/lib/mapConfig.ts`.

**New lens:** `lots` — renders `gis_lots` polygon geometries as a semi-transparent layer above the parcel layer.

This requires:
1. A GeoJSON endpoint or a second PMTiles file for lots.
2. A new lens option in `mapConfig.ts` (`lots`).
3. A toggle in the map UI labeled "Original Plat Lots."

The lots layer should be lighter weight than the parcels layer. Serving it as a pre-tiled GeoJSON filtered to Park Ridge is acceptable for the first version.

### 9.5 Confidence and citation display pattern

All GIS-derived matches must show:

- Source dataset name: "Cook County GIS Lots layer (2024)"
- Match method: "Spatial intersection" or "Deed-confirmed"
- Confidence level with the existing `ConfidenceBadge` component
- A brief plain-language explanation of why the confidence is what it is

The existing `ConfidenceBadge` component already supports tooltips. Use `confidence_reason` field to populate the tooltip.

---

## 10. Confidence Model

### Levels

| Level | Meaning |
|---|---|
| `high` | Lot geometry overlaps parcel at 95%+ in both directions, or spatial result confirmed by deed language |
| `medium` | One dominant lot overlaps 70%+ of the parcel, or parcel clearly spans multiple adjacent lots |
| `low` | Multiple partial overlaps with no clear dominant lot, or lot/block fields are missing, or geometry mismatch |
| `unknown` | No match attempted or data unavailable |

### Downgrade triggers

- Missing `lot_number` in GIS data: downgrade one level.
- Missing `subdivision_name` in GIS data: downgrade to `low`.
- Lot geometry is implausibly large (e.g., covers a whole block): downgrade to `low`.
- Subdivision name from GIS does not match any known subdivision name: flag for review, keep at existing level.
- Spatial result conflicts with available deed language: downgrade to `low`, flag for manual review.

### Upgrade triggers

- Spatial result confirmed by deed legal description referencing same lot/block/subdivision: upgrade to `high`.
- Human reviewed and confirmed: upgrade to `high`.

---

## 11. Citation and Source Model

Every piece of data in the Land Ancestry chain carries a source. The `source_registry` table is the single source of truth for dataset metadata.

### Citation display pattern

```
Source: [source_name] · Retrieved [retrieved_at] · [license_or_terms]
```

For GIS-derived data:
```
Source: Cook County GIS Lots layer (2024) · Cook County GIS Department
Accessed via ArcGIS FeatureServer · Data provided as-is; verify significant findings
against recorded plat documents.
```

For deed-sourced data (existing pattern):
```
Source: Cook County Recorder of Deeds · Deed dated [date]
Legal description: [exact text]
Confidence: Medium · Recorded plat verification recommended
```

### Confidence and citation rules

- Never display a lot number, block number, or subdivision name without a source.
- Never display a plat recording date or document number without a source.
- If the GIS layer shows a subdivision name that we cannot confirm from any other source, display it with a `medium` or `low` confidence badge and note the source.
- If the spatial match confidence is `low`, show a visible warning in the UI: "This match is uncertain. We found overlapping plat lot data but could not determine a clear match. Please verify with Cook County plat records."

---

## 12. Known Limitations

1. **Cook County GIS Lots geometry accuracy:** Older plats may have been digitized from scanned paper maps, introducing positional errors. Lot boundaries in the GIS layer may not exactly coincide with modern parcel boundaries even for properties that have not changed since the original plat.

2. **Subdivision name spelling:** The GIS Lots layer's subdivision name field may use different spelling from the original recorded plat (abbreviations, punctuation variants, truncation). Normalization reduces but does not eliminate this problem.

3. **Lots not in the GIS layer:** Some older or smaller subdivisions may not be represented in the Cook County GIS Lots layer if they were recorded from paper plats that have not been digitized. These will show as unmatched.

4. **Resubdivisions:** A modern parcel that sits on a resubdivided lot may match the resubdivision's lot geometry rather than the original subdivision lot. Both matches may be partially correct. The display should show both where possible.

5. **Parcel assembly:** Some large modern parcels were assembled from multiple original lots. The spatial match will show multiple overlapping lots. All are recorded, but the display must make clear that the parcel spans more than one original lot.

6. **Park Ridge boundary filter:** We filter to Park Ridge by spatial intersection with the municipality boundary. The boundary polygon we use for filtering may not exactly match the official Park Ridge municipal limits. Verify that parcels near the city edge are correctly included or excluded.

7. **Geometry coordinate system:** Cook County GIS data may be in EPSG:3435 (Illinois State Plane East, NAD83) rather than EPSG:4326. The ingestion script must reproject to EPSG:4326 before storing in PostGIS. Incorrect projection will produce completely wrong spatial match results.

8. **Historical vs. current lots:** The Cook County GIS Lots layer reflects recorded plats as they exist today in the GIS system, not necessarily the original plat as recorded decades ago. Lot boundaries for vacated streets, consolidated lots, and resubdivisions may reflect amendments to the original plat.

9. **Data freshness:** The Cook County GIS Lots layer is updated periodically but not in real-time. The `source_registry.retrieved_at` field records when data was downloaded. Stale data should be noted to users.

10. **No bulk download for recorded plat images:** The Cook County Clerk's plat books are partially digitized but not available as bulk data. Verification against actual plat documents must be done property-by-property or subdivision-by-subdivision.

---

## 13. Sprint Plan

### Sprint A — Foundation (estimated 2–4 days)

**Goal:** Schema, source registration, and raw data ingestion. No UI yet.

| Step | Task | File(s) to create |
|---|---|---|
| A1 | Write migration for `source_registry` | `supabase/migrations/20260624000000_source_registry.sql` |
| A2 | Write migration for `gis_lots` | `supabase/migrations/20260624000001_gis_lots.sql` |
| A3 | Write migration for `gis_parcels` | `supabase/migrations/20260624000002_gis_parcels.sql` |
| A4 | Write migration for `parcel_lot_relationships` | `supabase/migrations/20260624000003_parcel_lot_relationships.sql` |
| A5 | Inspect Cook County GIS REST services to confirm Lots layer URL and fields | `scripts/data/subdivisions/07_inspect_cook_gis_lots_fields.py` |
| A6 | Write lot ingestion script | `scripts/ingest-cook-county-lots.py` |
| A7 | Write GIS parcel ingestion script | `scripts/ingest-cook-county-parcels-gis.py` |
| A8 | Run ingestion in dry-run mode; review field report | Manual step |
| A9 | Run ingestion for real; verify row counts in Supabase | Manual step |

**Completion check:** `gis_lots` has rows; `source_registry` has a row for the Lots layer; `gis_parcels` has rows.

### Sprint B — Matching (estimated 2–3 days)

**Goal:** Spatial parcel-to-lot matching producing `parcel_lot_relationships` rows.

| Step | Task | File(s) to create |
|---|---|---|
| B1 | Write PostGIS SQL for spatial intersection and classification | `supabase/migrations/20260625000000_parcel_lot_match_rpc.sql` |
| B2 | Write the matching script | `scripts/match-parcels-to-lots.py` |
| B3 | Run matching in dry-run mode; review sample output | Manual step |
| B4 | Run full matching; verify row counts and confidence distribution | Manual step |
| B5 | Run `validate-plat-data.py` against test cases | `scripts/validate-plat-data.py` |
| B6 | Inspect unmatched parcels; document in known limitations | Manual step |

**Completion check:** `parcel_lot_relationships` has rows; at least one of the two test case PINs matches at medium+ confidence.

### Sprint C — Subdivision normalization (estimated 1–2 days)

**Goal:** Link raw `gis_lots` subdivision names to `subdivisions` table rows; generate subdivision polygons.

| Step | Task | File(s) to create |
|---|---|---|
| C1 | Write normalization script | `scripts/normalize-subdivision-names.py` |
| C2 | Write subdivision polygon generation script | `scripts/generate-subdivision-polygons.py` |
| C3 | Run normalization; review match report; manually resolve ambiguous names | Manual step |
| C4 | Run polygon generation; verify in `subdivision_geometries` | Manual step |
| C5 | Spot-check 5 subdivisions in CookViewer | Manual step |

**Completion check:** `gis_lots.subdivision_id` FKs populated for majority of rows; `subdivision_geometries` has polygons for GIS-sourced subdivisions.

### Sprint D — Property page UI (estimated 2–3 days)

**Goal:** Land Ancestry section on the property detail page, end to end.

| Step | Task | File(s) to create/modify |
|---|---|---|
| D1 | Write Supabase RPC: `get_land_ancestry_for_pin(pin text)` | `supabase/migrations/20260626000000_land_ancestry_rpc.sql` |
| D2 | Write query function | `src/lib/supabase/lotQueries.ts` |
| D3 | Build `LandAncestryPanel` component | `src/components/ui/LandAncestryPanel.tsx` |
| D4 | Integrate into property page in correct canonical position | `app/properties/[pin]/page.tsx` |
| D5 | Test with two known validation PINs | Manual step |
| D6 | Test with a PIN that has no match (verify graceful fallback) | Manual step |
| D7 | Run `npm run build`; fix any TypeScript errors | Local build |

**Completion check:** Property page at `/properties/12-01-116-015` shows Land Ancestry section with lot, block, subdivision, and source.

### Sprint E — Subdivision page and city view (estimated 3–4 days)

**Goal:** Subdivision page lot table; city-level subdivision map; map lots layer toggle.

| Step | Task |
|---|---|
| E1 | Add lot table to subdivision detail page |
| E2 | Add lot polygon rendering to subdivision page map |
| E3 | Write `SubdivisionMapSection` city-level component |
| E4 | Add lots map layer to `mapConfig.ts` |
| E5 | Add lots toggle to `MapView.tsx` |
| E6 | Run build; test on city page and subdivision pages |

### Sprint F — Documentation and deployment (estimated 1 day)

| Step | Task |
|---|---|
| F1 | Update `docs/architecture.md` |
| F2 | Update `docs/data_dictionary.md` with new tables and fields |
| F3 | Update `/sources` page content in `src/lib/content.ts` |
| F4 | Push migrations to Supabase production |
| F5 | Deploy to Railway; verify production build |
| F6 | Run validation script against production data |

---

## 14. Validation Checklist

### Test case 1: 1325 S Washington Street

- **Expected subdivision:** George C. Yost's Washington Avenue Resubdivision
- **PIN:** 12-01-116-015 (normalized: 12011160150000 or similar — confirm exact format)
- **Expected lot/block:** Unknown until GIS match — this is what we are trying to confirm

Validation steps:
- [ ] Does PIN 12-01-116-015 (normalized) exist in `gis_parcels`?
- [ ] Does the PIN have at least one row in `parcel_lot_relationships`?
- [ ] Does the matched `gis_lots.subdivision_name` match "George C. Yost's Washington Avenue Resubdivision" or a recognizable variant?
- [ ] What is `match_confidence`? Must be `medium` or `high` to display in UI.
- [ ] If no GIS match: does the property appear in `property_subdivision_links` with a deed-sourced match?
- [ ] If neither GIS nor deed match: document as a known gap and open a research task in `subdivision_research_tasks`.

**Do not invent any lot number, block number, plat date, or document number for this property if not found in data.**

### Test case 2: 1328 S Vine

- **Expected subdivision:** Kinsey Talcott Road Subdivision
- **Expected lot:** Lot 4, Block 3
- **PIN:** 12-02-209-011-0000

Validation steps:
- [ ] Does PIN 12-02-209-011-0000 exist in `gis_parcels`?
- [ ] Does the PIN have at least one row in `parcel_lot_relationships`?
- [ ] Does the matched `gis_lots.lot_number` equal "4" and `gis_lots.block_number` equal "3"?
- [ ] Does the matched `gis_lots.subdivision_name` contain "Kinsey" and "Talcott"?
- [ ] What is `match_confidence`?

This is the stronger test case because the deed language is specific (lot 4, block 3). A correct GIS match should return exactly those values. If the GIS match returns different lot/block numbers, there is either a parcel boundary change since the plat was recorded, or a GIS data quality issue. Document the discrepancy.

### General validation checklist

- [ ] `source_registry` has at least one row with `source_key = 'cook_county_gis_lots_[year]'`
- [ ] `gis_lots` has rows for the Park Ridge area
- [ ] `gis_parcels` has rows for Park Ridge PINs
- [ ] `parcel_lot_relationships` has rows
- [ ] Confidence distribution: what % are high, medium, low, unmatched?
- [ ] Unmatched parcels: what % of Park Ridge parcels have no GIS lot match?
- [ ] Subdivision name normalization: how many unique raw names mapped to existing `subdivisions` rows?
- [ ] How many new `subdivisions` rows were created from GIS data?
- [ ] `subdivision_geometries` has polygon records for GIS-sourced subdivisions
- [ ] Property page at a matched PIN renders Land Ancestry section without TypeScript errors
- [ ] Property page at an unmatched PIN renders fallback gracefully
- [ ] `npm run build` passes with no errors

---

## 15. Manual Steps and Commands

### Local setup

```bash
# Install Python dependencies (if not already installed)
pip install geopandas shapely requests python-dotenv rapidfuzz psycopg2-binary

# Verify Supabase local dev is running
supabase status

# Apply new migrations to local Supabase
supabase db reset  # only if you want to reset; otherwise:
supabase migration up

# Inspect Cook County GIS Lots fields before ingesting
python -m scripts.data.subdivisions.07_inspect_cook_gis_lots_fields

# Dry-run lots ingestion
python scripts/ingest-cook-county-lots.py --dry-run

# Full lots ingestion
python scripts/ingest-cook-county-lots.py

# Dry-run GIS parcel ingestion
python scripts/ingest-cook-county-parcels-gis.py --dry-run

# Full GIS parcel ingestion
python scripts/ingest-cook-county-parcels-gis.py

# Run parcel-to-lot matching (dry run)
python scripts/match-parcels-to-lots.py --dry-run

# Full matching
python scripts/match-parcels-to-lots.py

# Normalize subdivision names
python scripts/normalize-subdivision-names.py

# Generate subdivision polygons from lot union
python scripts/generate-subdivision-polygons.py

# Validate test cases
python scripts/validate-plat-data.py

# Frontend build check
npm run build
```

### Supabase production migration

```bash
# Push to Supabase production (requires Supabase CLI linked to project)
supabase db push

# Or apply migrations one at a time:
supabase migration apply 20260624000000_source_registry
supabase migration apply 20260624000001_gis_lots
supabase migration apply 20260624000002_gis_parcels
supabase migration apply 20260624000003_parcel_lot_relationships
```

### Railway deployment

```bash
# After all migrations are applied to production Supabase and npm run build passes:
git push origin main
# Railway auto-deploys on push to main.
# Monitor Railway deploy logs for build errors.
# Check the health check at / to confirm the app is up.
```

### Validation commands

```bash
# Check row counts in new tables (run against Supabase using psql or Supabase Dashboard SQL editor)
select count(*) from source_registry;
select count(*) from gis_lots;
select count(*) from gis_parcels;
select count(*) from parcel_lot_relationships;
select match_confidence, count(*) from parcel_lot_relationships group by 1 order by 1;
select relationship_type, count(*) from parcel_lot_relationships group by 1 order by 1;

# Check test case PINs
select * from gis_parcels where pin_normalized like '12011160150%';
select * from parcel_lot_relationships plr
  join gis_lots l on l.id = plr.lot_id
  where plr.pin_normalized like '12011160150%';
```

---

*This roadmap is a living document. Update it as implementation decisions are made and limitations are discovered. Do not remove limitations discovered in practice — document them here and in the UI's sources page.*
