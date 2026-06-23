# Park Ridge Land History Product Roadmap

## Purpose

This roadmap converts the product assessment (June 2026) into a sequenced execution plan for improving the app into the "Ancestry.com for Park Ridge homes."

The roadmap is focused on:

- Reducing duplication: the same chart, metric, or concept appears on multiple pages without adding new meaning
- Clarifying information architecture: three parallel systems (geographic admin, community geography, historical plats) confuse users who need a single clear path
- Improving trust and historical sourcing: historical claims exist but lack confidence indicators and inline citations at the point of use
- Making property, block, subdivision, neighborhood, and city pages more useful: each page must have one clear job
- Improving visual storytelling: data is displayed but rarely interpreted or narrated
- Increasing usefulness for home shoppers, homeowners, agents, and local-history users

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

## Sprint Overview

| Sprint | Theme | Goal | Primary users helped | Expected impact | Complexity | Dependencies |
|--------|-------|------|----------------------|-----------------|------------|--------------|
| 1 | Clarity, Cleanup, and Information Architecture | Remove duplication, fix naming, establish hierarchy | All | High: reduces confusion immediately | Medium | None |
| 2 | Visual Storytelling and Page Consistency | Make pages feel like a story, not a dashboard | Home shoppers, homeowners | High: creates emotional engagement | Medium | Sprint 1 complete |
| 3 | Historical Trust and Real Estate Usefulness | Add citations, confidence levels, buyer context | Agents, historians, homeowners | High: creates credibility and quotability | Large | Sprint 2 complete |

---

## Sprint 1: Clarity, Cleanup, and Information Architecture

### Goal

Remove confusion, duplication, and inconsistent structure. Make the app easier to understand before adding new features.

### Why This Sprint Matters

The app cannot feel trustworthy or premium if users see repeated metrics, unclear entity relationships, inconsistent labels, or pages that do not have a clear job. Right now a user on the property page sees their sale count in the "Activity record" stat card, then again in the "Sale price history" chart title, then again in the "Sale history" list. A city-level user sees construction timing in "When Park Ridge was built," then again in "Plats recorded by decade." A neighborhood-level user sees the same ConstructionByDecadeChart pattern with no differentiation from city, block, or street level. This sprint eliminates that noise.

### Scope

- Audit and remove duplicated sections across homepage, city, neighborhood, subdivision, and property pages.
- Identify charts or cards that show the same idea in different forms and consolidate them.
- Standardize naming for property, block, street, subdivision, neighborhood, and city throughout the UI.
- Add a consistent hierarchy indicator (breadcrumb or context chip) to all non-home pages.
- Make page titles and subtitles explain the job of each page.
- Clarify the distinction between neighborhood (community geography) and subdivision (recorded plat), and explain both in plain English where users first encounter each.
- Clarify what "no address found" and "unresolvable parcel" mean in user-facing language.
- Make search states clearer: empty results, failed PIN matches, partial address matches.
- Create consistent page-level navigation between related property, block, subdivision, neighborhood, and city views.
- Fix the "Activity record" + separate chart + separate list triple-display of the same sale and permit data on property pages.
- Remove "Sources" footers from page body where they duplicate the Data Sources page. Replace with inline source labels at the point of use only.
- Investigate and fix street pages returning 0 properties for streets advertised on the homepage (Prospect Ave, Touhy Ave).

### Out of Scope

Do not add new historical facts.
Do not invent neighborhood boundaries.
Do not redesign the full visual system yet.
Do not add new charts unless needed to replace duplicated ones.
Do not rewrite the data model unless required to fix broken page relationships.

### Detailed Tasks

---

#### Task 1.1: Consolidate property page sale and permit sections

**Current problem:**
The property page (`app/properties/[pin]/_PropertyDetailContent.tsx`) shows sale and permit data three times each:
1. "Activity record" stat cards showing total count and most recent year/price
2. "Sale price history" chart (SalesPriceChart)
3. "Sale history" list (SaleHistorySection)

Similarly for permits: stat card then PermitHistorySection list.

