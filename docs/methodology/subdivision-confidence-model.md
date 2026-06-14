# Subdivision Confidence Model

Park Ridge Land History — Subdivision History Feature

Last updated: 2026-06-14

---

## Purpose

This document explains the confidence model used to label each subdivision record and
each parcel-to-subdivision match in the Park Ridge Land History application.

Confidence labels are shown to users so they can understand what is verified,
what is estimated, and what is still unknown.

**This is not a disclaimer. It is a feature.**
Showing uncertainty honestly is better than hiding it.

---

## Confidence Levels

Four confidence levels are used:

### High

The subdivision name and/or recording date come from an official recorded plat,
the Cook County official GIS lot layer, or a verified legal description.

**What makes a record high confidence:**
- Subdivision name verified against the Cook County Recorder's recorded plat index
- Plat book, plat page, and document number on file
- Recording date confirmed from the plat record
- OR: Match comes from the Cook County official GIS lot layer (when available)

**Example:** "Subdivision XYZ was recorded on April 14, 1924, per Cook County Recorder
Plat Book 87 Page 34, Document No. 8712345."

---

### Medium

The subdivision name comes from an official-but-unverified source (Cook County GIS
parcel attribute, assessor legal description field, or similar). Recording date is
not confirmed.

**What makes a record medium confidence:**
- Subdivision name from the Cook County GIS parcel `subdivisio` field
- The field is populated by the Assessor's office from plat data, but the specific
  plat has not been independently verified for this match
- Recording date is NOT available from this source

**Example:** "This parcel's Cook County GIS attribute field shows the subdivision name
as 'Elmwood Park Addition.' The name has not been cross-checked against the original
recorded plat. Recording date is unknown."

---

### Low

The subdivision name is inferred from spatial overlap, a historical map, or aerial
imagery without direct source confirmation.

**What makes a record low confidence:**
- Parcel's position overlaps an approximate subdivision boundary derived from
  a historical map or aerial imagery
- The boundary was not georeferenced with high precision
- The match has not been verified against primary source documents

**Example:** "This parcel appears to fall within a block that may be part of
'Keeney's Subdivision,' based on approximate boundaries inferred from a 1925
plat map. This has not been verified against the recorded plat."

---

### Unknown

No reliable subdivision record has been found for this parcel.

**What makes a record unknown:**
- The Cook County GIS parcel attribute has no subdivision value for this parcel
- No manual research has identified the subdivision
- The parcel may be in the manual research queue

**Example:** "We have not yet identified the original subdivision for this property.
It may be in the manual research queue."

---

## Match Methods and Default Confidence

Each parcel-to-subdivision link has a `match_method` that determines its default confidence:

| Match Method | Default Confidence | Description |
|---|---|---|
| `exact_legal_description` | High | Exact match from verified legal description |
| `official_gis_lot_layer` | High | Match from Cook County official GIS lots layer |
| `manual_review` | High | Assigned by researcher after reviewing primary sources |
| `parcel_gis_attribute` | Medium | Subdivision name from Cook County GIS parcel field |
| `parcel_within_geometry` | Medium | Parcel polygon within georeferenced subdivision boundary |
| `parcel_centroid_in_geometry` | Medium | Parcel centroid within subdivision boundary |
| `address_street_match` | Low | Inferred from address or street segment match |
| `fuzzy_name_match` | Low | Fuzzy normalized name comparison |
| `no_match` | Unknown | No match found |

---

## Confidence vs. Accuracy

Confidence labels reflect how the match was made, not how likely it is to be wrong.

A high-confidence match from the Cook County Recorder's plat index is very likely
to be correct. A medium-confidence match from the GIS parcel attribute is probably
correct but has not been independently verified.

A low-confidence or unknown label does not mean the subdivision is wrong —
it means the evidence hasn't been fully verified yet.

---

## How Confidence Is Stored

In the database:
- `subdivisions.confidence_level` — overall confidence for the subdivision record itself
- `property_subdivision_links.confidence_level` — confidence for each parcel-to-subdivision link
- `property_subdivision_links.confidence_reason` — plain-English explanation

In the UI:
- ConfidenceBadge component uses `high | medium | limited` levels
- For subdivision-specific use, `low` maps to `limited` in the badge
- `unknown` is displayed as a plain-English "We don't know yet" message

---

## How Confidence Is Used in the UI

**High confidence:**
> "This home appears to sit within [Subdivision Name], a subdivision recorded in [year],
> per Cook County Recorder Plat Book [X] Page [Y]."

**Medium confidence:**
> "Based on Cook County property records, this home appears to be in [Subdivision Name].
> The subdivision recording date has not been confirmed."

**Low confidence:**
> "This home may be in [Subdivision Name], based on its location relative to an
> approximate subdivision boundary. This has not been verified against the recorded plat."

**Unknown:**
> "We have not yet identified the original subdivision for this property.
> This parcel is in the manual research queue."

---

## Updating Confidence

When a researcher verifies a subdivision record against the Cook County Recorder
or another primary source:

1. Update the `park_ridge_land_family.csv` row with the verified plat reference
2. Set `record_type = "subdivision_plat"` and `source_name` to the exact source
3. Re-run the pipeline (scripts 03–06)
4. The system will update `confidence_level` to `high` and store the plat reference

For direct Supabase updates (for immediate corrections without a pipeline re-run):
```sql
update subdivisions
set
  confidence_level = 'high',
  confidence_reason = 'Verified from Cook County Recorder Plat Book X Page Y',
  plat_book = 'X',
  plat_page = 'Y',
  recorded_year = 1924,
  source_name = 'Cook County Recorder of Deeds',
  updated_at = now()
where normalized_name = 'EXAMPLE SUBDIVISION NAME';
```

---

## What We Never Claim

We do not claim that:
- Year built = subdivision recording date
- Aerial imagery buildout date = plat recording date
- Neighboring home's subdivision = this home's subdivision (without independent evidence)
- A subdivision name from one source is correct without cross-checking

We do not hide uncertainty. If a claim has low confidence, we say so.
If we don't know, we say so.
