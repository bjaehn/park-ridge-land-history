# Park Ridge Land History Product Roadmap

## Purpose

This roadmap is the durable execution plan for making the app excellent enough in design and usability to send to real Park Ridge residents. It is the result of a full cross-functional audit conducted June 23, 2026 against the live production app and the full codebase.

The roadmap supersedes the previous version. All Sprint 1-3 tasks from the prior cycle that are still unimplemented are carried forward below. New findings from the fresh audit are added as new tasks (prefixed with 0.x for Sprint 0 blockers and new numbered tasks within each sprint).

---

## Launch Readiness Verdict

**Not ready until must-fix items are addressed.**

The app has a genuinely excellent property page and a strong city history page. It has correct data, a working confidence system, and a trustworthy sources page. However:

- Every neighborhood detail page returns HTTP 404. The slug values in `src/lib/content.ts` do not match the slug values in the Supabase `neighborhoods` table. The entire neighborhood layer is inaccessible to users.
- The primary navigation exposes "Township" and "Section" as Cook County PIN taxonomy terms. Two nav items link to the same URL (/city). Streets are not in the nav.
- The About page says "please reach out" with no email, link, or form.
- /streets returns 404.

Fix these four issues. Then the app is ready for a small controlled user test.

---

## Product Principles

1. Every page must have one clear job.
2. Every major claim must be sourced, labeled as inferred, or removed.
3. Never show the same insight twice under different names.
4. Property pages must feel personal and specific.
5. Neighborhood and subdivision pages must explain development patterns, not just display records.
6. Visuals must add meaning, not decoration.
7. Maps, charts, timelines, and cards must work together as a story system.
8. Users must always know where they are in the hierarchy.
9. Fallback states must explain missing data honestly.
10. The app must feel premium, local, historical, and useful.

---

## Persona Coverage Summary

| Persona | Served today | Primary blocker |
|---------|-------------|-----------------|
| Home shopper | Partially | Neighborhood 404 |
| Relocation buyer | Poorly | Nav confusion + neighborhood 404 |
| Current homeowner | Well (property page) | Neighborhood 404 |
| Longtime resident | Partially | Nav labels expose PIN taxonomy |
| New homeowner | Well (property page) | Neighborhood 404 |
| Buyer agent | Partially | "Quick summary" label; neighborhood 404 |
| Listing agent | Partially | Same as buyer agent |
| Local history enthusiast | Well | No source note on neighborhood narratives |
| Historic preservation | Well | Activity signal has no definition |
| Historical Society researcher | Partially | No inferred label on era notes |
| Local journalist | Partially | No named author on About page |
| Neighbor comparing homes | Partially | Streets not in nav; /streets is 404 |
| Parent evaluating neighborhood | Poorly | Neighborhood 404 |
| Mobile-only user | Unknown | Nav search is cramped; table scrolls |
| Skeptical first-time visitor | Partially | Neighborhood 404 kills credibility |
| Site admin | Partially | No data quality queue; no needs-attention panel |
| Content editor | Partially | No draft/preview workflow |
| Historical researcher | Partially | No source workflow for neighborhood content |
| Data quality reviewer | Poorly | No data quality dashboard |
| Address correction reviewer | Unknown | Auth wall; no queue visible |
| User feedback reviewer | Poorly | No feedback mechanism exists |
| Product owner | Well | Roadmap is current |
| Support person | Poorly | No contact mechanism |

---

## Must-Fix Blockers

### Blocker 0.1: Neighborhood detail pages return HTTP 404

**Issue:** The slug values in `NEIGHBORHOOD_NARRATIVES` and `NEIGHBORHOOD_ERA_LABELS` in `src/lib/content.ts` ("uptown", "northeast", "central", "northwest", "south") do not exist in the Supabase `neighborhoods` table. `getNeighborhoodBySlug(slug)` queries `eq("slug", slug)` and finds no matching row, causing the page to call `notFound()`.

**Affected personas:** Every public persona.

**Why it blocks useful feedback:** Every neighborhood card on the homepage grid and the city page table links to a 404. The entire neighborhood layer is invisible. This is the most visible defect in the product.

**Exact fix:**
1. In the Supabase SQL editor, run: `SELECT id, slug, label FROM neighborhoods ORDER BY label LIMIT 50;`
2. Identify the actual slug values stored for each neighborhood.
3. If slugs are null or do not match the content.ts keys: update the `slug` column in the database to match "uptown", "northeast", "central", "northwest", "south" for the corresponding neighborhood records. OR update the keys in `NEIGHBORHOOD_NARRATIVES` and `NEIGHBORHOOD_ERA_LABELS` to match whatever the DB uses.
4. Approach (a) (update DB slugs) is preferred if the DB currently has null or auto-generated slugs. Approach (b) (update content.ts keys) is safer if the DB slugs are already meaningful and used elsewhere.
5. After the fix, confirm that `/neighborhoods/[slug]` returns 200 for all neighborhood slugs that exist in the DB.

**Files likely involved:** `src/lib/content.ts` (if using approach b), Supabase `neighborhoods` table (if using approach a).

**Complexity:** Low if it is a slug column update. Medium if the DB has no slug column populated.

**Acceptance criteria:** Every neighborhood card links to a page that returns 200 with neighborhood content, narrative, stat grid, and map.

**Verification:** Load /neighborhoods. Click every card. Confirm 200 on each.

---

### Blocker 0.2: "Township" and "Section" in primary navigation

**Issue:** `NAV_LINKS` in `src/components/TopNav.tsx` contains "Township" (linking to /city) and "Section" (linking to /pin/09). These are Cook County PIN taxonomy terms. "Township" and "City history" both link to /city, creating a duplicate nav item. "Section" links to a raw PIN taxonomy page.

**Exact fix:** Remove "Township" and "Section" from `NAV_LINKS`. Keep "City history" as the single link to /city. Add "Streets" linking to /streets.

**Files:** `src/components/TopNav.tsx`

**Acceptance criteria:** Nav shows: Neighborhoods, Subdivisions, Streets, City history, (Data sources, About). No PIN taxonomy terms.

---

### Blocker 0.3: /streets returns 404 and streets are not in navigation

**Issue:** `/streets` returns HTTP 404. The `/streets/[street]` detail pages exist but are only reachable from property detail pages. "Streets" is not in the navigation.

**Exact fix:** Create `app/streets/page.tsx` with a heading ("Streets in Park Ridge"), a one-paragraph explanation of what street pages show, and a prompt to search by address to find a street. Add "Streets" to `NAV_LINKS` in `TopNav.tsx` after Subdivisions.

**Files:** `app/streets/page.tsx` (new), `src/components/TopNav.tsx`

**Acceptance criteria:** /streets returns 200. "Streets" appears in the nav on desktop and mobile.

---

### Blocker 0.4: About page contact mechanism missing

**Issue:** `app/about/page.tsx` line 25 says "please reach out" with no email, form, or link. Users who find errors cannot report them.

**Exact fix:** Add a mailto link or GitHub Issues URL after the "please reach out" sentence. Add a "Start here" section with three user paths. See Task 1.8 details below.

**Files:** `app/about/page.tsx`

**Acceptance criteria:** About page has a working contact link and a "Start here" section.

---

## Design and Usability Excellence Scorecard

| Category | Score (1-5) | Primary issue | Required improvement |
|----------|-------------|--------------|---------------------|
| First impression | 3 | Township/Section in nav | Fix nav labels |
| Visual hierarchy | 4 | Section headings use `<p>` not `<h2>` | Semantic heading elements |
| Navigation | 2 | Two items link to /city; no Streets | Fix nav (Blocker 0.2) |
| Search | 3 | No "no results" state; no loading indicator | Add empty state and loading |
| Property page | 4 | Two sale sections; "Quick summary" label | Merge sections; rename |
| Neighborhood page | 1 | All 404 | Fix Blocker 0.1 |
| Subdivision page | 3 | Three overlapping sales sections | Remove NeighborhoodPriceChart |
| City history page | 4 | Construction chart has no context note | Add context note |
| Map usability | Unknown | Cannot evaluate without live browser | Evaluate in Sprint 2 |
| Chart usability | 3 | NeighborhoodPriceChart adds no value; charts lack descriptions | Remove weak chart; add descriptions |
| Mobile usability | 2 | Nav search cramped; neighborhood table scrolls | Fix in Sprint 2 |
| Accessibility | 2 | `<p>` for headings; hardcoded aria-selected | Semantic headings (Sprint 2) |
| Trust and source clarity | 3 | Neighborhood narratives unsourced; no inferred labels | Sprint 1 tasks 1.6 and 3.3 |
| Shareability | 2 | No og:image; no share prompt | Sprint 2 |
| Admin dashboard | 2 | No data quality queue | Sprint 3 |
| Admin data quality | 1 | No data quality workflow | Sprint 3 |
| Admin content editing | 3 | No draft/preview state | Sprint 3 |
| Admin source workflow | 2 | No neighborhood-level source workflow | Sprint 3 |
| Design system consistency | 4 | Section heading element inconsistency | Sprint 2 |
| Overall design craft | 3 | Excellent property page; broken neighborhood layer | Fix blockers first |

---

## Top 15 Design and Usability Fixes (Ranked)