**Required change:**
Remove the "Activity record" stat card section (lines 524-559 in `_PropertyDetailContent.tsx`). Move the permit count and sale count into the existing vitals IconRow at the top as additional items, or display them as a small inline summary above their respective history sections. The chart and list together are sufficient. The stat card is redundant.

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx` (lines 524-559: the "Activity record" section)

**Acceptance criteria:**
- Sale count and permit count are visible once, not twice.
- Sale price chart and sale list remain.
- Permit list remains.
- No data is hidden from the user.

**QA steps:**
- Open a property with multiple sales and permits.
- Confirm sale count appears exactly once (in list header or inline note, not a separate stat card).
- Confirm permit count appears exactly once.
- Confirm sale chart and list still render.

---

#### Task 1.2: Remove redundant "Sources" sections from page body

**Current problem:**
Every page (city, neighborhood, subdivision, street, block) ends with a "Sources" bulleted list citing the same 2-4 data sources. This creates visual noise and duplicates the Data Sources page. The same sources appear on 10+ page types.

**Required change:**
Remove the standalone "Sources" footer section from all entity pages. Keep inline `InlineSourceNote` components where they appear directly below a chart or data section (these are already in the code and work correctly). On each page, add a single small hyperlink at the bottom: "About our data sources" linking to `/sources`.

**Files involved:**
- The `Sources` section rendering in each page's server component (`app/city/page.tsx`, `app/neighborhoods/[slug]/page.tsx`, `app/subdivisions/[id]/page.tsx`, `app/streets/[street]/page.tsx`, `app/blocks/[blockId]/page.tsx`, `app/pin/[prefix]/page.tsx`)
- Confirm which pages render this via shared layout vs. individual page components.

**Acceptance criteria:**
- No page body ends with a bulleted "Sources" list.
- Every page has one "About our data sources" link at bottom.
- Inline source notes (InlineSourceNote) remain in place below individual data sections.

**QA steps:**
- Visit city, neighborhood, subdivision, street, block pages.
- Confirm no "Sources" bullet section appears in the page body.
- Confirm the "About our data sources" link is present and routes to /sources.
- Confirm inline source notes under charts are still present.

---

#### Task 1.3: Fix the "Construction by decade" chart duplication

**Current problem:**
The `ConstructionByDecadeChart` component appears identically on: city page, neighborhood page, street page, block page, subdivision page, and pin group page. Each uses the same visual pattern with different section headings ("When Park Ridge was built, wave by wave" / "When X took shape" / "How X was built, decade by decade" / "When this block was built" / "When this subdivision was built out"). At lower levels (block, single street) this chart often has 2-4 bars and communicates almost nothing new.

**Required change:**
Keep the ConstructionByDecadeChart only at city, neighborhood, and subdivision levels. At block and street level, replace the chart with a plain-text summary sentence: "Built primarily in the [decade], with [N] homes from [start] to [end]." At pin-group (township/section) level, keep the chart only if there are more than 30 properties.

**Files involved:**
- `app/streets/[street]/_StreetDetailContent.tsx` (lines 61-64: replace chart with text summary)
- `app/blocks/[blockId]/_BlockDetailContent.tsx` (lines 95-99: replace chart with text summary)
- `app/pin/[prefix]/_PinGroupContent.tsx` (add minimum bar threshold)

**Acceptance criteria:**
- ConstructionByDecadeChart does not appear on street or block pages.
- A plain-text era summary appears instead on street and block pages.
- Chart still appears on city, neighborhood, and subdivision pages.

**QA steps:**
- Visit a street page with multiple properties. Confirm no chart. Confirm text era summary.
- Visit a block page. Confirm no chart. Confirm text era summary.
- Visit city and neighborhood pages. Confirm chart still present.

---

#### Task 1.4: Clarify the neighborhood type system

**Current problem:**
The app has three neighborhood types: "Official Planning," "Business District," and "Local Name." On the property page, these appear as three unlabeled chips with only the typeLabel in tiny uppercase above the name. On the neighborhoods page, the intro paragraph explains "three overlapping ways" but the actual list is unclear about which neighborhoods belong to which type. Users do not understand why one property might show three neighborhood chips.

**Required change:**
On the property page (`_PropertyDetailContent.tsx` lines 488-514, `NeighborhoodChip` component), add a small tooltip or parenthetical explanation. Change the chips section heading to "Geographic context" with a subtitle: "This property sits within overlapping planning districts, business areas, and local neighborhoods." On the neighborhoods index page (`app/neighborhoods/page.tsx`), add a visual legend or three labeled columns (one per type) rather than a mixed list.

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx` (lines 488-514)
- `app/neighborhoods/page.tsx` and `app/neighborhoods/_NeighborhoodsGrid.tsx`

**Acceptance criteria:**
- Property page shows a heading "Geographic context" above the neighborhood chips.
- A one-sentence explanation below the heading clarifies what the three types mean.
- The neighborhoods index groups or labels neighborhoods by their type.

**QA steps:**
- Open a property with all three neighborhood types set.
- Confirm heading and explanation are visible.
- Open neighborhoods page. Confirm types are labeled.

---

#### Task 1.5: Fix empty street pages and investigate the Prospect Ave and Touhy Ave data issues

**Current problem:**
The homepage advertises "Prospect Ave" and "Touhy Ave" as example search chips. But `/streets/prospect-ave` and `/streets/touhy-ave` both returned 0 properties. The breadcrumb on the Touhy Ave page incorrectly shows "Park Ridge / Neighborhoods / Touhy-ave" (wrong parent category for a street). The display name shows "Touhy-ave" with a lowercase 'a' and a hyphen, not "Touhy Ave."

**Required change:**
Investigate why Prospect Ave and Touhy Ave street pages are empty. Check the street name normalization in `src/lib/data/streets.ts` and relevant Supabase queries. Determine the correct URL slugs for these streets and either fix the data or update the example chips to use working examples. Fix the breadcrumb parent from "Neighborhoods" to "Streets." Fix the display name capitalization (should be "Touhy Ave" not "Touhy-ave").

**Files involved:**
- `app/_components/HomeClientComponents.tsx` (EXAMPLE_CHIPS, lines 10-14)
- `app/streets/[street]/page.tsx` and `_StreetDetailContent.tsx`
- `src/lib/data/streets.ts`
- Street name normalization logic

**Acceptance criteria:**
- The three example chips on the homepage lead to pages with actual property data.
- Street display names are properly capitalized ("Touhy Ave" not "Touhy-ave").
- Street page breadcrumb shows correct parent ("Streets" not "Neighborhoods").
- Street pages with 0 properties show an honest empty state, not a blank page.

**QA steps:**
- Click each example chip on the homepage. Confirm all lead to pages with data.
- Visit a street page directly. Confirm breadcrumb parent is correct.
- Test a street name that genuinely has no properties and confirm empty state message.

---

#### Task 1.6: Consolidate city page chart overload

**Current problem:**
The city page (`app/city/_CityContent.tsx`) contains 6 charts in sequence: ConstructionByDecadeChart, MarketHistoryChart (home sales 2000-2025), AssessmentTrendChart (1999-2025), AppealsChart (by year), PermitActivityChart (2019-2026), and SubdivisionPlatChart (plats by decade). Plus a neighborhood development table. Plus a "Browse by section" grid. This is a dashboard, not a history page. The charts do not tell a story together; they sit as isolated data panels.

