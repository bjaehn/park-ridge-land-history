# Park Ridge Land History — Backlog (Cycle 2, 2026-07-08)

Itemized task backlog produced from the Cycle 2 product evaluation (`EVALUATION.md`) and 5-sprint roadmap (`ROADMAP.md`, "Cycle 2" section). Task IDs are priority-tier based (A1 = must-fix-before-showing-to-real-users, through A5 = future opportunity), not sprint-numbered — see `ROADMAP.md` for which sprint each task is scheduled in.

This is a separate task-ID namespace from the numeric `0.x`/`1.x`/`2.x`/`3.x` tasks in `ROADMAP.md`'s Cycle 1 section (all of which are marked Complete in that file's Progress Tracking table).

---

**A1.1 — Fix section-heading tag from `<p>` to real heading levels**
User story: as a screen-reader user, I can navigate a page by its section headings.
Problem: `.section-heading` renders as `<p>` in 9 files, and the property page has 19 flat `<h2>`s with no nesting.
Implementation: swap tags in the 9 files; on the property page, wrap subsections under their 4 `StoryGroupHeader` parents and demote them to `<h3>`.
Files: `HighlightReel.tsx`, `_PinGroupContent.tsx`, `_PermitsContent.tsx`, `CommunityProfilePanel.tsx`, `HistoricalFactsPanel.tsx`, `SubdivisionHistoryPanel.tsx`, `EraPortrait.tsx`, `NeighborhoodCharts.tsx`, `PinScopedCharts.tsx`, `_PropertyDetailContent.tsx`.
Data/schema: none.
Acceptance criteria: heading-outline audit (axe or custom test) shows one `<h1>` and correctly nested `<h2>`/`<h3>` on every page type; no `<p className="section-heading">` remains.
Test cases: automated heading-level test per page type; manual VoiceOver/NVDA pass on `/pin/09`, a property page, and `/permits`.
Priority: A1. Complexity: M.

**A1.2 — Reconcile neighborhood-boundary methodology copy**
User story: as a user reading `/sources` after visiting a neighborhood page, I see one consistent explanation of how boundaries are determined.
Problem: `/sources`/`/about` describe boundaries as approximate Census-tract groupings ("five area labels"); the neighborhood page calls them official.
Implementation: write one accurate paragraph (confirm current methodology with the user before finalizing wording) describing the 7 official-planning-neighborhood boundaries sourced from the 1996 Comprehensive Plan and any genuine remaining approximation (e.g., edge-parcel assignment). Store as one constant in `content.ts`; reference it from all three locations.
Files: `content.ts`, `app/sources/page.tsx`, `app/about/page.tsx`, `NeighborhoodTypePanel.tsx`.
Data/schema: none.
Acceptance criteria: identical methodology description (same shared string) renders in all three places; zero remaining references to "five area labels" or "Census tract groupings" unless still literally accurate.
Test cases: snapshot/string-match test confirming all three consumers render the same constant.
Priority: A1. Complexity: S (mechanical) + content sign-off needed.

**A1.3 — Fix breadcrumb/in-page neighborhood mismatch and strip unexplained cadastral jargon**
User story: as a homeowner, the neighborhood shown for my property is the same everywhere on the page.
Problem: breadcrumb reads a stale legacy column; page body reads the current typed-FK model.
Implementation: remove the legacy `neighborhood_id`-derived read path in `properties.ts`; make the breadcrumb consume the same typed-FK-derived label the page body already computes. Remove raw Township/Section/Block breadcrumb segments (move that info into the existing "Technical details" disclosure only) or relabel them in plain language if navigation depends on them.
Files: `src/lib/data/properties.ts`, `app/properties/[pin]/page.tsx`, `Breadcrumb.tsx`.
Data/schema: none (read-path only).
Acceptance criteria: for a sample of properties, breadcrumb neighborhood label matches the in-page "Neighborhood →" link label; no raw Township/Section/Block string appears outside the collapsed technical-details panel.
Test cases: unit test asserting breadcrumb and body neighborhood derivation use the same function/data source; manual check on 901 S Crescent Ave (known live example) and 2-3 other properties across different subdivisions.
Priority: A1. Complexity: M.

