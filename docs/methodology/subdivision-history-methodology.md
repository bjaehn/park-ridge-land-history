# Subdivision History Methodology

Park Ridge Land History — Subdivision History Feature

Last updated: 2026-06-14

---

## What is a Subdivision?

A subdivision is a legal division of land into smaller parcels, recorded with a county
recorder and referenced by a plat map. In Illinois, subdivisions are recorded with the
Cook County Recorder of Deeds and referenced by plat book and page number or document number.

A recorded subdivision:
- Has an official name
- Was platted (mapped) by a surveyor
- Was approved and recorded on a specific date
- Defines lot and block numbers, street dedications, easements, and sometimes covenants
- Creates the legal framework for selling individual lots

Most of Park Ridge's residential streets and lots were created through recorded subdivisions
between approximately 1880 and 1960. A few areas were platted earlier; some were created
or re-subdivided later.

---

## Key Concepts and Distinctions

### Subdivision vs. Parcel vs. PIN

| Term | Meaning |
|------|---------|
| Subdivision | A legal land division recorded with the Cook County Recorder. Has a name and plat reference. |
| Lot | A single unit within a subdivision as defined by the recorded plat. |
| Block | A group of lots within a subdivision, often bounded by streets. |
| Parcel | The current cadastral unit used by the Cook County Assessor. May or may not correspond to the original platted lot. |
| PIN | Property Index Number. A 14-digit identifier assigned by the Cook County Assessor. Not the same as a lot number. |

A parcel and a lot are often the same physical area, but:
- A parcel may have been split from or combined with original lots over time
- Multiple PINs may cover one original lot (if it was subdivided after platting)
- One PIN may span multiple original lots (if they were combined)
- The Cook County Assessor reassigns PINs when parcels change; original lot numbers remain in the plat

### Neighborhood vs. Subdivision

Neighborhoods in this application are modern approximate groupings of parcels used for
browsing and comparison. They are not the same as recorded subdivisions.

One neighborhood may contain many subdivisions.
One subdivision may overlap with how multiple neighborhoods are defined.

### Subdivision DNA

The term "Subdivision DNA" in this application describes the chain of historical context
for a property:

```
City history
  → Neighborhood
    → Subdivision (recorded plat)
      → Block
        → Lot
          → Current parcel
            → Property (home)
```

For most Park Ridge homes, some steps in this chain are unknown or only inferred.
The application shows what is verified, what is inferred, and what is still unknown.

---

## How Matches Are Made

Subdivision matches are made in the following priority order:

### 1. Exact legal description or source field match (highest confidence)
When a subdivision name comes directly from a verified legal description or recorded plat
reference, this is the most reliable match. Source: Cook County Recorder plat index, title
search records, or verified legal descriptions in public documents.

### 2. Official GIS lot layer match (high confidence)
If Cook County GIS provides an official lot layer derived from recorded subdivision plats,
matching a parcel to a lot in that layer is high confidence. This requires the lot layer
to be available and georeferenced.

### 3. Cook County GIS parcel attribute match (medium confidence)
The Cook County GIS parcel layer may include a `subdivisio` or similar field populated
by the Cook County Assessor. If available, this provides subdivision names for many parcels.
Confidence is medium because the field value comes from the assessor's records, which are
generally reliable but have not been independently cross-checked against the recorded plat
for each parcel.

### 4. Parcel within subdivision geometry (medium confidence)
If a subdivision boundary has been georeferenced (digitized from a plat map or other
spatial source), a parcel that falls within that boundary is likely in that subdivision.
This is medium confidence because:
- The boundary may be approximate
- A parcel near a boundary may be assigned incorrectly

### 5. Parcel centroid within subdivision geometry (medium confidence)
Same as above but uses parcel centroid rather than full polygon. Slightly more reliable for
parcels that straddle subdivision boundaries.

### 6. Address or street segment match (low confidence)
Matching by street name or address range against known street-subdivision associations.
Lower confidence because streets often cross subdivision boundaries.

### 7. Fuzzy normalized name match (low confidence)
Matching subdivision names after normalization and fuzzy comparison. Used when exact
normalization doesn't produce a match. Subject to false positives.