**Required change:**
Remove the AppealsChart and PermitActivityChart from the city history page. These are detailed enough to deserve their own analysis context and do not contribute to the primary story of "how Park Ridge was built." Move them to the Data Sources page as "dataset coverage" panels, or remove them entirely from the public view for Sprint 1. Keep: ConstructionByDecadeChart, MarketHistoryChart, and the neighborhood development table. The SubdivisionPlatChart should be merged into the "How Park Ridge was platted" section already in the code (it already is in that section - confirm it is positioned correctly). The AssessmentTrendChart can be deferred to Sprint 2 when it will be given narrative context.

**Files involved:**
- `app/city/_CityContent.tsx` (lines 142-162: AppealsChart section; lines 163-171: PermitActivityChart section)

**Acceptance criteria:**
- City page has no more than 4 charts.
- The page tells a coherent story: construction eras, then sales market, then how the city was platted.
- Appeals and permit charts are either removed or moved to a more appropriate context.

**QA steps:**
- Visit /city. Confirm no more than 4 chart components render.
- Confirm the narrative flows from construction to market to plats.
- Confirm no data loss warning is needed (these are supplementary charts, not core data).

---

#### Task 1.7: Add hierarchy context chips to all entity pages

**Current problem:**
When a user lands on a subdivision page, they see the subdivision name and data but no visible link to the neighborhood it belongs to or the city level above it. The property page shows neighborhood chips (good) and a PIN breakdown (good) but does not link to the block or street level. Navigation feels like a dead end at each level.