**A1.4 — Cite or disclaim historical narrative content**
User story: as a skeptical reader, I can tell which historical claims are sourced and which are editorial.
Problem: homepage `CITY_NARRATIVE` is uncited; `NEIGHBORHOOD_ERA_LABELS` sentences render unmarked beside a formal `ConfidenceBadge`.
Implementation: add an `InlineSourceNote`/citation link to the homepage narrative (link to the corresponding `historical_facts` entry or the `/city` page's existing disclosure). Add a distinct, lightweight "(editorial estimate)" marker or tooltip wherever an era-label sentence renders beside a `ConfidenceBadge`.
Files: `app/page.tsx`, `content.ts`, `_PropertyDetailContent.tsx`.
Data/schema: none.
Acceptance criteria: homepage narrative has a visible source note; every era-label sentence adjacent to a `ConfidenceBadge` carries its own distinct marker.
Test cases: visual/manual check on homepage and on 2-3 property pages across different neighborhoods.
Priority: A1. Complexity: S.

**A2.1 — Migrate remaining pages to `PageHeader`**
User story: as a user, every top-level page introduces itself the same visual way.
Implementation: replace hand-rolled header markup in `app/page.tsx`, `_PermitsContent.tsx`, `_StreetsContent.tsx`, `_SubdivisionsHero.tsx` with `PageHeader`.
Files: as listed.
Data/schema: none.
Acceptance criteria: all 4 pages render `PageHeader` with consistent sizing; visual diff review confirms no unintended copy loss.
Test cases: snapshot test per migrated page.
Priority: A2. Complexity: S.

**A2.2 — Extract and enforce canonical section order**
User story: as a user, comparable page types (subdivision, neighborhood, city, street) present sections in the same order.
Implementation: reorder subdivision-page highlight reel after its charts; resolve `CommunityProfilePanel`'s placement on the city page (either a clearly separated "Today's Park Ridge" position or its own section); add or explicitly document the absence of a subdivision price-comparison section. Extend `sectionOrder.test.ts` to assert order across all page types.
Files: `_SubdivisionDetailContent.tsx`, `_CityContent.tsx`, `sectionOrder.test.ts`.
Data/schema: none.
Acceptance criteria: extended test suite passes; manual review confirms consistent ordering across the 4 discovery page types.
Test cases: new assertions in `sectionOrder.test.ts` per page type.
Priority: A2. Complexity: M.

**A2.3 — Extract shared `<DecadeGroup>` component**
User story: as a user, decade-grouped lists look and read identically everywhere.
Implementation: build `DecadeGroup.tsx` from the corrected canonical pattern (real `<h2>`, consistent "Unknown era" label, consistent dot-rendering rule); migrate `_PinGroupContent.tsx`, `_StreetDetailContent.tsx`, `_SubdivisionDetailContent.tsx`, `NeighborhoodTypeIndexPage.tsx`, `_SubdivisionsContent.tsx` to use it; decide deliberately whether the streets index keeps its distinct multi-decade bucketing (and label it as an intentional exception if so) or migrates too.
Files: new `DecadeGroup.tsx`; the 5-6 call sites listed; update CLAUDE.md's decade-grouping section to match.
Data/schema: none.
Acceptance criteria: one component definition; all call sites render identical header/dot/label behavior (except the documented streets-index exception, if kept).
Test cases: unit test for `DecadeGroup` covering known-decade, unknown, and boundary (pre-1900) cases.
Priority: A2. Complexity: M.

**A2.4 — Unify chart and badge color palette to design tokens**
User story: as a user, charts and badges visually match the rest of the app.
Implementation: create `chartTheme.ts` exporting grid/axis/tooltip/series colors sourced from `tailwind.config.ts`; point all 10 Recharts files and `EraPortraitChart` at it (era colors should import `ERA_PALETTE` from `mapConfig.ts` directly, not redefine a subset); fix `TeardownBadge.tsx` and the subdivision teardown callout to use `accent-amber`/`confidence-*` tokens instead of raw `amber-500`.
Files: new `chartTheme.ts`; `_AssessmentChart.tsx`, `_SalesPriceChart.tsx`, `AppealsChart.tsx`, `AssessmentTrendChart.tsx`, `MarketHistoryChart.tsx`, `PermitActivityChart.tsx`, `SubdivisionPlatChart.tsx`, `EraPortraitChart.tsx`; `TeardownBadge.tsx`; `_SubdivisionDetailContent.tsx`.
Data/schema: none.
Acceptance criteria: no hardcoded hex literal remains in a chart file outside `chartTheme.ts`/`mapConfig.ts`; visual QA confirms chart colors match the map legend for the same eras on the same page.
Test cases: grep-based lint rule or test asserting no raw hex strings in chart component files; visual regression screenshots.
Priority: A2/A3. Complexity: M.

**A3.1 — De-duplicate confidence-level copy and document the multi-domain model**
User story: as a user, "confidence" means the same explained thing everywhere I see it.
Implementation: make `app/sources/page.tsx`'s confidence explanation read from the same constants as `formatters.ts`'s `CONFIDENCE_DESCRIPTION`/`CONFIDENCE_TOOLTIP`, or vice versa; expand the `/sources` explanation to note the domain-specific heuristics (property/subdivision/historical-fact/teardown) if they remain intentionally distinct.
Files: `formatters.ts`, `app/sources/page.tsx`, `subdivisionTypes.ts`.
Data/schema: none required; optionally begin wiring `source_registry.confidence_default` into one domain as a proof of concept.
Acceptance criteria: no duplicated, differently-worded confidence copy remains; `/sources` accurately describes all domains where confidence appears.
Test cases: string-match test confirming shared source of truth.
Priority: A3. Complexity: S-M.

**A3.2 — Add explicit "not yet linked" state for thin/unresearched subdivisions**
User story: as a user landing on a subdivision with no linked parcels, I understand why the page is empty rather than assuming it's broken.
Implementation: detect zero-linked-parcels subdivisions (via `linked_parcel_count`) and render an explicit message consistent with the app's existing honest-gap language (e.g., "No parcels have been linked to this subdivision yet. This entry is a research lead.") instead of silently omitting all downstream sections.
Files: `_SubdivisionDetailContent.tsx`.
Data/schema: none.
Acceptance criteria: the live "Park Ridge (Resubdivision of Brickton)" subdivision (or any zero-linked-parcel subdivision) shows this explicit message.
Test cases: test with a subdivision fixture where `linked_parcel_count === 0`.
Priority: A3. Complexity: S.

**A3.3 — Remove redundant subdivision-ancestry widget on property pages**
User story: as a user, I see one clear explanation of my property's subdivision origin, not two overlapping ones.
Implementation: determine which of `LandLineageSection`/`LandAncestryPanel` is the stronger presentation (likely keep the `landLineage`/"recorded plat" version as primary) and either remove the other or merge their non-redundant content into one component.
Files: `_PropertyDetailContent.tsx`.
Data/schema: none.
Acceptance criteria: a property with both `landAncestry` and `detail.subdivision` populated shows one coherent subdivision-origin narrative, not three overlapping blocks.
Test cases: manual check on a property known to populate both data paths.
Priority: A3. Complexity: S-M.

**A3.4 — Add source citations and a construction-by-decade chart to street pages**
User story: as a user researching a street, I get the same sourcing depth and at least one chart, matching neighborhood/subdivision/PIN-group pages.
Implementation: add `InlineSourceNote`/`SourceNote` to `_StreetDetailContent.tsx`; add `ConstructionByDecadeChart` (or equivalent) using the street's own parcel data.
Files: `_StreetDetailContent.tsx`.
Data/schema: none (data already exists at the street-scope query level; confirm the relevant RPC supports street-scoped decade distribution, extending it if not).
Acceptance criteria: every street detail page shows at least one chart and at least one inline source citation.
Test cases: manual check on 2-3 street pages of varying size.
Priority: A3. Complexity: M.

**A4.1 — Build a shareable property-summary view**
User story: as a buyer or agent, I can generate a one-screen, shareable summary of a property in under 2 clicks.
Implementation: new component reusing existing property data-fetch logic; includes address, year built + confidence, 2-3 key comparison sentences, sale/permit counts, one highlight fact; add a "Copy/share summary" action on the property page.
Files: new summary component; `app/properties/[pin]/page.tsx` / `_PropertyDetailContent.tsx`.
Data/schema: none.
Acceptance criteria: summary generated in ≤2 clicks from any property page; content matches what's already shown on the full page (no new claims introduced).
Test cases: manual walkthrough on 3 properties with varying data completeness (full data, partial data, minimal data).
Priority: A4. Complexity: M.

**A4.2 — Wire up or delete unused Sparkline stat card components**
User story: n/a (engineering hygiene with a possible feature payoff).
Implementation: evaluate whether `SparklinePriceCard`/`SparklinePermitCard`/`SparklineSalesVolumeCard` add value on the subdivision or neighborhood index cards (they're fully built); wire them in if so, delete if not.
Files: the 3 Sparkline components; `_SubdivisionsContent.tsx` or `NeighborhoodTypeIndexPage.tsx` if wired in.
Data/schema: none.
Acceptance criteria: either the components render live somewhere with real data, or they no longer exist in the repo.
Test cases: visual check if wired in; grep confirmation of zero references if deleted.
Priority: A4. Complexity: S.

**A4.3 — Build a "compare nearby homes" view**
User story: as a buyer or agent, I can see 2-3 nearby properties side by side on shared metrics.
Implementation: new comparison view, likely accessible from the property page's existing "How this property compares" section, listing nearby/similar properties (same street or block) with shared stat columns.
Files: new comparison component; `_PropertyDetailContent.tsx`.
Data/schema: likely reuses existing street/block-scoped queries; confirm no new RPC is needed.
Acceptance criteria: a user can view at least 2-3 comparable properties with aligned metrics from any property page.
Test cases: manual walkthrough on a dense street/block and a sparse one.
Priority: A4. Complexity: M-L.

**A5.1 — Add a basic admin audit trail**
User story: as an admin (or future second editor), I can see who changed what and when, and revert if needed.
Implementation: add a lightweight change-log table capturing table/row/field/old-value/new-value/actor/timestamp on key admin write actions (subdivision merges, boundary edits, deed research updates).
Files: new migration; admin action files (`app/admin/_actions/*`).
Data/schema: new audit-log table + trigger or explicit logging calls in admin server actions.
Acceptance criteria: a sample admin edit produces a visible, queryable audit entry.
Test cases: perform a test edit in a staging environment and confirm the audit row.
Priority: A5. Complexity: L.

**A5.2 — Delete dead code**
User story: n/a (engineering hygiene).
Implementation: delete `src/styles/global.css`, `CoverageTable.tsx`, `fetchParcelsInSubdivision()` (unless repurposed by A4.2/A4.3), and any Sparkline component not wired in by A4.2.
Files: as listed.
Data/schema: none.
Acceptance criteria: build passes with zero references to deleted files/symbols remaining.
Test cases: `npm run build` and full grep confirmation.
Priority: A5. Complexity: S.

**A5.3 — Run a real performance and accessibility audit**
User story: n/a (measurement task feeding future prioritization).
Implementation: run Lighthouse/Core Web Vitals against the production URL for homepage, search, property, and city pages; run an automated axe accessibility scan across all page types; triage findings into the backlog.
Files: none (measurement task); results feed new backlog items.
Data/schema: none.
Acceptance criteria: a documented baseline report exists with top 5 performance and top 5 accessibility findings, each triaged to a priority tier.
Test cases: n/a (this task produces test cases for future work).
Priority: A5 (A3 to actually schedule the measurement). Complexity: S-M.

**A5.4 — Single-source the era color palette**
User story: n/a (engineering hygiene, prevents future map/chart color drift).
Implementation: make `mapConfig.ts`'s `ERA_PALETTE` and `tailwind.config.ts`'s `era` tokens derive from one shared definition (e.g., generate the Tailwind config's era colors from `ERA_PALETTE` at build time, or vice versa).
Files: `mapConfig.ts`, `tailwind.config.ts`.
Data/schema: none.
Acceptance criteria: a color change in one place updates both consumers; no hand-duplicated hex list remains.
Test cases: change one era color and confirm both the map and any Tailwind-class-based era swatch update.
Priority: A5. Complexity: S.

---

## Immediate recommended first task

**A1.1** — mechanical, unambiguous, high-impact, zero content decisions required. See `ROADMAP.md`'s "Cycle 2 — Immediate first task" section for the full rationale.