### 8. Manual review
Matches assigned by a researcher after reviewing primary source documents. Stored with
`match_method = "manual_review"` and `confidence_level = "high"`.

### No match
If no match is found, the parcel is added to the manual research queue and displayed
with `confidence_level = "unknown"`.

---

## Confidence Scoring

Each subdivision match has a confidence level:

| Level | Meaning |
|-------|---------|
| `high` | Subdivision name and/or date from an official recorded plat, official GIS lot layer, or verified legal description |
| `medium` | Subdivision name from Cook County GIS parcel attribute or other official-but-unverified source; recording date NOT confirmed |
| `low` | Subdivision name inferred from spatial overlap, historical map, or aerial imagery without precise source confirmation |
| `unknown` | No reliable subdivision record found; parcel is in the manual research queue |

See `docs/methodology/subdivision-confidence-model.md` for full detail on how confidence levels are assigned.

---

## Known Limitations

### Year built is not the subdivision recording date
The Cook County Assessor's year-built field represents when the primary structure was built,
not when the subdivision was recorded. A subdivision may have been platted many years
before homes were built on its lots.

### Parcel boundaries change over time
Current parcel boundaries do not reconstruct original platted lot configurations. Lots
may have been combined, split, or otherwise reconfigured since the subdivision was recorded.
The Cook County Assessor's historical parcel layers (2000 and 2021 snapshots available in
this system) help document some of these changes but do not go back to original platting.

### Pre-1985 records may be difficult to access
Cook County Recorder records for older subdivisions may be difficult to access
programmatically. Some early plats predate digital records and may only exist in
physical plat books at the Cook County Clerk's office.

### Subdivision boundary georeferencing
Original recorded subdivision plats were hand-drawn maps, not georeferenced digital layers.
To create subdivision boundary polygons, a researcher would need to georeference each plat
against a modern map. This is time-intensive and requires GIS skills.

### Name variations and re-subdivisions
Park Ridge has many subdivisions with similar names, including re-subdivisions and
additions. Normalization reduces but does not eliminate the risk of merging distinct
subdivisions with similar names or splitting one subdivision into apparent duplicates.

### Pre-subdivision land history
The farms, tracts, and large landholdings that preceded subdivision are only partially
documented in available programmatic sources. Historical atlas maps and township plat
maps are the primary source for pre-subdivision land history and require manual research.

---

## How to Add Manual Research

1. Research a subdivision record in the Cook County Recorder's plat index at `ccrd.info`.
2. Record the subdivision name, plat book, plat page, document number, and recording date.
3. Add rows to `data/raw/park_ridge_land_family.csv` with `record_type = "subdivision_plat"`.
4. Re-run scripts 03–06 to re-extract, match, and reload.
5. Update `docs/data-sources/manual-research-queue.md` to mark researched items.

For high-confidence records (verified from recorded plat), set:
- `confidence_level = "high"`
- `match_method = "manual_review"`
- `source_name` to the exact source (e.g., "Cook County Recorder Plat Book 123 Page 45")

---

## Data Pipeline

The subdivision history data pipeline consists of six numbered scripts in
`scripts/data/subdivisions/`:

| Script | Purpose |
|--------|---------|
| `01_inspect_cook_gis_fields.py` | Discover what subdivision fields the Cook County GIS layer has |
| `02_download_cook_gis_parcels_subdivisions.py` | Download parcels with subdivision fields |
| `03_extract_subdivision_candidates.py` | Extract and normalize unique subdivision names |
| `04_match_parcels_to_subdivisions.py` | Match parcels to subdivisions with confidence scoring |
| `05_load_to_supabase.py` | Load records into the database |
| `06_generate_qa_report.py` | Generate QA markdown report |

Run scripts in order. Each script is idempotent; it can be safely re-run.

---

## Source Citations

Every subdivision record and every parcel-subdivision link stores:
- `source_name` — the name of the data source
- `source_reference` — plat book/page, document number, or URL
- `confidence_level` — high, medium, low, or unknown
- `confidence_reason` — plain-English explanation of the confidence level
- `match_method` — the matching technique used

This ensures that every claim shown to users can be traced to its source.