**Required change:**
Add a consistent "Context breadcrumb + level chips" pattern to every entity page. At minimum:
- Property page: already has neighborhood chips and PIN breakdown (good). Add a link to the street page if the property has a street address.
- Subdivision page: add a chip showing which neighborhood(s) the subdivision falls within, if that data is available. If not available, note "Neighborhood: not yet mapped."
- Street page: add a chip showing which neighborhood the street belongs to.
- Block page: add chips for street and neighborhood.
This can use the existing `NeighborhoodChip` component pattern or a simpler EntityCard.

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx` (add street link)
- `app/subdivisions/[id]/_SubdivisionDetailContent.tsx` (add neighborhood context)
- `app/streets/[street]/_StreetDetailContent.tsx` (add neighborhood context)
- `app/blocks/[blockId]/_BlockDetailContent.tsx` (add street and neighborhood context)

**Acceptance criteria:**
- Property pages link to their street page.
- Subdivision pages show their neighborhood context.
- Street pages show their neighborhood.
- Users can navigate up the hierarchy from any entity page.

**QA steps:**
- Open a property page. Confirm street link is present and routes correctly.
- Open a subdivision page. Confirm neighborhood context chip or note is present.
- Open a street page. Confirm neighborhood chip is present.

---

#### Task 1.8: Improve search empty and failed states

**Current problem:**
When search returns no results, the dropdown simply closes. There is no message. If a user searches "10-01-999" (invalid PIN), nothing happens. If a user types a street name with no matches, they get silence.

**Required change:**
In `HomeSearch` (`app/_components/HomeClientComponents.tsx`), add an empty state message below the input when a query of 3+ characters returns 0 results: "No properties found for '[query]'. Try an address, street name, or 14-digit PIN." Keep this visible for 3 seconds or until the user types again.

Also: if a user presses Enter on an empty results set, route to a dedicated `/search?q=[query]` page that explains what was searched and why no results were found, with suggestions (check spelling, try a PIN, browse neighborhoods).

**Files involved:**
- `app/_components/HomeClientComponents.tsx` (HomeSearch component)
- Optionally: `app/search/page.tsx` (new page for failed searches)

**Acceptance criteria:**
- Typing 3+ characters with no matches shows an inline empty state message.
- Pressing Enter on empty results does not silently do nothing.
- The empty state message is plain English and helpful.

**QA steps:**
- Type a nonsense string in the search box. Confirm empty state message appears.
- Type a valid street name that exists in the database. Confirm results appear.
- Press Enter with no results. Confirm the user receives feedback.

---

#### Task 1.9: Standardize section headings across entity pages

**Current problem:**
The same concept is labeled differently across pages:
- "When Park Ridge was built, wave by wave" (city)
- "When [neighborhood] took shape" (neighborhood)
- "How [street] was built, decade by decade" (street)
- "When this block was built" (block)
- "When this subdivision was built out" (subdivision)

These are five ways to say the same thing. There are also inconsistencies in whether the entity name appears in the heading or not, and whether it is "built" vs. "built out" vs. "took shape."

Additionally, "Subdivision Ancestry" (property page line 220) uses title case while all other section headings use sentence case ("Sale history", "Permit history", "Evidence trail").

**Required change:**
Standardize to a consistent pattern: "How [entity name] was built" for all construction decade sections. This is short, specific, and consistent. Apply sentence case to all section headings throughout the app. Fix "Subdivision Ancestry" to "Subdivision ancestry."

**Files involved:**
- `app/city/_CityContent.tsx` (line 108)
- `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx` (line 75)
- `app/streets/[street]/_StreetDetailContent.tsx` (line 61)
- `app/blocks/[blockId]/_BlockDetailContent.tsx` (line 97)
- `app/subdivisions/[id]/_SubdivisionDetailContent.tsx` (line 269)
- `app/properties/[pin]/_PropertyDetailContent.tsx` (line 220: "Subdivision Ancestry")

**Acceptance criteria:**
- All construction decade section headings follow the same pattern.
- All section headings throughout the app use sentence case.
- "Subdivision Ancestry" is renamed to "Subdivision ancestry."

**QA steps:**
- Visit city, neighborhood, street, block, subdivision pages. Confirm heading consistency.
- Open property page. Confirm "Subdivision ancestry" heading.

---

#### Task 1.10: Add plain-English empty state for unresolvable parcels

**Current problem:**
The `UnresolvableEntityCard` component (used in subdivision, street, and block property grids) shows a PIN with no explanation of why no address exists. The Coverage disclaimer exists at the bottom of the homepage but is not surfaced at the point of use. Internal quality flags like "geometry_status: not_started" leak into user-facing text.

**Required change:**
In `UnresolvableEntityCard`, add a tooltip or subtitle: "No street address on record. This parcel is included in totals but cannot be searched by address." In subdivision detail, change "Subdivision boundary not yet mapped." (line 123 of `_SubdivisionDetailContent.tsx`) to "Boundary map coming soon."

**Files involved:**
- `src/components/ui/EntityCard.tsx` (UnresolvableEntityCard component)
- `app/subdivisions/[id]/_SubdivisionDetailContent.tsx` (line 123)

**Acceptance criteria:**
- Unresolvable cards explain why in plain English.
- No internal status language ("geometry_status", "not_started") appears in user-facing copy.
- The card still shows the PIN for reference.

**QA steps:**
- Open a subdivision with unresolvable parcels. Confirm card explanation is present.
- Confirm no technical status strings appear.

---

### Sprint 1 Acceptance Criteria

- No duplicated "Activity record" + chart + list pattern remains on the property page.
- The ConstructionByDecadeChart does not appear on street or block pages.
- City page has no more than 4 charts.
- Example homepage chips (Prospect Ave, Touhy Ave) route to pages with actual property data.
- All section headings use sentence case and consistent naming patterns.
- Street page breadcrumbs show the correct parent.
- No standalone "Sources" sections appear in page bodies (only inline source notes).
- Neighborhood type chips on the property page include a one-sentence explanation.
- Users can navigate from a property up to its street, neighborhood, subdivision, and city.
- Empty search states produce a helpful plain-English message.
- Unresolvable parcel cards explain the gap without technical language.
- No em dashes appear anywhere in changed content.

### Sprint 1 QA Checklist

- [ ] Homepage: example chips route to real data
- [ ] Homepage: empty search state shows explanation
- [ ] Search: partial matches, full matches, and no-match states all produce feedback
- [ ] Property page: sale and permit data shown once each (not stat card + chart + list)
- [ ] Property page: neighborhood section has "Geographic context" heading with explanation
- [ ] Property page: link to street page is present
- [ ] Property page: section headings all use sentence case
- [ ] Neighborhood page: neighborhoods grouped or labeled by type
- [ ] Subdivision page: neighborhood context chip present
- [ ] Street page: breadcrumb shows correct parent
- [ ] Street page: neighborhood chip present
- [ ] Block page: street and neighborhood context chips present
- [ ] City page: no more than 4 charts
- [ ] All entity pages: no standalone Sources section in body
- [ ] All entity pages: inline source notes still present under charts
- [ ] Mobile layout: all changed sections readable on 375px viewport
- [ ] Console: no TypeScript or React errors in changed components
- [ ] Build: `npm run build` passes with no errors
- [ ] Em dash scan: grep for the em dash character (U+2014) in all changed files

---

## Sprint 2: Visual Storytelling and Page Consistency

### Goal

Make the app more engaging, visual, and emotionally compelling while preserving trust and clarity.

### Why This Sprint Matters

The app should not feel like a generic real estate dashboard. It should feel like a historical, property-specific story product. Right now, every page presents data without narrative synthesis. The property page shows "Year built: 1924" without saying "This home was built during Park Ridge's most active construction decade." The city page shows 6 charts without a through-line. The neighborhood pages have no visual rhythm and no emotional arc. This sprint adds the connective tissue.

### Scope

- Add a "property story" header block to property pages: one or two sentences synthesizing the property's era, subdivision, and construction context, derived from existing data.
- Create a consistent visual system for section headings across property, block, street, subdivision, neighborhood, and city pages.
- Add meaningful era color usage consistently: every property card, decade group, and chart uses the era color system already defined in `src/lib/mapConfig.ts`.
- Improve card hierarchy: title, meta, and metaItems should have clear visual weight difference.
- Standardize chart styles: all charts should share the same color palette, axis style, and tooltip format.
- Convert the "Evidence trail" timeline on property pages from a list to a proper visual timeline.
- Add a "What this means" module at the bottom of property pages that synthesizes the most important facts in plain English.
- Improve neighborhood pages: add median sale price (2015 vs. 2024) comparison, matching the pattern already used on subdivision pages.
- Improve mobile layouts: ensure stat grids, entity card grids, and charts are readable on narrow screens.
- Add stronger "next action" links: every major section should end with a contextual link ("See all properties in this subdivision," "Explore the Northeast neighborhood," "Browse Park Ridge history").

### Out of Scope

Do not add unsourced historical claims.
Do not introduce decorative visuals that do not explain something.
Do not add heavy animation unless it improves comprehension.
Do not create a separate design system disconnected from existing components.

### Detailed Tasks

---

#### Task 2.1: Add "property story" synthesis header

**Current problem:**
Property pages start with a confidence badge and vitals grid. There is no sentence that says what this property is and why it matters historically. Users have to piece together year built + subdivision + neighborhood themselves.

**Required change:**
Generate a 1-2 sentence story header above the vitals grid on the property page. Use existing data: year built, subdivision, neighborhood, construction era. Example: "This home was built in 1924 during Park Ridge's interwar construction peak, in what was then known as the Park Ridge Highlands subdivision." If year built is unknown, omit the date. If subdivision is unknown, omit the subdivision reference. Keep it data-driven, not speculative.

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx`
- A utility function to compose the story string from property data

**Acceptance criteria:**
- Every property with a year built shows a 1-2 sentence synthesis above the vitals.
- Properties with missing year built show a shorter version or omit the era reference.
- The synthesis sentence uses only verified data fields (no inference).

**QA steps:**
- Open a property with year built and subdivision. Confirm story sentence appears.
- Open a property with no year built. Confirm graceful fallback.

