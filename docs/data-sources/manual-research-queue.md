# Manual Research Queue

Park Ridge Land History — Subdivision History Feature

Last updated: 2026-06-14

This file tracks items that require manual research to complete the subdivision history
data for Park Ridge, Illinois. Items are grouped by research type and priority.

Do not hallucinate. Every item added to this file should describe what is unknown
and what source would resolve it. Do not invent subdivision names, dates, owners,
or narratives.

---

## Priority 1: Recorded Subdivision Plat References

These items require searching the Cook County Recorder's plat index at `ccrd.info`
or in person at the Cook County Clerk's office.

### What to look up

For each known subdivision name (found via Cook County GIS or other sources):

- **Plat book and page** — The physical plat book number and page in the Recorder's archive
- **Document number** — The recording reference number
- **Recording date** — The date the plat was officially recorded
- **Grantor/developer** — The person or company who recorded the plat (often the developer)

### How to add findings

Add rows to `data/raw/park_ridge_land_family.csv` with:
```
record_type: subdivision_plat
title: [Subdivision Name]
description: [Brief description of what was found]
source_name: Cook County Recorder of Deeds
case_number: [Document number or Plat Book X Page Y]
```

Then re-run the pipeline starting at script 03.

### Priority subdivisions to research

*(This list will be populated after running the data pipeline and identifying the most
common subdivision names in the Cook County GIS data.)*

- [ ] Top 5 subdivisions by parcel count — verify recording dates
- [ ] Any subdivision where `recorded_year` is null
- [ ] Subdivisions with conflicting or ambiguous names

---

## Priority 2: Pre-1985 Plat Records

Older Cook County plat records may not be in digital systems at ccrd.info.
Research methods for pre-1985 records:

- **Cook County Recorder's physical plat books** at 69 W. Washington, Chicago
- **Newberry Library** in Chicago holds digitized early Cook County land records
- **Cook County Law Library** may have plat books for research
- **Park Ridge History Center** may have local plat copies

### Items in this category

- [ ] Any subdivision believed to predate 1940 where recording date is not confirmed
- [ ] Early commercial or industrial plats in downtown Park Ridge (Uptown area)
- [ ] Plats from the early 1900s that may have been recorded before digital systems

---

## Priority 3: Historical Farm and Tract Boundaries

Before subdivision, Park Ridge was farmland, nursery land, and large estate tracts.
These pre-subdivision land units are not recorded in any programmatic source.

### Research approach

1. Locate township plat maps for Maine Township, Cook County (41N 12E):
   - 1876 Warner & Beers Illinois atlas
   - 1886 Snyder Cook County plat book
   - 1893 or later editions
   
2. Identify farm owner names, lot configurations, and any early plat outlines

3. Document in `historical_land_units` table:
   - Owner name
   - Approximate acreage
   - Map year
   - Source reference

4. For geographic scope: the area that became Park Ridge was partly nursery land
   (the Grove Nursery, Hodge nursery, and others), partly vegetable farms, and
   partly estate property.

### Known historical land features to research

- [ ] Early nursery operations (Grove, Hodge, and similar) that occupied large tracts
  before residential platting
- [ ] The original "Park Ridge" plat area near Uptown
- [ ] Original railroad right-of-way and its effect on street and lot patterns
- [ ] Large estate or farm tracts north and west of the early village
- [ ] Any recorded donations or dedications of parkland

---

## Priority 4: Ambiguous or Duplicate Subdivision Names

Some subdivision names in Cook County records may refer to different plats,
or the same subdivision may have multiple spellings.

### How to handle

When two subdivision records appear to refer to the same plat:
1. Look up both names in the Cook County Recorder plat index
2. If they share a plat book/page reference, they are the same plat
3. Mark one as the canonical name and add the other to `alternate_names`
4. If they are different plats with similar names, keep them separate

### Items to check

- [ ] Any subdivision names that appear near-identical after normalization
  (run script 03 and review the name index for apparent duplicates)
- [ ] "Subdivision of Block X of [Earlier Plat]" naming patterns
  (these are re-subdivisions of specific blocks, not separate neighborhoods)

---

## Priority 5: Missing Original Owners and Developers

For subdivisions where the original owner or developer is unknown:

### Research sources

- Cook County Recorder plat index (grantor/grantee in recorded plat)
- Historical newspapers (Park Ridge Advocate archives, available at local library)
- City directory listings for developers active in the relevant era
- Cook County Assessor historic ownership records (if accessible)

### How to add findings

Update the subdivision record:
```sql
update subdivisions
set
  original_owner = 'Name of Original Owner',
  developer = 'Name of Developer (if different)',
  updated_at = now()
where normalized_name = 'SUBDIVISION NAME';
```

Or add a new row to the land family CSV with `record_type = "subdivision_plat"`.

---

## Priority 6: Missing Recorded Plat Images

For high-priority subdivisions, finding the scanned plat image would allow:
- Visual verification of lot/block layout
- Identification of original street names
- Any notes on the plat about dedication, covenants, or original owners

### Sources for scanned plat images

- Cook County Recorder of Deeds (may have scanned images online or in person)
- Park Ridge History Center (may have copies of Park Ridge plats)
- Newberry Library (historical plat collections)
- Illinois State Archives

### Subdvisions where scanned plat image is a priority

- [ ] The oldest known Park Ridge subdivision (once recording date is confirmed)
- [ ] Any subdivision where the original street pattern differs from current streets
- [ ] Any subdivision where lot boundaries appear to have changed significantly

---

## Status Key

- `[ ]` — Not yet researched
- `[~]` — Partially researched, more work needed
- `[x]` — Research complete, data added to pipeline

---

## Notes on Research Ethics and Terms

All research should use publicly available sources.

- **Cook County Recorder records** are public records, freely available at ccrd.info
- **HARGIS records** are published by the Illinois State Historic Preservation Office
- **LOC Sanborn maps** are public domain digitizations
- **Historical newspaper archives** accessible at Park Ridge History Center or library
- **Physical plat books** at the Cook County Clerk's office are public records

Do not scrape restricted, paywalled, or prohibited sources.
Do not fabricate or estimate data — only record what sources confirm.