| Rank | Issue | Area | Severity | Launch blocker | Sprint |
|------|-------|------|----------|---------------|--------|
| 1 | Neighborhood detail pages 404 | Public | Critical | Yes | 0 |
| 2 | Township and Section in nav | Public | Critical | Yes | 0 |
| 3 | No contact mechanism on About page | Public | High | Yes | 0 |
| 4 | Neighborhoods landing page opening copy | Public | High | Yes | 1 |
| 5 | /streets returns 404; not in nav | Public | High | Yes | 0 |
| 6 | NeighborhoodPriceChart on subdivision pages | Public | High | No | 1 |
| 7 | "Quick summary" should be "Agent summary" | Public | Medium | No | 1 |
| 8 | No source note on neighborhood narratives | Public | Medium | No | 1 |
| 9 | Era context notes not labeled as inferred | Public | Medium | No | 1 |
| 10 | No context notes above ConstructionByDecadeCharts | Public | Medium | No | 1 |
| 11 | Merge duplicate sale sections on property pages | Public | Medium | No | 1 |
| 12 | Activity signal has no definition | Public | Medium | No | 1 |
| 13 | Section headings use `<p>` not `<h2>` | Public | Medium | No | 2 |
| 14 | No "Explore more" prompts at end of pages | Public | Medium | No | 2 |
| 15 | No og:image/og:description metadata | Public | Low | No | 2 |

---

## Information Architecture Plan

**Recommended primary nav:** Neighborhoods | Subdivisions | Streets | City history
**Reference nav:** Data sources | About
**Brand:** Park Ridge (links to /)

**Hierarchy:**
- City (/city): orientation, city-wide development character
  - Neighborhood (/neighborhoods/[slug]): lived area, historical character, streets list
    - Street (/streets/[street]): all homes on the street, era comparison
      - Property (/properties/[pin]): individual home story
  - Subdivision (/subdivisions/[id]): legal plat history, lot list, parent/child hierarchy
    - Property (/properties/[pin]): same home, different entry path