---

#### Task 2.2: Upgrade "Evidence trail" to a visual timeline

**Current problem:**
The PropertyTimeline component already exists and is used in the property page as "Evidence trail." The timeline component itself may render as a list or simple vertical bar. The name "Evidence trail" is accurate but academic.

**Required change:**
Rename "Evidence trail" to "Property timeline" (matches user expectation for a home history product). Ensure the PropertyTimeline component renders as a visual vertical timeline with year markers, icons, and connecting lines, not just a list. Verify the component at `src/components/ui/PropertyTimeline.tsx` and improve its visual hierarchy if needed.

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx` (line 519: section heading)
- `src/components/ui/PropertyTimeline.tsx`

**Acceptance criteria:**
- Section heading is "Property timeline" not "Evidence trail."
- Timeline renders with clear year markers and visual structure.
- Icons differentiate event types (sale, permit, subdivision recording, assessment).

**QA steps:**
- Open a property with multiple timeline events. Confirm timeline renders with visual structure.
- Confirm event types have distinct icons or colors.

---

#### Task 2.3: Add "What this means" buyer summary to property pages

**Current problem:**
Property pages show data but never explain what it means for a buyer, owner, or agent. A user sees "3 sales on record" but does not know if that is typical or unusual for the area. They see "Assessed value: $312,000" but have no comparison.

**Required change:**
Add a "What this means" section near the bottom of the property page (before "What we don't know yet"). This section generates 2-4 bullet points from existing data fields. Examples (all data-derived, non-speculative):
- "This home is [N] years older / younger than the typical home on this street."
- "It has changed hands [N] times since [year], which is [above/below/typical for] the area median."
- "The assessed value has [increased/decreased] [X]% since [year]."
Do not generate bullet points where comparison data is unavailable.

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx`
- Data already available via `detail.comparisons`; use this to generate plain-English bullets

**Acceptance criteria:**
- Properties with comparison data show a "What this means" section.
- All bullets are derived from existing data, no inference or speculation.
- Section does not appear if no comparison data is available.

**QA steps:**
- Open a property with comparisons data. Confirm bullets render.
- Open a property without comparison data. Confirm section does not appear.
- Verify no appraisal, inspection, or investment language appears.

---

#### Task 2.4: Add price comparison to neighborhood pages

**Current problem:**
Subdivision pages already show "Median sale price, 2015 vs. 2024" using the NeighborhoodPriceChart component. Neighborhood pages do not have this. For a home shopper, neighborhood-level price context is more useful than subdivision-level, but it is currently missing.

**Required change:**
Fetch and display a 2015 vs. 2024 median price comparison on neighborhood pages, using the same NeighborhoodPriceChart component and the same `fetchBlockSalesByYear` query pattern adapted for neighborhoods.

**Files involved:**
- `app/neighborhoods/[slug]/_NeighborhoodDetailContent.tsx`
- `src/lib/supabase/blockQueries.ts` (may need a neighborhood-scoped version of fetchBlockSalesByYear)
- `src/components/ui/NeighborhoodPriceChart.tsx`

**Acceptance criteria:**
- Neighborhood pages show a price comparison section when data is available.
- Uses the same chart component and visual style as subdivision pages.
- Source note is present.

**QA steps:**
- Open a neighborhood page with sufficient sale data. Confirm chart renders.
- Open a neighborhood with sparse data. Confirm the section is gracefully hidden.

---

#### Task 2.5: Improve homepage narrative and reduce information overload

**Current problem:**
The homepage (`app/page.tsx`) shows 7+ distinct sections before the user has searched anything: hero, stats, sparkline cards (3), archive inventory (5 cards), notable properties, neighborhood comparison charts, neighborhoods grid. This is overwhelming for a first-time visitor who just wants to know what the site does.

**Required change:**
Restructure the homepage to: hero + search (full width), then one row of 3 sparkline cards (keep), then the notable properties highlight reel (keep, but move directly after sparklines), then neighborhoods grid (keep). Remove the archive inventory row (the 5-card database stats panel) from the homepage and move it to the About or Data Sources page. Remove the neighborhood comparison charts section from the homepage (it belongs on the city or neighborhood pages). The homepage job should be: orient, search, discover.

**Files involved:**
- `app/page.tsx`
- The removed sections are still accessible at /city and /neighborhoods

**Acceptance criteria:**
- Homepage has 4 sections maximum: hero/search, sparkline cards, notable properties, neighborhoods grid.
- Archive inventory (database stats) is removed from homepage.
- Neighborhood comparison charts are removed from homepage.
- Load time improves due to fewer parallel data fetches on the home route.

**QA steps:**
- Visit homepage. Confirm 4 sections maximum.
- Confirm no archive inventory cards on homepage.
- Confirm no neighborhood comparison charts on homepage.
- Confirm sparklines, highlights, and neighborhoods grid still render.
- Confirm homepage still communicates value proposition clearly.

---

### Sprint 2 Acceptance Criteria

- Property pages have a 1-2 sentence story synthesis header.
- "Evidence trail" is renamed to "Property timeline."
- Property pages have a "What this means" buyer summary section.
- Neighborhood pages show a 2015 vs. 2024 price comparison.
- Homepage has no more than 4 sections.
- Archive inventory and neighborhood comparison charts are moved off the homepage.
- All pages use consistent section heading style.
- No em dashes appear anywhere in changed content.

### Sprint 2 QA Checklist

