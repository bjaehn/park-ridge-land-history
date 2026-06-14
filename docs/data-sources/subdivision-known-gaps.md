# Subdivision Data — Known Gaps

Park Ridge Land History — Subdivision History Feature

Last updated: 2026-06-14

This file documents known gaps in the subdivision history data. It is honest about
what is missing, what is uncertain, and what cannot be resolved with currently available
programmatic data sources.

---

## Gap 1: Subdivision Recording Dates

**Status:** Unknown for most subdivisions.

**Why it matters:** The recording date is the most important date in a subdivision's history.
It marks when the land was officially platted and lots became available for sale.
The recording date is NOT the same as when homes were built.

**What we have now:** Subdivision names from the Cook County GIS parcel attribute (if available).

**What is missing:** The plat book/page reference and recording date.

**How to resolve:** Manual research in the Cook County Recorder's plat index at `ccrd.info`
or in person at the Cook County Clerk's office. See `docs/data-sources/manual-research-queue.md`.

---

## Gap 2: Original Owners and Developers

**Status:** Unknown for all subdivisions in the current programmatic data.

**Why it matters:** Knowing who developed a subdivision connects it to Park Ridge's
economic and immigration history.

**What is missing:** Original platters, developers, and grantors.

**How to resolve:** Cook County Recorder plat grantor/grantee fields; historical newspapers;
city directories.

---

## Gap 3: Subdivision Geometries (Boundaries)

**Status:** No georeferenced subdivision boundaries exist in the current system.

**Why it matters:** Without boundaries, we cannot:
- Show subdivision areas on a map
- Confidently match parcels that lack a GIS attribute value
- Visualize how subdivisions fit together across the city

**What is missing:** Georeferenced polygon boundaries for each subdivision.

**How to resolve:** This requires digitizing recorded plat maps in GIS software.
Each plat would need to be located, scanned if not already scanned, and georeferenced
against current street basemaps. This is a significant research and GIS effort.

---

## Gap 4: Pre-Subdivision Land History

**Status:** Not yet researched.

**Why it matters:** Before residential platting, Park Ridge was farmland, nursery operations,
and estate properties. This earlier layer of history — who owned the land before the
developer platted it — is part of the "Subdivision DNA" story.

**What is missing:** Historical land units (farms, nurseries, tracts), owner names,
approximate boundaries, map sources.

**How to resolve:** Research in historical township plat maps and county atlases
(1876, 1886, 1893 editions). See `docs/data-sources/manual-research-queue.md`.

---

## Gap 5: Lot-Level Matching

**Status:** Lot and block numbers are not reliably matched for most parcels.

**Why it matters:** The exact lot and block from the original plat is the most granular
piece of Subdivision DNA. Knowing "Lot 5, Block 3 of Example Addition" connects a home
directly to its original recorded identity.

**What is missing:** Verified lot and block numbers for current PINs.

**How to resolve:** Requires either:
- The Cook County GIS lot layer (if it exists and contains lot/block numbers)
- Manual lookup of lot/block from the recorded plat and parcel legal description
- Title search records for individual properties

---

## Gap 6: Re-Subdivision Relationships

**Status:** Not yet modeled.

**Why it matters:** Many Park Ridge lots were re-subdivided after their original plat —
sometimes splitting one lot into two, sometimes re-platting an entire block.
The re-subdivision has its own recorded plat and name.

**What is missing:** Parent-child links between a re-subdivision and its original plat.

**How to resolve:** Track in the Cook County Recorder plat index. When a re-subdivision
is found, record its reference and the original subdivision name in the notes field.

---

## Gap 7: Original Plat Images

**Status:** No scanned plat images have been located or linked.

**Why it matters:** The original plat image shows the surveyor's drawing, original
lot dimensions, street dedications, covenants, and any notes from the platters.
It is the primary document for subdivision history.

**How to resolve:** Locate and link scanned plat images from:
- Cook County Recorder of Deeds
- Park Ridge History Center
- Newberry Library
- Illinois State Archives

---

## Gap 8: Coverage Before 1940

**Status:** Uncertain. Records from the 1880s–1930s may be harder to access digitally.

**Why it matters:** Park Ridge's earliest residential subdivisions were platted in the
late 1800s and early 1900s. These are the oldest and most historically significant plats.

**What is missing:** Verified data for early subdivisions.

**How to resolve:** Cook County Recorder records go back to the county's founding.
However, very early plats may only be accessible in physical plat books.
The Park Ridge History Center and Newberry Library may have local copies.

---

## Gap 9: Commercial and Institutional Plats

**Status:** Not yet in scope.

**Why it matters:** Not all platted land became residential. Downtown Park Ridge,
the Uptown area, and some commercial corridors have their own plat history.

**How to resolve:** Future research scope. Not part of the residential subdivision MVP.

---

## How to Update This File

When a gap is resolved (fully or partially):
1. Update the status field for that gap
2. Note what data was added and what source was used
3. Mark resolved items in `docs/data-sources/manual-research-queue.md`
