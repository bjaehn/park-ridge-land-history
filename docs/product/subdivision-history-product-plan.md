# Subdivision History — Product Plan

Park Ridge Land History — Subdivision History Feature

Last updated: 2026-06-14

---

## User Value

Subdivision history answers the question: "How did this part of Park Ridge become what it is today?"

Before someone built a home at a specific address, that land was:
- Part of a farm or larger tract
- Surveyed and platted by a developer or landowner
- Divided into lots and blocks with street dedications
- Sold off lot by lot over years or decades

Understanding this history connects a modern home to the people, decisions, and forces
that shaped it long before the foundation was poured.

This feature is not a GIS admin tool. It is a local history discovery system built for
curious residents, amateur historians, and people who love Park Ridge.

---

## Core User Question

> "How did this part of Park Ridge become what it is today?"

Secondary questions:
- What larger parcel or farm did this home come from?
- Who originally developed this subdivision?
- When was this area subdivided and platted?
- How long after the subdivision was platted did homes actually get built?
- Is my neighbor's lot from the same subdivision?
- What did this block look like before it was developed?

---

## MVP Scope

The Subdivision History MVP includes:

1. **Data pipeline** — Scripts to download, normalize, match, and load subdivision data
2. **Database schema** — New tables for subdivisions, lots, links, timeline events, sources
3. **Subdivision index route** (`/subdivisions`) — Browse and search all known subdivisions
4. **Subdivision detail route** (`/subdivisions/:id`) — Rich story page for each subdivision
5. **Property page integration** — "Subdivision DNA" section on each property page
6. **Confidence model** — Every claim is labeled with its evidence quality
7. **Empty states** — Every page works gracefully when data is incomplete or unknown
8. **Documentation** — Source inventory, methodology, confidence model, research queue
9. **QA report** — Automated report on match coverage and data gaps

---

## What Is NOT in MVP

- Georeferenced subdivision boundary maps (requires significant manual GIS work)
- Historical farm/tract boundaries (requires manual historical research)
- Pre-subdivision land ownership story (manual research)
- Lot-level geometry overlay on map (needs boundary georeference first)
- Subdivision-to-subdivision family tree (complex, deferred)
- Comparison charts between subdivisions (deferred until more data)
- Block and neighborhood page integration beyond property DNA (deferred)
- Original plat image display (manual acquisition needed)

---

## UX Flows

### Flow 1: From Home to Subdivision

```
Home page → Click "Explore subdivisions" or "How Park Ridge grew"
  → Subdivisions index page (browse/search)
    → Click a subdivision card
      → Subdivision detail page (full story)
```

### Flow 2: From Property to Subdivision

```
Property detail page → "Subdivision DNA" section
  → Shows subdivision name, year, confidence, source
  → Link to full subdivision detail page
```

### Flow 3: Discovery From Homepage

```
Home page → "Explore by subdivision era" section
  → Grid of oldest known subdivisions
  → Click → Subdivision detail page
```

### Flow 4: Empty State Flow (Unknown Subdivision)

```
Property detail page → "Subdivision DNA" section
  → "We don't know yet which subdivision this property is from."
  → "If you know, contact us." (or link to source methodology)
```

---

## Language and Tone

Use language that feels like local discovery:
- "How this area took shape"
- "From larger tracts to neighborhood blocks"
- "Subdivision DNA"
- "What we know"
- "What is still missing"
- "Sources behind the story"

Avoid GIS/admin language:
- Not "Parcel geometry entity"
- Not "Cadastral object"
- Not "Spatial join output"
- Not "Metadata record"

When data is uncertain, say so plainly:
- "We haven't found the original owner yet."
- "The recording date hasn't been confirmed."
- "This match hasn't been verified against the original plat."

---

## Open Questions

1. **Should subdivision boundaries be shown on the map if they haven't been georeferenced?**
   Currently: No. Inferred boundaries should not be displayed as verified boundaries.
   Future: When boundaries are georeferenced, they should be shown with a confidence label.

2. **Should subdivision names from the Cook County GIS attribute be shown to users as "verified"?**
   Currently: No. They are labeled "medium confidence" since the recording date is unknown.
   Future: Cross-reference against Recorder plat index to upgrade to "high."

3. **What is the right way to handle re-subdivisions?**
   A re-subdivision takes an existing lot or block and subdivides it further.
   The re-subdivision has its own recorded plat. For MVP, treat each recorded
   plat as its own subdivision record. In the future, link them as parent/child.

4. **How should the property page show a neighborhood→subdivision→lot chain when only some levels are known?**
   Currently: Show only the levels that have data. Never invent missing levels.
   Use plain language like "We don't know yet" for missing levels.

---

## Future Enhancements (Post-MVP)

1. **Subdivision boundary georeferencing** — Digitize plat maps into GIS boundaries.
   Each boundary would have a confidence label (how precisely it was georeferenced).

2. **Subdivision family tree** — Show "this subdivision was carved out of [earlier plat]"
   relationships when Cook County Recorder records document them.

3. **Historical farm and tract layer** — Map the pre-subdivision land ownership pattern
   using 1876/1886 township plat maps.

4. **Original plat image display** — Link to scanned plat images when located and cleared
   for display.

5. **Build-out timeline** — Show when homes in a subdivision were built relative to the
   plat recording date.

6. **Subdivision era comparison** — Compare when different neighborhoods' subdivisions
   were platted vs. built out.

7. **Search by subdivision era** — Let users filter the map explorer by subdivision
   recording decade.

8. **Original lot overlay** — Display original plat lot grid on the map when
   georeferenced.

---

## Data Roadmap

### Phase 1 (MVP, current)
- Cook County GIS parcel attribute subdivision field (if available)
- Park Ridge land family CSV for manually researched records
- Confidence: medium at best until Recorder records are added

### Phase 2 (Next sprint)
- Cook County Recorder plat index research for top 20–50 subdivisions
- Add recording dates, plat book/page, original owners where findable
- Upgrade matching confidence for those subdivisions

### Phase 3 (Future)
- Begin systematic plat research across all Park Ridge subdivisions
- Digitize subdivision boundaries from plat maps
- Build historical farm/tract layer from 1876–1886 atlas maps