- [ ] Visual consistency: property, neighborhood, subdivision, street pages share heading style
- [ ] Typography: section headings all use sentence case
- [ ] Card hierarchy: entity cards have clear title/meta/detail visual weight
- [ ] Property page: story synthesis header renders
- [ ] Property page: "Property timeline" heading (not "Evidence trail")
- [ ] Property page: "What this means" section renders when data available
- [ ] Property page: no "What this means" section when comparison data absent
- [ ] Neighborhood page: price comparison chart renders
- [ ] Homepage: 4 sections maximum
- [ ] Homepage: no archive inventory
- [ ] Homepage: no neighborhood comparison charts
- [ ] Charts: consistent axis style across all chart components
- [ ] Mobile layout: all new sections readable at 375px
- [ ] Mobile layout: timelines and cards stack correctly
- [ ] Accessibility: new sections have appropriate headings and aria labels
- [ ] Build: `npm run build` passes
- [ ] Em dash scan: grep for the em dash character (U+2014) in all changed files

---

## Sprint 3: Historical Trust and Real Estate Usefulness

### Goal

Make the app more credible, useful, and specific for home shoppers, agents, homeowners, and local historians.

### Why This Sprint Matters

The product becomes valuable when it translates land, property, subdivision, and neighborhood data into trustworthy interpretation. Right now, the Hargis survey section shows architectural class codes ("NR eval: C") without explaining what they mean. The subdivision ancestry section shows "Confidence: medium" without explaining what medium means. The city narrative says "Park Ridge grew in three distinct waves" without citing a source. Each of these small credibility gaps compounds into a feeling that the app is "just data," not authoritative history.

### Scope

- Add a standard historical claim pattern: claim, date, source, source type, confidence level, interpretation.
- Add plain-English explanations of confidence levels at their point of use.
- Explain HARGIS architectural class codes and NR evaluation values in plain English.
- Add subdivision genealogy explanations where parent/child relationships exist.
- Add city narrative source citation.
- Add "What to ask before buying" buyer guidance module (factual, non-speculative).
- Add agent-friendly property summary block that is factual and quotable.
- Improve methodology explanations on the Data Sources page.
- Add construction era context to property pages: explain what the era means for construction type and materials.

### Out of Scope

Do not provide appraisals.
Do not make inspection claims.
Do not make school-quality claims.
Do not make safety claims.
Do not make investment claims.
Do not invent historical facts or boundaries.
Do not infer causation unless clearly labeled as interpretation.

### Historical Claim Pattern

Every significant historical claim on entity pages must follow this pattern:

```
[Claim text]
Source: [Source name]
Source type: [Official record / Survey / Inferred / Approximated]
Confidence: High / Medium / Low
[Optional: Interpretation note in italics]
```

Confidence levels:
- High: directly supported by official records or primary sources (Cook County Recorder, assessor parcel data)
- Medium: inferred from multiple consistent sources or approximated from spatial joins
- Low: plausible but not directly verified (neighborhood boundary approximations, some build years)

### Real Estate Usefulness Pattern

Every property page must address (where data permits):

- What happened here? (timeline synthesis)
- How does this property compare with nearby homes? (comparison section already exists)
- What changed over time? (assessment and sale history)
- What should a buyer or agent understand? (new "What this means" module from Sprint 2)
- What is known, unknown, or inferred? (existing "What we don't know yet" section)

### Detailed Tasks

---

#### Task 3.1: Explain confidence levels at the point of use

**Current problem:**
The `ConfidenceBadge` component shows "High confidence" / "Medium confidence" / "Low confidence" at the top of property pages. In the subdivision ancestry section, "Confidence: medium" appears. But nowhere does the app explain what these mean.

**Required change:**
Add a small (?) tooltip or expandable inline explanation next to each confidence label. Content: "High: directly supported by official county records. Medium: inferred from multiple consistent sources. Low: plausible but not directly verified." The tooltip should be a shared component usable wherever confidence is shown.

**Files involved:**
- `src/components/ui/ConfidenceBadge.tsx`
- `app/properties/[pin]/_PropertyDetailContent.tsx` (subdivision ancestry section, line 299)

**Acceptance criteria:**
- ConfidenceBadge has an accessible (?) tooltip explaining the level.
- Subdivision ancestry confidence label has the same tooltip.
- The tooltip content matches the definitions in this roadmap.

**QA steps:**
- Open a property page. Hover or tap the confidence badge. Confirm tooltip appears.
- Open subdivision ancestry section. Confirm confidence label has explanation.

---

#### Task 3.2: Explain HARGIS codes in plain English

**Current problem:**
The HARGIS survey section shows fields like "arch_class" and "NR eval: C" without explaining what they mean. "NR eval" stands for National Register of Historic Places evaluation. "Arch class" is an architectural classification code. These are meaningful to historians but opaque to home shoppers.

**Required change:**
Add plain-English labels next to HARGIS codes:
- "NR eval: C" -> "National Register: contributing structure"
- "NR eval: NC" -> "National Register: non-contributing"
- "arch_class: A" -> "Architectural class: high significance"
(Add a lookup table for common values, and a fallback "Code: [value]" for unknown ones.)

Also rename the section heading from "Historic survey (HARGIS)" to "Historic architecture survey" with a subtitle "From the Illinois Historic Architectural Resources Geographic Information System (HARGIS), Illinois State Historic Preservation Office."

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx` (`HargisSurveySection` component, lines 329-399)

**Acceptance criteria:**
- NR evaluation values are shown in plain English, not as raw codes.
- Section heading is "Historic architecture survey."
- Source subtitle explains HARGIS and SHPO.

**QA steps:**
- Open a property with a HARGIS record. Confirm plain-English NR evaluation label.
- Confirm section heading is updated.

---

#### Task 3.3: Add construction era context to property pages

**Current problem:**
Property pages show "Year built: 1924" but do not explain what 1924 means for Park Ridge construction. Was this the bungalow era? The railroad era? What does that imply for construction type?

**Required change:**
Add an era context note below the year built vital item (or within the story synthesis header from Task 2.1). Map the year built to the Park Ridge construction era using the era labels already defined in `src/lib/content.ts` (`NEIGHBORHOOD_ERA_LABELS`). Example: if a home was built in 1924 in the Northeast neighborhood, note "Built during the bungalow-era expansion, 1910s to 1940s." If the neighborhood era label is not available, use a generic era label based on decade ranges.

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx`
- `src/lib/content.ts` (`NEIGHBORHOOD_ERA_LABELS`)