PIN taxonomy (/pin/*): accessible from the city page "Browse by section" grid only. Not in primary nav.

**Naming rules (enforce in all copy):**
- "neighborhood" not "district" or "area"
- "subdivision" not "plat," "development," or "addition"
- "property" not "parcel" or "lot"
- "built" not "constructed" or "developed"
- "recorded" not "filed" for plat dates

**Breadcrumb rules:**
- Property: Park Ridge > [Street Name] > [Address]
- Street: Park Ridge > Streets > [Street Name]
- Neighborhood: Park Ridge > Neighborhoods > [Name]
- Subdivision: Park Ridge > Subdivisions > [Name]
- City: Park Ridge > City history

**Cross-linking requirements:**
- Property pages link to: street page, neighborhood page (if assigned), subdivision (via lineage)
- Street pages link to: neighborhood page (if assigned)
- Neighborhood pages link to: city page
- Subdivision pages link to: city page, parent subdivision (if exists)
- City page links to: all neighborhoods, "See all subdivisions"

---

## Search Plan

**Current failure modes:**
1. No "no results" state when the dropdown returns empty.
2. No loading indicator during the 180ms debounce window.
3. Placeholder copy inconsistency ("Search address or PIN" vs. "Search an address or PIN").
4. Homepage example "Uptown" suggests neighborhood search but produces address results.
5. No PIN format guidance.

**Required changes:**
- Unify placeholder: "123 Main St or 14-digit PIN" on all search inputs.
- Add a "No properties found. Try a full street address." message when results are empty.
- Add a visual loading indicator (spinner or skeleton row) that shows after the debounce fires.
- Replace "Uptown" in homepage examples with a real address (e.g., "100 Prospect Ave").
- Confirm that arrow-key navigation in the search dropdown updates `aria-selected` on each item.

---

## Mobile and Accessibility Plan

**Critical mobile issues:**
- TopNav search is compressed between brand and hamburger on 320px viewports.
- City page neighborhood comparison table will scroll horizontally on phones.
- Sparkline cards stack in single column on mobile (correct behavior but creates long scroll before property content).

**Critical accessibility issues:**
- All section headings use `<p className="section-heading">` not `<h2>` or `<h3>`. Screen readers cannot navigate by heading.
- Search result listbox has `aria-selected="false"` hardcoded; never updates.
- Section elements sometimes use `<div>` and sometimes use `<section>` inconsistently.

**Sprint 2 accessibility targets:**
- Convert all `<p className="section-heading">` to `<h2 className="section-heading">` (or `<h3>` for sub-sections) across all public page types.
- Add `overflow-x-auto` to the city page neighborhood comparison table.
- Update `aria-selected` on search results during keyboard navigation.

---

## Historical Trust Plan

**Confidence signal pattern (already implemented, maintain):**
- ConfidenceBadge on property pages with showDescription
- InlineSourceNote on sales, permits, HARGIS, subdivision ancestry
- Confidence level shown in subdivision lineage source rows

**Gaps to address in Sprint 1:**
- Add InlineSourceNote after each rendered neighborhood narrative (Task 1.6).
- Add "(Inferred)" in muted text after era context notes on property pages (promoted from Sprint 3).

**Gaps to address in Sprint 3:**
- Add "(Primary record)" label option to InlineSourceNote for deed-backed facts.
- Add "How records are linked" and "What to do if something looks wrong" to the sources page.
- Move neighborhood narratives to the database so they can be sourced through admin.

**Historical claim pattern (enforce on all new content):**
- Claim: the factual statement
- Source: the specific source document or dataset
- Source type: Official record / Survey / Derived from data / Inferred
- Confidence: High / Medium / Low
- Interpretation: one plain-English sentence when the claim requires interpretation
- Related entity: the PIN, subdivision ID, neighborhood slug, or city

---

## Real Estate Usefulness Plan

**What works today:**
- Construction era context on property pages.
- Subdivision ancestry with lot/block and source confidence.
- Sale history with prices, deed types, and document numbers.
- Assessment trend chart with year-over-year context.
- HARGIS survey data for architecturally significant properties.
- "Agent summary" (currently "Quick summary") with copyable text.
- "Questions to consider" section flagging buyer-relevant patterns.

**Sprint 1 additions:**
- Rename "Quick summary" to "Agent summary."

**Sprint 3 additions:**
- Expand "What this means" to include HARGIS bullet, appeal bullet, and frequent-turnover bullet.
- Expand Agent summary text to include HARGIS status and assessment change summary.

**What must never be added:**
- Appraisal claims.
- Inspection claims.
- School quality claims.
- Safety or crime context.
- Investment return projections.
- Lending or mortgage claims.
- Legal advice of any kind.

---

## Sprint 0: Critical Blockers (implement before any Sprint 1 work)

These four fixes must be deployed before any user testing. They are the minimum required to make the product usable.

### Task 0.1: Fix neighborhood detail page 404

See Blocker 0.1 above for full details.

**Files:** `src/lib/content.ts` (if rekeying) or Supabase `neighborhoods` table (if updating slugs)

**QA steps:**
1. Run `SELECT id, slug, label FROM neighborhoods ORDER BY label;` in Supabase SQL editor.
2. Confirm the slug values match (or update to match) the keys in NEIGHBORHOOD_NARRATIVES.
3. Load /neighborhoods. Click every card. Confirm all return 200.

---

### Task 0.2: Remove Township and Section from navigation; add Streets

**Files:** `src/components/TopNav.tsx`

**Changes:**
1. Remove the "Township" entry from `NAV_LINKS`.
2. Remove the "Section" entry from `NAV_LINKS`.
3. Add `{ href: "/streets", label: "Streets" }` after the Subdivisions entry.

**QA steps:**
1. Load the homepage. Confirm nav shows: Neighborhoods, Subdivisions, Streets, City history.
2. Open mobile hamburger menu. Confirm same items.
3. Navigate to /city. Confirm "Browse by section" grid is still present.
4. Navigate to /streets. Confirm it does not 404.

---

### Task 0.3: Create /streets index page

**Files:** `app/streets/page.tsx` (new file)

**Content:** A simple page with:
- Breadcrumb: Park Ridge > Streets
- PageHeader: title "Streets", subtitle "Browse every street in Park Ridge, block by block."
- One paragraph: "Each street page shows all properties on that street, grouped by construction era. To find a specific street, search for any address on that street using the search bar above."
- Link to homepage: "Search by address"

**QA steps:**
1. Load /streets. Confirm 200 and readable content.
2. Confirm breadcrumb links correctly.
3. Confirm "Streets" nav item links to /streets.

---

### Task 0.4: Add contact mechanism and "Start here" section to About page

**Files:** `app/about/page.tsx`

**Changes:**
1. Add a "Start here" section before the existing paragraphs:
   - "Looking at a specific property? Search by address in the bar at the top of any page."
   - "Want to understand a neighborhood? Browse neighborhoods."
   - "Curious about Park Ridge history? Start with the city history page."
   Each with a clickable link.
2. Replace "please reach out" with a concrete contact mechanism: a mailto link or GitHub Issues URL.

**QA steps:**
1. Load /about. Confirm "Start here" section is present.
2. Click each "Start here" link. Confirm all navigate correctly.
3. Click the contact link. Confirm it opens a working destination.

---

## Sprint 1: Clarity, Cleanup, and Information Architecture

### Goal

Remove confusion, duplication, and inconsistent structure. Make the app easier to understand before adding new features.

### Why This Sprint Matters

The app cannot feel trustworthy or premium if users see repeated metrics, unclear entity relationships, inconsistent labels, or pages that do not have a clear job. The top navigation currently exposes Cook County PIN taxonomy terms (Township, Section) as primary navigation. Three separate sales visualizations still appear on subdivision pages. The neighborhoods landing page still opens with an internal data-model explanation rather than a user-facing value proposition. Neighborhood narratives still lack source attribution. These issues undermine every other investment the previous sprints made.

Fix the structure first. Then build on it.

### Scope

1. Fix neighborhoods landing page opening copy.
2. Remove NeighborhoodPriceChart from subdivision pages.
3. Merge sale price chart and sale history list on property pages.
4. Add source attribution (InlineSourceNote) to neighborhood narratives.
5. Add explanation to "Activity signal" stat label.
6. Add context notes above ConstructionByDecadeChart sections on city, neighborhood, and subdivision pages.
7. Update neighborhood page subtitles to include era labels.
8. Rename "Quick summary" to "Agent summary" on property pages.
9. Add "(Inferred)" label to era context notes on property pages.

### Out of Scope for Sprint 1

- Do not add new historical facts or narratives.
- Do not redesign the full visual system.
- Do not add new charts unless replacing duplicated ones.
- Do not rewrite the data model.
- Do not start Sprint 2 visual changes.

---

### Detailed Tasks

---

#### Task 1.1: Fix the neighborhoods landing page framing

**Current problem:** `app/neighborhoods/page.tsx` line 26 renders: "Three overlapping ways to understand Park Ridge geography: official planning districts, business districts, and informal local names." This exposes the internal data model instead of the user value.

**Required change:**
1. Open `app/neighborhoods/page.tsx`.
2. Replace the PageHeader subtitle with: "Each neighborhood in Park Ridge has a distinct history and character. Start with a name you recognize or explore by construction era."
3. Keep the section headers inside the NeighborhoodsGrid ("Official Planning Neighborhoods," "Business Districts," "Local / Market Neighborhoods") as secondary organization.

**Files:** `app/neighborhoods/page.tsx`

**Acceptance criteria:**
- Neighborhoods page does not contain "Three overlapping ways."
- Opening copy is user-facing and explains the page's job.
- No em dashes in the updated copy.

**QA steps:**
1. Load /neighborhoods. Confirm the opening subtitle is user-facing.
2. Confirm neighborhood section headers inside the grid are still present.
3. Confirm mobile layout is not broken.

---

#### Task 1.2: Remove NeighborhoodPriceChart from subdivision pages

**Current problem:** `app/subdivisions/[id]/_SubdivisionDetailContent.tsx` lines 197-207 render a NeighborhoodPriceChart (2015 vs. 2024 two-bar comparison) that shows the same data already shown in the Sales activity stat cards and the MarketHistoryChart. Three sections show the same sales data.

**Required change:**
1. Open `app/subdivisions/[id]/_SubdivisionDetailContent.tsx`.
2. Remove the "Median sale price, 2015 vs. 2024" section (lines 197-207).
3. Remove the `priceRow` variable and its computation (lines 124-126) if only used for this section.
4. Remove the `salesByYear` state and `fetchBlockSalesByYear` import if only used for `priceRow`.
5. Remove the `NeighborhoodPriceChart` import if no longer used.
6. Keep the Sales activity stat cards and MarketHistoryChart sections unchanged.

**Files:** `app/subdivisions/[id]/_SubdivisionDetailContent.tsx`

**Acceptance criteria:**
- Subdivision pages no longer show "Median sale price, 2015 vs. 2024."
- Subdivision pages still show "Sales activity" stat cards.
- Subdivision pages still show the MarketHistoryChart.
- No TypeScript errors. No unused imports.

**QA steps:**
1. Load any subdivision detail page. Confirm "Median sale price, 2015 vs. 2024" is gone.
2. Confirm "Sales activity" stat cards appear.
3. Confirm MarketHistoryChart appears.
4. Run `npm run build`.

---

#### Task 1.3: Merge sale price chart and sale history list on property pages

**Current problem:** `app/properties/[pin]/_PropertyDetailContent.tsx` renders "Sale price history" (SalesPriceChart) and "Sale history (N on record)" (SaleHistorySection) as two adjacent sections from the same `sales` array.

**Required change:**
1. Combine into one "Sale history" section.
2. The SalesPriceChart renders inside the combined section when at least one sale has a price.
3. The expandable SaleHistorySection list renders below the chart within the same section.
4. Remove the separate "Sale price history" heading.
5. The InlineSourceNote from SaleHistorySection remains at the bottom of the combined section.

**Files:** `app/properties/[pin]/_PropertyDetailContent.tsx`

**Acceptance criteria:**
- Property pages have one "Sale history" section heading, not two.
- Chart renders above the expandable list.
- Source note is present at the end of the section.
- No TypeScript errors.

**QA steps:**
1. Load a property page with multiple sales. Confirm one heading for the sales section.
2. Confirm chart appears above the list.
3. Confirm the expandable list works.
4. Confirm source note is present.

---

#### Task 1.4: Add source attribution to neighborhood narratives

**Current problem:** `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx` lines 74-76 render the narrative paragraph with no InlineSourceNote. The city narrative has one; neighborhood narratives do not.

**Required change:**
1. Open `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`.
2. After the `{narrative && <p ...>{narrative}</p>}` line, add an InlineSourceNote inside the same conditional block:
   "Historical summary based on Cook County Assessor build-year distributions and Cook County Recorder subdivision records. Era characterizations are interpretive summaries of the data. Confidence: Medium."

**Files:** `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`

**Acceptance criteria:**
- All rendered neighborhood narratives are followed by an InlineSourceNote.
- The note cites Cook County Assessor and Recorder records at Confidence: Medium.
- No note appears when there is no narrative.
- No em dashes in the note text.

**QA steps:**
1. Load a neighborhood page with a known slug. Confirm InlineSourceNote appears below the narrative.
2. Load a neighborhood page without a narrative. Confirm no orphaned source note.

---

#### Task 1.5: Add explanation to "Activity signal" stat label

**Current problem:** `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx` lines 52-63 show an "Activity signal" stat with values like "Reinvestment," "Turnover," "Rebuild," or "Dormant" with no definition.

**Required change:**
1. Open `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`.
2. After the StatGrid, add a conditional paragraph that explains the current signal value:
   - Reinvestment: "Elevated permit activity relative to the city median, suggesting ongoing improvement work."
   - Turnover: "Elevated sale frequency relative to the city median."
   - Rebuild: "Recent teardown or significant reconstruction activity detected."
   - Dormant: (do not show the stat at all - already suppressed by the current code when signal is "Dormant")
3. Style as `<p className="text-xs text-text-muted -mt-6">` (negative top margin to visually connect to the stat grid).

**Files:** `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`

**Acceptance criteria:**
- A neighborhood page showing "Reinvestment," "Turnover," or "Rebuild" has a one-sentence explanation visible.
- The explanation is consistent with the signal value shown.
- No em dashes in the explanation text.

---

#### Task 1.6: Add context notes above ConstructionByDecadeChart sections

**Current problem:** ConstructionByDecadeChart renders on city, neighborhood, and subdivision pages without a sentence explaining what to look for.

**Required change:**

On `app/city/_CityContent.tsx`:
- Before the chart (after "How Park Ridge was built" heading), add:
  "Park Ridge's housing stock reflects three distinct construction waves: the railroad-era 1870s-1880s, the interwar bungalow boom of the 1910s-1930s, and the postwar expansion of the 1940s-1960s."

On `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`:
- Before the chart, add a note using `NEIGHBORHOOD_ERA_LABELS[slug]` when available. Example for "northeast": "The Northeast was built primarily during the bungalow-era expansion, 1910s to 1940s."
- For slugs not in NEIGHBORHOOD_ERA_LABELS, use: "Construction in this neighborhood spanned multiple decades, as shown below."

On `app/subdivisions/[id]/_SubdivisionDetailContent.tsx`:
- Before the chart, add using `earliestBuilt` and `latestBuilt`: "Construction in this plat began in {earliestBuilt} and extended through {latestBuilt}." Adjust for single-year cases.

Style all context notes as `<p className="text-sm text-text-muted mb-4">`.

**Files:**
- `app/city/_CityContent.tsx`
- `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`
- `app/subdivisions/[id]/_SubdivisionDetailContent.tsx`

**Acceptance criteria:**
- Each construction chart section has a one-sentence context note between the heading and the chart.
- The city note references the three construction waves.
- The neighborhood note references the era label when available.
- The subdivision note references the known earliest and latest build years.
- Notes are all different and scoped to their level.
- No em dashes in the notes.

---

#### Task 1.7: Update neighborhood page subtitles to include era labels

**Current problem:** `app/neighborhoods/[slug]/page.tsx` line 49 sets the PageHeader subtitle to `"{N} properties. Typical build year: {year}."` This is dry. The era labels in NEIGHBORHOOD_ERA_LABELS are more useful but not currently shown on the detail page.

**Required change:**
1. Import `NEIGHBORHOOD_ERA_LABELS` from `@/lib/content` in `app/neighborhoods/[slug]/page.tsx`.
2. Replace the subtitle with: `NEIGHBORHOOD_ERA_LABELS[slug] ?? \`\${neighborhood.parcelCount} properties. Typical build year: \${neighborhood.medianYear}.\``

**Files:** `app/neighborhoods/[slug]/page.tsx`

**Acceptance criteria:**
- Neighborhood pages with known slugs show the era label in the subtitle.
- Neighborhood pages with unknown slugs show the property count and median year fallback.
- No em dashes in the subtitle (era labels use hyphens, not em dashes).

---

#### Task 1.8: Rename "Quick summary" to "Agent summary"

**Current problem:** The shareable copyable summary block on property pages is labeled "Quick summary." Agents do not look for "quick summaries." The label undersells the feature.

**Required change:**
1. Open `app/properties/[pin]/_PropertyDetailContent.tsx`.
2. Find the section heading at approximately line 700-701.
3. Change "Quick summary" to "Agent summary."

**Files:** `app/properties/[pin]/_PropertyDetailContent.tsx`

**Acceptance criteria:**
- Property pages show "Agent summary" as the section heading.
- The "Shareable" badge still appears.
- The clipboard copy button still works.

---

#### Task 1.9: Add "(Inferred)" label to era context notes

**Current problem:** The `eraContextNote` ("Built during the postwar era.") appears on property pages at line 683 without indicating it is an interpretation, not a primary record.

**Required change:**
1. Open `app/properties/[pin]/_PropertyDetailContent.tsx`.
2. In the rendering of `eraContextNote` (the `<p className="text-sm text-text-muted">` block), append a `<span className="text-xs text-text-muted ml-1">(Inferred)</span>` after the era context text.

**Files:** `app/properties/[pin]/_PropertyDetailContent.tsx`

**Acceptance criteria:**
- Era context notes show "(Inferred)" in muted text.
- Year built, sale price, and assessment values do not show this label.

---

### Sprint 1 Acceptance Criteria

- /neighborhoods/[any-existing-slug] returns 200 with neighborhood content.
- Nav shows: Neighborhoods, Subdivisions, Streets, City history.
- /streets loads without 404.
- Neighborhoods landing page subtitle does not contain "Three overlapping ways."
- Subdivision pages have no NeighborhoodPriceChart section.
- Property pages have one "Sale history" section (chart above list).
- All rendered neighborhood narratives have an InlineSourceNote.
- "Activity signal" stat has an explanation when shown.
- About page has a "Start here" section and a contact link.
- Each ConstructionByDecadeChart section on city, neighborhood, and subdivision pages has a context note.
- Neighborhood pages with known slugs show era labels in the subtitle.
- Property pages show "Agent summary" heading.
- Era context notes show "(Inferred)" in muted text.
- `npm run build` passes with no TypeScript errors.
- No em dashes anywhere in changed content.

### Sprint 1 QA Checklist

- [ ] Homepage: nav shows Neighborhoods, Subdivisions, Streets, City history
- [ ] Homepage: nav does not show Township or Section
- [ ] Streets: /streets loads without 404
- [ ] Streets: "Streets" appears in mobile nav
- [ ] Neighborhoods landing: opening copy is user-facing (no "Three overlapping ways")
- [ ] Neighborhoods: click every card, confirm 200 response
- [ ] Neighborhood detail (known slug): InlineSourceNote below narrative paragraph
- [ ] Neighborhood detail (known slug): era label in subtitle
- [ ] Neighborhood detail (known slug): context note before construction chart
- [ ] Neighborhood detail (known slug): Activity signal has explanation if shown
- [ ] Neighborhood detail (unknown slug): no orphaned source note; fallback subtitle correct
- [ ] Subdivision detail: no NeighborhoodPriceChart section
- [ ] Subdivision detail: Sales activity stat cards present
- [ ] Subdivision detail: MarketHistoryChart present
- [ ] Subdivision detail: context note before construction chart
- [ ] Property detail: one "Sale history" section heading, chart above list
- [ ] Property detail: expandable list still works
- [ ] Property detail: source note still present after sale list
- [ ] Property detail: "Agent summary" heading with "Shareable" badge
- [ ] Property detail: "(Inferred)" after era context note
- [ ] City history: Browse by section grid still present
- [ ] City history: context note before construction chart
- [ ] About: "Start here" section with three clickable paths
- [ ] About: contact link or email present and working
- [ ] Mobile: nav hamburger does not show Township or Section
- [ ] Mobile: neighborhood subtitle not truncated on small screens
- [ ] Console: no new errors
- [ ] Build: `npm run build` passes
- [ ] Em dash scan: zero matches across all changed files

---

## Sprint 2: Visual Storytelling and Page Consistency

### Goal

Make the product feel premium, coherent, visual, local, and usable across devices.

### Why This Sprint Matters

After Sprint 1 makes the product understandable and usable, Sprint 2 makes it enjoyable. A product that works but feels like a generic data dashboard will not generate the "I want to share this" moment. Sprint 2 creates that moment.

### Scope

1. Enforce canonical section order on neighborhood detail pages.
2. Add MarketHistoryChart to neighborhood detail pages.
3. Add a framing note before the property timeline.
4. Add "Explore more" prompts at the end of property and neighborhood pages.
5. Audit all chart sections for four required elements (heading, description, chart, source note).
6. Convert `<p className="section-heading">` to semantic `<h2>` or `<h3>` across all public page types.
7. Add `overflow-x-auto` to the city page neighborhood comparison table.
8. Add og:image and og:description metadata to property and neighborhood pages.
9. Add a minimal footer (copyright year, About link, Data sources link, contact link).
10. Reduce the homepage neighborhoods grid to a teaser (6 cards max, "See all neighborhoods" link).
11. Fix `aria-selected` updates in the search results listbox.

### Out of Scope for Sprint 2

- Do not add unsourced historical claims.
- Do not introduce decorative visuals that do not explain something.
- Do not add heavy animation.
- Do not start Sprint 3 historical trust work.

---

### Detailed Tasks

---

#### Task 2.1: Enforce canonical section order on neighborhood detail pages

**Required section order (from CLAUDE.md):**
1. Narrative paragraph with InlineSourceNote
2. StatGrid
3. mapSlot (neighborhood map)
4. "Median sale price, 2015 vs. 2024" NeighborhoodPriceChart
5. "How [label] was built" ConstructionByDecadeChart with context note
6. "Home sales in this neighborhood" MarketHistoryChart (Task 2.2)
7. HighlightReel
8. Streets list

**Files:** `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`

**Acceptance criteria:** Section order matches canonical order. No content is removed.

---

#### Task 2.2: Add MarketHistoryChart to neighborhood detail pages

**Current problem:** Neighborhood pages do not show a full sales trend over time. Subdivision pages do. Neighborhoods are the more user-facing concept.

**Required change:**
1. In `_NeighborhoodDetailContent.tsx`, after the existing `fetchNeighborhoodPins` call, also call `fetchSubdivisionMarketHistory(pins)` from `src/lib/supabase/subdivisionQueries.ts`.
2. Store the result in a `marketHistory` state variable.
3. Render a `MarketHistoryChart` section after the ConstructionByDecadeChart with heading "Home sales in this neighborhood" and description: "Bars show annual sales volume. Line shows median sale price. Market sales only, $50K to $5M."
4. Add an InlineSourceNote: "Cook County Recorder of Deeds."
5. Only render if `marketHistory.length >= 3`.

**Files:**
- `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`
- `src/lib/supabase/subdivisionQueries.ts` (import only)

**Acceptance criteria:** Neighborhood pages show MarketHistoryChart when at least 3 data points exist. Section is gracefully hidden when data is sparse.

---

#### Task 2.3: Add framing note before property timeline

**Required change:** In `app/properties/[pin]/_PropertyDetailContent.tsx`, inside the timeline section, add between the heading and the `<PropertyTimeline>` component:
`<p className="text-sm text-text-muted mb-3">Key moments in this property's recorded history, from the original plat to the most recent transaction.</p>`

**Acceptance criteria:** Framing sentence appears above the timeline. No em dashes.

---

#### Task 2.4: Add "Explore more" prompts

**Property pages:** After the assessor record details, add an "Explore more" section with contextual links:
- "View all properties on [street name]" linking to `/streets/[street_name_normalized]` (only when `props.street_name_normalized` exists)
- "Learn about the [neighborhood name] neighborhood" linking to `/neighborhoods/[slug]` (only when a neighborhood assignment exists)

**Neighborhood pages:** After the streets list, add:
- "Search for a property in this neighborhood" linking to / with a note suggesting the neighborhood name
- "See Park Ridge city history" linking to /city

**Style:** Simple text links with right arrow, using `text-accent-purple hover:underline`.

**Acceptance criteria:**
- Property pages end with "Explore more" section containing at least one contextual link.
- Street link only renders when `street_name_normalized` is present.
- Neighborhood link only renders when a neighborhood assignment is present.

---

#### Task 2.5: Convert section heading `<p>` elements to `<h2>` or `<h3>`

**Current problem:** Throughout the app, section headings use `<p className="section-heading">`. Screen readers cannot navigate by heading. WCAG 2.1 requires heading markup for headings.

**Required change:**
1. Identify all uses of `<p className="section-heading">` on public-facing pages.
2. Replace with `<h2 className="section-heading">` (or `<h3>` for sub-sections within a page that already has an `<h2>`).
3. The visual styling is unchanged; only the element changes.
4. Do not apply to admin pages in this sprint.

**Acceptance criteria:**
- All section headings on property, neighborhood, subdivision, street, and city pages use `<h2>` or `<h3>`.
- No visual regressions.

---

#### Task 2.6: Audit all chart sections for four required elements

Every chart section on city, neighborhood, subdivision, and street pages must have:
1. A heading
2. A one-sentence description explaining what the chart shows
3. The chart itself
4. An InlineSourceNote

For any missing element, add it. Do not change chart data or component logic.

**Files:**
- `app/city/_CityContent.tsx`
- `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`
- `app/subdivisions/[id]/_SubdivisionDetailContent.tsx`
- `app/streets/[street]/_StreetDetailContent.tsx`

---

### Sprint 2 Acceptance Criteria

- Neighborhood detail pages follow canonical section order.
- Neighborhood detail pages include MarketHistoryChart when data is available.
- Property pages have a framing note before the timeline.
- Property and neighborhood pages have "Explore more" sections.
- All chart sections on all major page types have: heading, description, chart, source note.
- All section headings on public pages use `<h2>` or `<h3>`.
- City page neighborhood table does not scroll horizontally on mobile (has overflow-x-auto).
- Shared property and neighborhood links show title and description in social previews.
- A footer exists on all public pages.
- `npm run build` passes.
- No em dashes.

### Sprint 2 QA Checklist

- [ ] Neighborhood pages: section order matches canonical (narrative, stats, map, price chart, construction chart, market chart, highlights, streets)
- [ ] Neighborhood pages: MarketHistoryChart present where data exists
- [ ] Neighborhood pages: "Explore more" section at end
- [ ] Property pages: framing note before timeline
- [ ] Property pages: "Explore more" section at end with street and neighborhood links
- [ ] Property pages: street link absent when street_name_normalized is missing
- [ ] Property pages: neighborhood link absent when no neighborhood assignment
- [ ] City page: all charts have heading, description, chart, source note
- [ ] Neighborhood page: all charts have heading, description, chart, source note
- [ ] Subdivision page: all charts have heading, description, chart, source note
- [ ] Street pages: all charts have heading, description, chart, source note
- [ ] Screen reader test: navigate by heading, confirm major sections are reachable
- [ ] Mobile: neighborhood page is readable and sections are in correct order on small screens
- [ ] Mobile: city page neighborhood table does not scroll horizontally
- [ ] Social preview: share a property page URL in Slack or iMessage, confirm title and description appear
- [ ] Footer: visible on homepage, property page, neighborhood page, city page
- [ ] Console: no new errors
- [ ] Build: `npm run build` passes
- [ ] Em dash scan: zero matches in all changed files

---

## Sprint 3: Historical Trust, Admin Workflows, and Real Estate Usefulness

### Goal

Make the product credible, operationally maintainable, and useful for agents, buyers, homeowners, and historians.

### Why This Sprint Matters

After Sprints 0/1 and 2 fix structural and visual foundations, Sprint 3 deepens the product's value proposition. The agent summary needs more content. Historians need confidence labels. Admins need a data quality view. The feedback loop needs to be closed.

### Scope

1. Expand "What this means" on property pages (HARGIS bullet, appeal bullet, turnover bullet).
2. Expand Agent summary text to include HARGIS status and assessment change.
3. Add "(Inferred)" and "(Primary record)" source type labels to InlineSourceNote pattern.
4. Add "How records are linked" and "What to do if something looks wrong" to the sources page.
5. Add plain-English genealogy context to subdivision pages.
6. Add an admin "Needs attention" panel to the dashboard.
7. Move neighborhood narratives to the Supabase database (or document this as a known limitation with a ticket).

### Out of Scope for Sprint 3

- Appraisal, inspection, school, safety, or investment claims.
- New neighborhood boundaries.
- Full audit trail implementation.
- Public user-facing feedback form (email is sufficient for initial feedback collection).

---

### Historical Claim Pattern (enforce on all new Sprint 3 content)

| Field | Description |
|-------|-------------|
| Claim | The factual statement |
| Date or date range | When this occurred or was recorded |
| Source | The specific source document or dataset |
| Source type | Official record / Survey / Inferred from data |
| Confidence | High / Medium / Low |
| Interpretation | One plain-English sentence |
| Related entity | Property PIN, subdivision ID, neighborhood slug, or city |

---

### Task 3.1: Expand "What this means" on property pages

Add bullets when data supports them:
- If `hargisRecords.length > 0`: "This property was documented in the Illinois Historic Architecture Survey, which noted its architectural significance."
- If `appealYears.length > 2`: "This property has had {appealYears.length} assessment appeals on record. Assessment appeals are filed by owners who believe the assessed value is too high."
- If `recentSaleCount > 4`: "This property has sold {actualSaleCount} times since records began, which is above average for the area."

**Files:** `app/properties/[pin]/_PropertyDetailContent.tsx`

---

### Task 3.2: Expand Agent summary text

Add to `buildQuickSummary()`:
- If `hargisRecords.length > 0`: "Documented in the Illinois Historic Architecture Survey."
- If `assessmentTimeline.length >= 2`: "Assessed value changed from ${first.value} to ${last.value} between {first.year} and {last.year}."

**Files:** `app/properties/[pin]/_PropertyDetailContent.tsx`

---

### Task 3.3: Add methodology sections to the Data Sources page

Add after existing sections:
1. "How records are linked": plain-English explanation of PIN-based joining, spatial joins, and neighborhood boundary approximations.
2. "What to do if something looks wrong": specific guidance for year built discrepancies (check assessor), subdivision name errors (check recorder), and app-level errors (contact link).

**Files:** `app/sources/page.tsx`

---

### Task 3.4: Add genealogy context to subdivision pages

When `entityType === "estate"`: add "This land was originally part of a private estate before being subdivided for residential use."
When `parentSubdivision` is present: add "This subdivision was carved from the [parent name] plat."

**Files:** `app/subdivisions/[id]/_SubdivisionDetailContent.tsx`

---

### Task 3.5: Add admin "Needs attention" panel

On the admin dashboard, add a "Needs attention" panel showing:
- Neighborhoods with null or missing slugs.
- Subdivisions with no recorded year.
- Properties with low confidence flags.

**Files:** `app/admin/page.tsx`

---

### Sprint 3 Acceptance Criteria

- "What this means" shows HARGIS, appeal, and turnover bullets where data exists.
- "Agent summary" copyable text includes HARGIS status and assessment change where data exists.
- Data sources page has "How records are linked" and "What to do if something looks wrong."
- Subdivision pages with estate type or parent subdivision show genealogy context.
- Admin dashboard shows a "Needs attention" panel.
- `npm run build` passes.
- No em dashes.

### Sprint 3 QA Checklist

- [ ] Property page with HARGIS records: HARGIS bullet in "What this means"
- [ ] Property page with 3+ appeals: appeal bullet in "What this means"
- [ ] Property page with recentSaleCount 5+: turnover bullet in "What this means"
- [ ] Agent summary text: includes HARGIS sentence when records exist
- [ ] Agent summary text: includes assessment change when timeline has 2+ points
- [ ] Data sources page: "How records are linked" section visible
- [ ] Data sources page: "What to do if something looks wrong" section visible
- [ ] Subdivision page with parent subdivision: genealogy context note visible
- [ ] Subdivision page with estate type: estate explanation visible
- [ ] Admin dashboard: "Needs attention" panel visible
- [ ] All new copy contains no appraisal, inspection, school, safety, or investment claims
- [ ] Build: `npm run build` passes
- [ ] Em dash scan: zero matches

---

## Cross-Sprint Rules

- Do not hallucinate facts. All claims must derive from data in the Supabase tables or from the SOURCES constant in content.ts.
- Do not create placeholder historical claims. Mark uncertain content as "Needs citation" or omit it.
- Do not duplicate metrics. If a number appears in a stat card, it should not also appear as a chart series on the same page unless the chart adds time dimension or comparison context.
- Do not use multiple names for the same concept. "subdivision" not "plat." "neighborhood" not "district." "property" not "parcel." in user-facing copy.
- Do not bury methodology. Link to /sources from every page that makes a historical claim.
- Do not ship pages with unexplained missing data. Every empty or missing state must explain why in plain English.
- Do not create new one-off components if a shared component already exists.
- Do not use em dashes (the character U+2014) anywhere: not in UI copy, not in code comments, not in commit messages, not in documentation.
- Each sprint must leave the app cleaner than it started.

---

## Required Developer Workflow

For each task, before making any changes:
1. Read the relevant file(s) using the Read tool.
2. Identify which other files import or depend on the changed component.
3. Make the smallest coherent set of changes that achieves the task acceptance criteria.
4. Reuse existing components (EntityCard, StatGrid, InlineSourceNote, ConfidenceBadge, MarketHistoryChart) rather than creating new one-off components.
5. Remove any dead code or unused imports introduced by the change.
6. Run `npm run build` to confirm TypeScript passes before committing.
7. Update the Progress Tracking table below with completion notes.
8. Run `grep -r -- $'\xe2\x80\x94' .` to confirm no em dashes were introduced.

---

## Progress Tracking

| Item | Sprint | Area | Status | Owner | Notes | Completed date |
|------|--------|------|--------|-------|-------|----------------|
| 0.1 Fix neighborhood detail page 404 | 0 | Data/Frontend | Complete | | Renamed content.ts keys to match DB slugs: uptown_park_ridge, northwest_park, south_park | 2026-06-23 |
| 0.2 Remove Township/Section from nav; add Streets | 0 | Frontend | Complete | | Removed Township/Section entries and unused lucide imports; added Streets after Subdivisions | 2026-06-23 |
| 0.3 Create /streets index page | 0 | Frontend | Complete | | Created app/streets/page.tsx with Breadcrumb, PageHeader, and homepage search link | 2026-06-23 |
| 0.4 Fix About page: contact link and Start here | 0 | Content | Complete | | Added Start here section with 3 linked paths; replaced "please reach out" with mailto link | 2026-06-23 |
| 1.1 Fix neighborhoods landing page opening copy | 1 | Content/Frontend | Complete | | Replaced "Three overlapping ways" subtitle with user-facing copy | 2026-06-23 |
| 1.2 Remove NeighborhoodPriceChart from subdivision pages | 1 | Frontend | Complete | | Removed priceRow, salesByYear, fetchBlockSalesByYear, BlockSalesByYear, NeighborhoodPriceChart import; actual signal value is "Rebuild pressure" not "Rebuild" | 2026-06-23 |
| 1.3 Merge sale price chart and sale history list | 1 | Frontend | Complete | | SaleHistorySection accepts chartSlot prop; heading changed to "Sale history"; chart passed as slot at call site | 2026-06-23 |
| 1.4 Add source attribution to neighborhood narratives | 1 | Frontend | Complete | | InlineSourceNote inside narrative conditional block; no orphan when no narrative | 2026-06-23 |
| 1.5 Add Activity signal explanation | 1 | Frontend | Complete | | Paragraph shown when signal is not Dormant; uses "Rebuild pressure" to match ChangeSignal type | 2026-06-23 |
| 1.6 Add context notes to ConstructionByDecadeChart | 1 | Content/Frontend | Complete | | City: three-wave note. Neighborhood: era label or fallback. Subdivision: earliest-to-latest or single-year | 2026-06-23 |
| 1.7 Update neighborhood page subtitles with era labels | 1 | Frontend | Complete | | Imported NEIGHBORHOOD_ERA_LABELS; subtitle uses era label when available, falls back to count + year | 2026-06-23 |
| 1.8 Rename Quick summary to Agent summary | 1 | Frontend | Complete | | Changed label in _PropertyDetailContent.tsx; Shareable badge and clipboard button unchanged | 2026-06-23 |
| 1.9 Add (Inferred) label to era context notes | 1 | Frontend | Complete | | Appended span after eraContextNote text only; year built, sale price, assessment unchanged | 2026-06-23 |
| 2.1 Enforce section order on neighborhood pages | 2 | Frontend | Complete | | Reordered: narrative, stats, map, price chart, construction chart, market chart, highlights, streets, explore more | 2026-06-23 |
| 2.2 Add MarketHistoryChart to neighborhood pages | 2 | Frontend/Data | Complete | | fetchSubdivisionMarketHistory called after fetchNeighborhoodPins; renders when marketHistory.length >= 3 | 2026-06-23 |
| 2.3 Add framing note before property timeline | 2 | Frontend | Complete | | Added p.text-sm.text-text-muted.mb-3 between h2 heading and PropertyTimeline | 2026-06-23 |
| 2.4 Add "Explore more" prompts | 2 | Frontend | Complete | | Property: street + neighborhood links with conditional rendering; Neighborhood: search + city links | 2026-06-23 |
| 2.5 Convert section heading p to h2/h3 | 2 | Frontend | Complete | | All public pages converted; h2 used for all (single h1 per page); admin pages skipped | 2026-06-23 |
| 2.6 Audit all chart sections for four required elements | 2 | Frontend | Complete | | Added InlineSourceNotes to ConstructionByDecadeChart, MarketHistoryChart, AssessmentTrendChart, SubdivisionPlatChart on city page; description added to neighborhood price chart; InlineSourceNotes added to subdivision chart sections | 2026-06-23 |
| 2.7 Add overflow-x-auto to neighborhood table | 2 | Frontend | Complete | | Added div.overflow-x-auto wrapper inside existing overflow-hidden container on city page | 2026-06-23 |
| 2.8 Add og:image and og:description metadata | 2 | Frontend | Complete | | openGraph with title, description, type, images added to property and neighborhood generateMetadata; created public/og-default.png placeholder | 2026-06-23 |
| 2.9 Add footer to all public pages | 2 | Frontend | Complete | | Added footer to app/layout.tsx with copyright year, About, Data sources, and mailto contact links | 2026-06-23 |
| 2.10 Reduce homepage neighborhood grid to teaser | 2 | Frontend | Complete | | NeighborhoodsGrid accepts teaser prop; shows first 6 cards flat with See all link; homepage passes teaser | 2026-06-23 |
| 2.11 Fix aria-selected on search results | 2 | Frontend | Complete | | Added focusedIndex state; ArrowDown/ArrowUp navigation implemented; aria-selected reflects current index | 2026-06-23 |
| 3.1 Expand What this means on property pages | 3 | Frontend | Complete | | currentYear/recentSaleCount hoisted before bullet block; HARGIS, appeal, and turnover bullets added outside the comparisons guard so they fire on data alone | 2026-06-23 |
| 3.2 Expand Agent summary text | 3 | Frontend | Complete | | buildQuickSummary extended with hargisCount and assessmentTimeline params; HARGIS and assessment-change sentences appended to parts array; clipboard copies full expanded text automatically | 2026-06-23 |
| 3.3 Add methodology sections to sources page | 3 | Content | Complete | | Existing "How we connect the data" already covers spatial joins and neighborhood boundary approximations; added "What to do if something looks wrong" section with three specific guidance items and link to /about | 2026-06-23 |
| 3.4 Add genealogy context to subdivision pages | 3 | Frontend | Complete | | Estate note after entity type badge; parent plat note after parent subdivision link; both conditional on data presence | 2026-06-23 |
| 3.5 Add admin Needs attention panel | 3 | Frontend/Data | Complete | | getNeedsAttention() queries neighborhoods without slug, subdivisions without recorded_year, and parcels without year_built (low-confidence proxy); count-only queries; amber color when nonzero; Review links to admin list pages | 2026-06-23 |

Statuses: Not started / In progress / Blocked / Complete / Deferred

---

## Send-To-Users Plan

**Recommended first audience:** 10-15 Park Ridge homeowners who have owned their home for more than 5 years.

**Users to exclude for now:** Real estate agents (needs Agent summary fix first), relocation buyers (needs neighborhood layer working), general public (too many broken paths until Sprint 0 is complete).

**Number of users:** 10-15 for the first round.

**Test framing:** "I've been building a research tool that traces the history of every property in Park Ridge. I'd love for you to try it with your own home address. I'm looking for honest feedback about what's useful, what's confusing, and what's missing. This is not a finished product."

**Tasks for users:**
1. Search for your home address. What do you find?
2. Find the homes on your street. Do any of the details surprise you?
3. Navigate to the neighborhood section. What do you learn about your neighborhood?
4. Find something you would share with a neighbor or family member.

**Feedback questions:**
1. What was the first thing you looked for?
2. What did you find that you did not expect?
3. What did you expect to find that was not there?
4. Did anything look wrong or confusing?
5. On a scale of 1-5, how confident do you feel in the accuracy of the data?
6. Would you share a specific page with someone? Which one and why?

**What counts as success:** 7 of 10 users find their property page and express genuine interest. 5 of 10 navigate from their property to a second page without prompting.

**What counts as failure:** More than 3 of 10 users hit a 404 and cannot recover. Any user misinterprets an era context note as a primary-source fact.

---

## QA Checklist (Full Pre-Launch)

- [ ] All four Sprint 0 blockers resolved
- [ ] All Sprint 1 tasks complete
- [ ] Nav shows: Neighborhoods, Subdivisions, Streets, City history, Data sources, About
- [ ] No "Township" or "Section" in nav (desktop or mobile)
- [ ] /streets loads without 404
- [ ] /neighborhoods/[every-existing-slug] returns 200
- [ ] /about has contact link and Start here section
- [ ] Subdivision pages have no duplicate sales sections
- [ ] Property pages have one Sale history section
- [ ] Property pages show "Agent summary" heading
- [ ] Era context notes show "(Inferred)"
- [ ] All neighborhood narratives have InlineSourceNote
- [ ] ConstructionByDecadeChart sections have context notes
- [ ] Neighborhood subtitles show era labels where available
- [ ] Activity signal stats have definitions
- [ ] `npm run build` passes with no TypeScript errors
- [ ] No console errors on homepage, property, neighborhood, subdivision, city, about, or sources pages
- [ ] No em dashes in any user-facing content
- [ ] Mobile: nav is usable on 375px viewport
- [ ] Mobile: city page neighborhood table does not scroll horizontally

---

## Completion Notes

(Record implementation decisions, workarounds, and known limitations here as tasks complete.)

### Sprint 3 (2026-06-23)

**3.1 What this means bullets:** The three new bullets (HARGIS, appeal, turnover) are added to `whatThisMeansBullets` outside the `if (detail.comparisons && detail.comparisons.length > 0)` guard. This means they fire based purely on the underlying data, not on whether a comparisons API response was returned. The `currentYear` and `recentSaleCount` variables were hoisted to before the bullets section so both the new bullets and the existing questionsToConsider section can reference them.

**3.2 Agent summary:** `buildQuickSummary` now accepts `hargisCount: number` and `assessmentTimeline: AssessmentPoint[]`. The call site passes `hargisRecords.length` and the already-parsed `assessmentTimeline`. The clipboard button copies `quickSummaryText` directly, so the expanded text is included automatically.

**3.3 Sources page:** The existing "How we connect the data" section already describes PIN-based joins, spatial joins, and neighborhood boundary approximations from approximate polygon data. No duplicate sentence was needed. Only "What to do if something looks wrong" was new.

**3.4 Subdivision genealogy:** Two notes added - estate note after entity type badge (guarded by `entityType === "estate"`), parent plat note after parent subdivision link (guarded by `parentSubdivision` presence). The parent plat note renders immediately after the link row so it reads as a continuation.

**3.5 Admin Needs attention:** Three count-only Supabase queries. Neighborhoods: `slug IS NULL OR slug = ''`. Subdivisions: `recorded_year IS NULL`. Parcels: `year_built IS NULL` (proxy for Low confidence - missing build year is the primary confidence downgrade factor per `confidenceFor()`). All counts show amber when nonzero. Review links point to the corresponding admin list pages.

**Em dash cleanup:** Sprint 3 QA revealed pre-existing em dashes in admin files, CSS files, and source comments from prior sprints. All cleared (20+ occurrences across 12 files).

---

## Next Action

Implement Sprint 0 completely before starting Sprint 1. Sprint 0 has four tasks that are all blockers. None require data model changes. All are low-complexity. Together they make the app safe to share.

Sprint 0 order of implementation:
1. Task 0.1 (neighborhood 404): diagnose the slug mismatch in Supabase first. Everything else depends on neighborhoods working.
2. Task 0.2 (nav cleanup): two-minute change with high first-impression impact.
3. Task 0.3 (/streets index page): needed before task 0.2 so the Streets nav link has a destination.
4. Task 0.4 (About page contact): closes the feedback loop before any user testing.

Do not start Sprint 1 until all Sprint 0 QA checks pass.

---

# Cycle 2 (2026-07-08): Post-Launch Follow-Up Audit

A second, independent end-to-end evaluation was run against the live production app and the full codebase on 2026-07-08, using the 10-persona / 20-category scoring format. Full detail lives in `EVALUATION.md`; the itemized task backlog (task IDs A1.1-A5.4) lives in `BACKLOG.md`. This section is the 5-sprint execution plan from that evaluation, appended below the Cycle 1 record above rather than replacing it.

**Relationship to Cycle 1 above**: most of Cycle 1's Sprint 0-3 fixes hold up — the neighborhood 404s, nav cleanup, `/streets` page, and About-page contact link were not flagged again in this pass. One notable regression was found: Cycle 1's task 2.5 ("Convert section heading `<p>` to `<h2>`/`<h3>`") is marked Complete and its own notes say "All public pages converted," but this audit found the same `<p className="section-heading">` pattern very much alive in several files — mostly shared components (`HighlightReel.tsx`, `HistoricalFactsPanel.tsx`, `SubdivisionHistoryPanel.tsx`, `CommunityProfilePanel.tsx`, `EraPortrait.tsx`, `NeighborhoodCharts.tsx`, `PinScopedCharts.tsx`) and two page bodies (`_PinGroupContent.tsx`, `_PermitsContent.tsx`) that weren't in that task's explicit file list, plus the property page's heading structure, which is flat (no `<h3>` nesting) rather than using `<p>` tags. The property-page detail component also appears to have been renamed/refactored since Cycle 1 (Cycle 1 references `_NeighborhoodDetailContent.tsx`; this audit found `_NeighborhoodPage.tsx`), consistent with the bug re-entering through later refactoring rather than the original fix being fake. Cycle 2's Sprint 1 (below) re-fixes this comprehensively across the newly-identified files.

**Overall verdict this cycle**: Overall public launch readiness **5/10** — not ready to send to real users today, but fixable in one focused sprint, not a rebuild. See `EVALUATION.md` for the full scorecard, persona evaluations, and audits.

## Cycle 2 — Sprint 1 (A1 launch blockers)

**Goal**: eliminate the defects that actively damage trust and accessibility on the pages designed to build them.
**User outcome**: a skeptical user reading `/sources`, `/about`, and a property page no longer finds the app contradicting itself or showing a real screen-reader-breaking defect.

- Engineering: fix heading hierarchy (9 files + property page nesting) — **A1.1**; fix legacy-neighborhood-column read path — **A1.3**; remove/relabel raw Township/Section/Block breadcrumb segments — **A1.3**.
- UX/design: rewrite the boundary-methodology paragraph as one shared string — **A1.2**; add a visual marker distinguishing editorial era-labels from sourced confidence claims — **A1.4**.
- Data: none requiring migration — this is a read-path and copy fix, not a schema change.

**Files/components**: `HighlightReel.tsx`, `_PinGroupContent.tsx`, `_PermitsContent.tsx`, `CommunityProfilePanel.tsx`, `HistoricalFactsPanel.tsx`, `SubdivisionHistoryPanel.tsx`, `_PropertyDetailContent.tsx`, `properties.ts`, `app/properties/[pin]/page.tsx`, `Breadcrumb.tsx`, `app/sources/page.tsx`, `app/about/page.tsx`, `NeighborhoodTypePanel.tsx`, `content.ts`.

**Acceptance criteria**: heading-outline check passes on every page type; breadcrumb/in-page neighborhood label match (tested); no contradictory boundary-methodology claims across `/sources`, `/about`, `NeighborhoodTypePanel`; homepage narrative is cited or disclaimed.

**Risks**: rewriting the boundary-methodology paragraph requires confirming the actual current methodology (7 boundaries, 1996 plan, `assign_parcels_by_geometry` edge cases) with the user — a content decision, not purely mechanical.

**Definition of done**: `npm run build` and `npm run test` pass; manual screen-reader spot-check on the PIN page and property page confirms proper heading navigation; a real property is spot-checked to confirm breadcrumb/body neighborhood agreement.

## Cycle 2 — Sprint 2 (A2 product clarity and consistency)

**Goal**: make the product feel like one system across page types.
**User outcome**: page headers, section order, and decade-grouping look and behave identically everywhere they appear.

- Engineering: migrate 4 pages to `PageHeader` — **A2.1**; extract `<DecadeGroup>` and migrate 6 call sites — **A2.3**; extract `chartTheme.ts` and migrate 10 Recharts files + `EraPortraitChart` — **A2.4**; fix `TeardownBadge`/teardown-callout token usage — **A2.4**.
- UX/design: decide `CommunityProfilePanel`'s place in the city-page hierarchy — **A2.2**; reorder subdivision-page highlight reel after its charts — **A2.2**; decide on a subdivision price-comparison section — **A2.2**.

**Files/components**: `app/page.tsx`, `_PermitsContent.tsx`, `_StreetsContent.tsx`, `_SubdivisionsHero.tsx`, new `DecadeGroup.tsx`, new `chartTheme.ts`, the 10 Recharts chart files, `_SubdivisionDetailContent.tsx`, `_CityContent.tsx`, `TeardownBadge.tsx`.

**Acceptance criteria**: extended `sectionOrder.test.ts` coverage passes for section order and `PageHeader` usage across all discovery page types; visual QA confirms identical decade-group rendering everywhere; chart colors visibly match surrounding UI and the map legend.

**Risks**: touching 10+ chart files at once risks visual regressions — stage as small, reviewable commits per chart file.

**Definition of done**: build/tests pass; a side-by-side visual review of all discovery page types shows consistent header, section order, and chart styling.

## Cycle 2 — Sprint 3 (A3 data quality and storytelling)

**Goal**: consolidate the confidence model and close the biggest content-depth gaps.
**User outcome**: confidence language is explained consistently across every domain it appears in; street pages get the same sourcing depth other geography tiers have; empty/thin entities say so explicitly.

- Engineering: dedupe confidence-level prose — **A3.1**; document (or begin wiring) the 4 confidence taxonomies against `source_registry` — **A3.1**; add an explicit "not yet linked" state for unresearched subdivisions — **A3.2**; remove the redundant subdivision-ancestry widget on property pages — **A3.3**; add source citations and at least a construction-by-decade chart to street pages — **A3.4**.
- UX/design: extend `HistoricalFactsPanel` to subdivision/street pages where facts exist.

**Files/components**: `formatters.ts`, `app/sources/page.tsx`, `subdivisionTypes.ts`, `_SubdivisionDetailContent.tsx`, `_PropertyDetailContent.tsx`, `_StreetDetailContent.tsx`, `HistoricalFactsPanel.tsx`.

**Acceptance criteria**: one confidence-copy source of truth; street detail pages have at least one chart and one source citation; the Brickton-subdivision-style empty entity shows an explicit message instead of a blank section.

**Risks**: extending `HistoricalFactsPanel` to more page types may reveal thin data coverage — scope to "where facts already exist," not a data-collection sprint.

**Definition of done**: build/tests pass; a spot-check of 3 street pages and 2 subdivision pages (one populated, one thin) confirms honest, non-blank states.

## Cycle 2 — Sprint 4 (A4 buyer, homeowner, and agent usefulness)

**Goal**: turn the product's existing depth into practical, shareable tools.
**User outcome**: a buyer or agent can generate a shareable property summary and compare nearby homes without reading the full research page.

- Engineering: build a shareable/printable property-summary view — **A4.1**; build a basic "compare nearby homes" view — **A4.3**; wire up or delete the unused Sparkline stat card components — **A4.2**.

**Files/components**: new summary component consuming `_PropertyDetailContent.tsx`'s existing data-fetch logic; new comparison view; `SparklinePriceCard.tsx`/`SparklinePermitCard.tsx`/`SparklineSalesVolumeCard.tsx`.

**Acceptance criteria**: a user can generate a shareable single-screen property summary in ≤2 clicks; a comparison view shows at least 2-3 nearby properties side by side on a shared metric.

**Risks**: scope creep — keep the summary view read-only and derived from existing data, not a new data-collection feature.

**Definition of done**: build/tests pass; manual walkthrough of the buyer/agent journey end-to-end (search → property → summary/compare) with no missing step.

## Cycle 2 — Sprint 5 (A5 scale, admin workflow, and polish)

**Goal**: prepare for growth beyond a single admin and close remaining technical debt.
**User outcome**: no direct end-user-visible change; the codebase and admin workflow are ready for a second contributor and for real performance measurement.

- Engineering: delete dead code (`src/styles/global.css`, unused components, dead query functions) — **A5.2**; drop the legacy `neighborhood_id` column once confirmed fully unused; run a real Lighthouse/Core Web Vitals and axe accessibility audit — **A5.3**; extract the single-source `ERA_PALETTE` — **A5.4**.
- Admin: basic audit-history/change-log table — **A5.1**.

**Files/components**: `src/styles/global.css`, `SparklinePriceCard.tsx` (if not wired in Sprint 4, delete), `CoverageTable.tsx`, `fetchParcelsInSubdivision()`, `mapConfig.ts`, `tailwind.config.ts`, admin map components.

**Acceptance criteria**: no dead files remain; a real performance report exists and its top findings are triaged; admin has a basic audit trail if a second editor is planned.

**Risks**: dropping the legacy column is irreversible — confirm zero remaining reads (including admin paths) before the migration.

**Definition of done**: build/tests pass; repo has no unused files flagged by the earlier audit; a documented performance baseline exists.

## Cycle 2 — Immediate first task

**A1.1 — Fix the section-heading tag bug (`<p className="section-heading">` → real `<h2>`/`<h3>`).**

Highest-confidence, highest-impact A1 item: mechanical, touches a fully-enumerated set of files, has an unambiguous correct outcome, fixes a severe accessibility defect, and carries essentially zero visual-regression risk since the CSS class stays identical. Good first move before the judgment-dependent copy fixes (A1.2, A1.4) that need sign-off on the underlying facts.

## Cycle 2 — Verification plan

1. `npm run build` (runs `vitest run` via `prebuild`) must pass.
2. Manual screen-reader spot check (NVDA or VoiceOver) on `/pin/09`, a property page, and `/permits`.
3. Manual live-site check of the breadcrumb bug on `901 S Crescent Ave` (or another affected property) confirming breadcrumb and in-page neighborhood now agree.
4. Manual read-through of `/sources`, `/about`, and one neighborhood page confirming the boundary-methodology description now matches across all three.
5. Manual check of the homepage confirming the founding-narrative paragraph now carries a citation/source note.

---

# Cycle 3 (2026-07-09): Post-Sprint-5 Follow-Up Audit

A targeted follow-up run after all 5 Cycle 2 sprints shipped — not a fresh 10-persona pass, but a verification of whether each Cycle 2 fix held plus an independent search for regressions/gaps in code Sprints 1-5 themselves introduced. Full findings in `EVALUATION.md`'s "Cycle 3" section; itemized tasks (B1.1-B5.1) in `BACKLOG.md`'s "Cycle 3" section.

**Headline finding**: Sprint 4's "Nearby homes on this block" feature violates the user's own standing instruction that property-card lists must always be grouped by decade — shipped without being caught because no test enforces the pattern generically. **Second finding**: `linked_parcel_count`'s trigger coverage still has a gap (missing on `gis_lots`) that has already caused 3 manual resyncs and could cause a 4th.

## Cycle 3 — Sprint 6 (B1 regression fixes)

**Goal**: fix the two items that are live regressions or standing-rule violations, not judgment calls.
**User outcome**: property-card lists are consistently decade-grouped everywhere, including the newest feature; subdivision parcel counts stay correct without manual intervention.

- Engineering: group "Nearby homes on this block" by decade — **B1.1**; add a `gis_lots` trigger to close the `linked_parcel_count` gap — **B1.2**.

**Files/components**: `_PropertyDetailContent.tsx`; new migration for the `gis_lots` trigger.

**Acceptance criteria**: nearby-homes cards render through `<DecadeGroup>`; a direct `gis_lots.subdivision_id` update immediately reflects in `linked_parcel_count` with no manual resync.

**Definition of done**: `npm run build` passes; a static-scan test enforces B1.1 going forward; B1.2 is manually verified against a test update.

## Cycle 3 — Sprint 7 (B2 design-system consistency)

**Goal**: close the consistency gaps that were flagged but not finished in Cycle 2 — a `<Card>` primitive, the last hand-rolled loading skeleton, decade-bucketing reimplementations, and test-coverage gaps.

- Engineering: extract `<Card>` and migrate the top 4 call sites — **B2.1**; fix the subdivision detail loading skeleton — **B2.2**; consolidate remaining decade-bucketing logic — **B2.3**; extend `sectionOrder.test.ts` coverage (city/neighborhood/pin-group order, 4 missing chart files) — **B2.4**; add `aria-live` to copy-to-clipboard buttons — **B2.5**; fix `Breadcrumb.tsx`'s stale doc comment — **B2.6**.

**Files/components**: new `Card.tsx`; `_SubdivisionDetailContent.tsx`; `decadeGrouping.ts` + 4 call sites; `sectionOrder.test.ts`; `_PropertySummaryContent.tsx`; `Breadcrumb.tsx`.

**Definition of done**: `npm run build` and `npx vitest run` pass; manual screen-reader spot check on the copy-summary button.

## Cycle 3 — Sprint 8 (B3 data quality and admin workflow)

**Goal**: close the gaps in Sprint 5's audit trail and remaining dead-code/data-quality items.

- Engineering: expand the audit trail to cover `updateParcel`, `deleteSubdivision`, subdivision-linkage writes, and bulk neighborhood assignment — **B3.1**; remove dead `subdivisions.parcel_count` reads/writes (confirm with user before any column drop) — **B3.2**; add retention/pagination to `admin_change_log` — **B3.3**; add teardown-rebuild checks to `data_quality_report` — **B3.4**; resolve or document `TeardownBadge`'s confidence taxonomy — **B3.5**; remove the dead `neighborhood_id` select in admin properties list — **B3.6**.

**Files/components**: `app/admin/_actions/{properties,subdivisions,neighborhoods}.ts`; `subdivisionQueries.ts`; `app/admin/audit-log/page.tsx`; new migration for the 8th data-quality check; `confidencePresentation.ts`/`TeardownBadge.tsx`; `app/admin/properties/page.tsx`.

**Risks**: B3.2's column drop is irreversible — confirm with the user before dropping vs. just removing reads/writes.

**Definition of done**: `npm run build` passes; a test edit through each newly-instrumented write path produces a visible audit entry.

## Cycle 3 — Sprint 9 (B4 buyer/agent/homeowner usefulness, continued)

**Goal**: close the gaps the persona analysis found in Sprint 4's summary/comparison work — no cross-property comparison, no watchlist, comparisons still year-built-only.
**User outcome**: a buyer or agent can compare specific chosen properties (not just same-block neighbors) and keep a running list across a session; a homeowner sees a block-level, price-aware comparison, not just build-year.

- Product/engineering: real property-to-property comparison view — **B4.1**; session-based compare list/watchlist (no auth) — **B4.2**; block-scoped price-aware comparisons — **B4.3**; sparse-data messaging on the summary route — **B4.4**.

**Files/components**: new `app/compare/page.tsx`; new `src/lib/watchlist.ts`; `_PropertyDetailContent.tsx`; `_PropertySummaryContent.tsx`.

**Risks**: B4.1 and B4.2 are the largest-complexity items in this cycle (L/M) and may need their own plan-mode pass to settle the exact interaction design (how properties get added to a comparison) before implementation.

**Definition of done**: `npm run build` passes; manual check that a buyer can add 2+ properties from different streets to a comparison and see them side by side.

## Cycle 3 — Not yet sprint-scheduled

**B5.1** — deciding the fate of the unused subdivision/street-scoped `historical_facts` columns is a content/product decision, not an engineering task. Needs a direct conversation with the user before it can be scheduled into a sprint.

## Cycle 3 — Immediate first task

**B1.1 — Group "Nearby homes on this block" by decade.** Smallest, highest-confidence item in this cycle: one file, mechanical (the exact pattern already exists one file over in `_PinGroupContent.tsx`), and directly fixes a standing-rule violation rather than a judgment call. Good first move before B1.2's migration work.

## Cycle 3 — Verification plan

1. `npm run build` (runs `vitest run` via `prebuild`) must pass after each sprint.
2. B1.1: static-scan test confirms `<DecadeGroup` renders in the nearby-homes section; manual visual check.
3. B1.2: manual `gis_lots` update in a test/staging context confirms `linked_parcel_count` updates without a manual resync call.
4. B3.1: manual test edit through each newly-instrumented admin write path, confirmed visible on `/admin/audit-log`.
5. B4.1/B4.2: manual check that a buyer can build and view a cross-property comparison.