**Acceptance criteria:**
- Properties with known year built show a construction era label.
- The era label matches the neighborhood's known era where available.
- Era label is derived from existing content constants, not invented.

**QA steps:**
- Open a property in the Uptown neighborhood. Confirm "Railroad-era" or equivalent label.
- Open a property in Northwest. Confirm "Postwar ranch" or equivalent label.
- Open a property with no year built. Confirm no era label.

---

#### Task 3.4: Add source citation to the city narrative

**Current problem:**
The CITY_NARRATIVE in `src/lib/content.ts` states "Park Ridge grew in three distinct waves" and describes specific historical periods. This is a historical claim with no source. It appears on the city history page without citation.

**Required change:**
Add an inline source note below the city narrative paragraph on the city history page. Content: "Historical summary based on Cook County Assessor build-year distributions and Cook County Recorder subdivision records. Era characterizations are interpretive summaries of the data." Add a `Confidence: Medium` note.

**Files involved:**
- `app/city/_CityContent.tsx` (line 101 where `CITY_NARRATIVE` is rendered)

**Acceptance criteria:**
- A source note appears below the city narrative paragraph.
- The note clarifies this is interpretive, not a primary source quote.
- No factual claims are removed or changed.

**QA steps:**
- Visit /city. Confirm source note appears below the opening narrative.
- Confirm the note is readable and appropriately styled (InlineSourceNote component).

---

#### Task 3.5: Add agent-friendly property summary block

**Current problem:**
There is no section on the property page designed for a real estate agent who needs a quick, quotable summary of a property's history. An agent must currently read the entire page and synthesize manually.

**Required change:**
Add an "Agent summary" or "Quick summary" section near the top of the property page (after the vitals, before the PIN breakdown). This section renders a compact 3-5 line text summary combining: address, year built, building size, most recent sale year and price, subdivision, and neighborhood. Format it as readable prose, not a data table. Label it with a small badge: "Shareable summary." Add a copy-to-clipboard button.

Only render this section if the property has year built, at least one sale record, and a subdivision or neighborhood on record.

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx`

**Acceptance criteria:**
- "Quick summary" section renders for properties with sufficient data.
- Summary is readable prose, 3-5 lines.
- Copy-to-clipboard button works.
- Section does not render for properties with sparse data.
- No appraisal, investment, inspection, or safety language.

**QA steps:**
- Open a well-documented property. Confirm summary section renders.
- Click copy button. Paste. Confirm correct text is copied.
- Open a sparse property. Confirm section does not render.

---

#### Task 3.6: Improve Data Sources page with methodology

**Current problem:**
The Data Sources page lists 6 sources but does not explain how they are joined, why 9% of parcels lack addresses, what the known limitations are for each source, or how confidence levels are determined.

**Required change:**
Add a "How we connect the data" section to the Data Sources page explaining the join methodology in plain English. Add a "Known limitations" section with a bullet list. Add a "How confidence levels work" section using the definitions from this roadmap.

**Files involved:**
- `app/sources/page.tsx`

**Acceptance criteria:**
- Data Sources page has "How we connect the data" section.
- Data Sources page has "Known limitations" section.
- Data Sources page has "How confidence levels work" section.
- All content is factual and matches actual methodology.

**QA steps:**
- Visit /sources. Confirm three new sections are present.
- Verify the methodology description matches the actual data pipeline.

---

#### Task 3.7: Add "Questions to consider" buyer guidance module

**Current problem:**
The app has useful data for home shoppers but never guides them on what questions to ask based on what they see. A shopper who sees "No permit history in dataset" has no idea if that is a concern or normal.

**Required change:**
Add a "Questions to consider" section to property pages, rendered only for properties with specific data patterns. Examples (data-triggered, not speculative):
- If permit_count is 0: "No permits are in this dataset (records are available from 2018 onward). It may be worth asking about renovation history directly."
- If the property has changed hands more than 4 times in 10 years: "This property has sold frequently. It may be worth understanding the transaction history."
- If year_built is missing: "The build year is not recorded in county data. A title search or building department inquiry may fill this gap."

These are factual observations, not legal or appraisal advice. Label the section clearly: "Questions to consider (based on available records)."

**Files involved:**
- `app/properties/[pin]/_PropertyDetailContent.tsx`

**Acceptance criteria:**
- "Questions to consider" section renders when data triggers exist.
- All bullets are based on data patterns, not invented advice.
- Section includes a disclaimer: "These are observations from county records, not legal or appraisal advice."
- Section does not appear if no triggers are present.

**QA steps:**
- Open a property with 0 permits. Confirm permit-related question appears.
- Open a well-documented property with no triggers. Confirm section does not appear.
- Verify disclaimer is present.

---

### Sprint 3 Acceptance Criteria

- ConfidenceBadge has a tooltip explaining the confidence level meaning.
- Subdivision ancestry confidence labels have the same explanation.
- HARGIS NR evaluation codes are shown in plain English.
- HARGIS section heading is "Historic architecture survey."
- Properties with known year built show a construction era label.
- City narrative paragraph has an inline source note.
- "Quick summary" section renders for well-documented properties.
- Data Sources page has methodology, limitations, and confidence level explanations.
- "Questions to consider" section appears for properties with relevant data patterns.
- All new content avoids appraisal, inspection, school, safety, and investment claims.
- No em dashes appear anywhere in changed content.

### Sprint 3 QA Checklist

- [ ] ConfidenceBadge: tooltip explains High/Medium/Low
- [ ] Subdivision ancestry: confidence label has explanation
- [ ] HARGIS: NR codes shown in plain English
- [ ] HARGIS: section heading updated
- [ ] Property page: era context label appears for known year built
- [ ] City page: source note below narrative paragraph
- [ ] Property page: "Quick summary" renders for rich properties
- [ ] Property page: "Quick summary" absent for sparse properties
- [ ] Copy button: works correctly
- [ ] Data Sources page: methodology section present
- [ ] Data Sources page: limitations section present
- [ ] Data Sources page: confidence level explanation present
- [ ] Property page: "Questions to consider" appears for triggered patterns
- [ ] Property page: "Questions to consider" absent when no triggers
- [ ] Disclaimer present in "Questions to consider"
- [ ] No appraisal/inspection/safety/investment language anywhere
- [ ] Build: `npm run build` passes
- [ ] Em dash scan: grep for the em dash character (U+2014) in all changed files

---

## Cross-Sprint Rules

These rules apply to all three sprints and all future work:

- Do not hallucinate facts. All claims must come from data or be labeled as interpretation.
- Do not create placeholder historical claims. If a claim needs a source, add a "Needs citation" note.
- Do not duplicate metrics. If a number appears in two places, eliminate the less prominent one.
- Do not use multiple names for the same concept. Pick one name per entity type and use it everywhere.
- Do not bury methodology. If users can see data, they can see how the data was produced.
- Do not ship pages with unexplained missing data. Every gap needs a plain-English explanation.
- Do not create new one-off components if a shared component should exist.
- Do not use em dashes anywhere: in code, in UI copy, in comments, in commit messages, in documentation.
- Each sprint must leave the app cleaner than it started. No net increase in complexity unless justified.

---

## Required Developer Workflow

For each task in each sprint:

1. Inspect the current implementation of the relevant component or page.
2. Identify all files and components involved.
3. Write a short implementation note (2-4 sentences) before making changes. Describe what you are changing and why.
4. Make the smallest coherent set of changes. Do not refactor adjacent code unless it is directly in the way.
5. Reuse existing components where reasonable. Do not create new components unless the pattern does not exist.
6. Remove dead or duplicated code. Do not leave commented-out sections.
7. Run `npm run build` and confirm it passes. Fix any TypeScript errors before committing.
8. Manually inspect the affected routes in the browser.
9. Update this roadmap file with completion notes for each finished task.
10. Document known limitations at the bottom of the relevant task section.

---

## Progress Tracking

| Item | Sprint | Status | Owner | Notes | Completed date |
|------|--------|--------|-------|-------|----------------|
| Task 1.1: Consolidate property page sale/permit sections | 1 | Not started | Frontend | | |
| Task 1.2: Remove redundant Sources sections from page body | 1 | Not started | Frontend | | |
| Task 1.3: Fix construction chart duplication | 1 | Not started | Frontend | | |
| Task 1.4: Clarify neighborhood type system | 1 | Not started | Frontend | | |
| Task 1.5: Fix empty street pages (Prospect Ave, Touhy Ave) | 1 | Not started | Data/Frontend | | |
| Task 1.6: Consolidate city page chart overload | 1 | Not started | Frontend | | |
| Task 1.7: Add hierarchy context chips to entity pages | 1 | Not started | Frontend | | |
| Task 1.8: Improve search empty and failed states | 1 | Not started | Frontend | | |
| Task 1.9: Standardize section headings | 1 | Not started | Frontend | | |
| Task 1.10: Add plain-English empty state for unresolvable parcels | 1 | Not started | Frontend | | |
| Task 2.1: Add property story synthesis header | 2 | Not started | Frontend/Content | | |
| Task 2.2: Upgrade Evidence trail to visual timeline | 2 | Not started | Frontend | | |
| Task 2.3: Add "What this means" buyer summary | 2 | Not started | Frontend/Content | | |
| Task 2.4: Add price comparison to neighborhood pages | 2 | Not started | Frontend/Data | | |
| Task 2.5: Improve homepage and reduce overload | 2 | Not started | Frontend | | |
| Task 3.1: Explain confidence levels at point of use | 3 | Not started | Frontend/Content | | |
| Task 3.2: Explain HARGIS codes in plain English | 3 | Not started | Content/Frontend | | |
| Task 3.3: Add construction era context | 3 | Not started | Frontend/Content | | |
| Task 3.4: Add source citation to city narrative | 3 | Not started | Content | | |
| Task 3.5: Add agent-friendly property summary block | 3 | Not started | Frontend | | |
| Task 3.6: Improve Data Sources page with methodology | 3 | Not started | Content | | |
| Task 3.7: Add "Questions to consider" buyer guidance | 3 | Not started | Frontend/Content | | |

Statuses: Not started / In progress / Blocked / Complete / Deferred

---

## Next Action

Sprint 1 should be implemented first. No Sprint 2 work should begin until all Sprint 1 tasks are complete and the Sprint 1 QA checklist passes. No Sprint 3 work should begin until Sprint 2 is complete.

Sprint 1 is the highest-leverage sprint. It removes noise that makes every other improvement harder to see. Duplication, naming inconsistency, broken example flows, and chart overload are all problems that compound. Fixing them first creates a clean foundation for the storytelling work in Sprint 2 and the credibility work in Sprint 3.

The first five tasks to execute in Sprint 1 are:
1. Task 1.5 first (fix broken street pages): this is a data trust issue that affects first impressions.
2. Task 1.1 (consolidate property page sale/permit sections): highest-traffic page, clearest win.
3. Task 1.6 (city page chart overload): reduces visual noise on a primary discovery page.
4. Task 1.9 (standardize section headings): small change, high consistency payoff.
5. Task 1.2 (remove redundant Sources sections): cleans up every entity page at once.
