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

---

# Cycle 3 (2026-07-09) Backlog

Itemized task backlog produced from the Cycle 3 follow-up audit (`EVALUATION.md`'s "Cycle 3" section) and its sprint plan (`ROADMAP.md`'s "Cycle 3" section). Task IDs are priority-tier based (B1 = fixes a live regression or standing-rule violation, through B5 = content decision needed before code can proceed), a separate namespace from Cycle 2's A1-A5.

---

**B1.1 — Group "Nearby homes on this block" by decade, not flat address order**
User story: as any visitor, every property-card list in this app looks and behaves the same way.
Problem: `_PropertyDetailContent.tsx:1013-1045`'s "Nearby homes on this block" section renders a flat grid sorted alphabetically by address — a direct violation of the user's standing instruction that property card lists must always be grouped by decade built via the shared `<DecadeGroup>` pattern.
Implementation: replace the flat `grid` with `<DecadeGroup items={nearby} getYear={p => p.yearBuilt} getKey={p => p.pin} renderItem={...} />`, matching `_PinGroupContent.tsx`'s existing block-level card pattern exactly (same file this section was modeled on, but the grouping step was dropped).
Files: `app/properties/[pin]/_PropertyDetailContent.tsx`.
Data/schema: none.
Acceptance criteria: nearby-homes cards render grouped by decade with the standard era-dot/label/rule/count header; a static-scan test asserts the section renders through `<DecadeGroup`, not a bare `grid`.
Test cases: extend `sectionOrder.test.ts`'s existing A4.3 block to also assert `<DecadeGroup` appears between the section heading and the card markup.
Priority: B1. Complexity: S.

**B1.2 — Close the `linked_parcel_count` trigger gap on `gis_lots`**
User story: as the admin, a subdivision's displayed parcel count is always correct without needing a manual resync.
Problem: `linked_parcel_count`'s trigger-maintenance covers `property_subdivision_links`, `parcels`, and `parcel_lot_relationships`, but not `gis_lots` — the table anchoring the third union branch. Direct `UPDATE`s to `gis_lots.subdivision_id` silently bypass all three existing triggers, which is exactly what caused 3 separate manual resync migrations in one week.
Implementation: add an `AFTER INSERT OR UPDATE OR DELETE` trigger on `gis_lots` mirroring the existing pattern in `20260703000003_earliest_year_built_column.sql`, recomputing `linked_parcel_count` for the affected subdivision(s) via the same logic `get_linked_pins_for_subdivision` uses.
Files: new migration; no app code changes.
Data/schema: new trigger + trigger function on `gis_lots`.
Acceptance criteria: a direct `UPDATE gis_lots SET subdivision_id = ...` immediately updates the affected subdivisions' `linked_parcel_count` with no manual resync call.
Test cases: manual verification — update a `gis_lots` row's `subdivision_id` in a test/staging context, confirm `linked_parcel_count` changes without running a resync script.
Priority: B1. Complexity: M.

**B2.1 — Extract a shared `<Card>` primitive**
User story: n/a (engineering hygiene).
Problem: `bg-surface-card border border-surface-border rounded-lg` is copy-pasted 45 times across 18 files — flagged in the Cycle 2 evaluation, never scoped into that cycle's backlog, and has grown since.
Implementation: extract `src/components/ui/Card.tsx` and migrate the highest-traffic call sites (`EntityCard.tsx`, `StatGrid.tsx`, `_PropertyDetailContent.tsx`, `_SubdivisionDetailContent.tsx`) first; leave a follow-up note for the remaining sites rather than migrating all 45 in one pass.
Files: new `Card.tsx`; the 4+ call sites above.
Data/schema: none.
Acceptance criteria: `Card` exists and is used by at least the 4 named call sites; visual output is unchanged (same classes, just centralized).
Test cases: visual spot-check; no behavior to unit test.
Priority: B2. Complexity: M.

**B2.2 — Fix the subdivision detail page's remaining hand-rolled loading skeleton**
User story: as a user, every page's loading state looks the same.
Problem: `_SubdivisionDetailContent.tsx:112-119` still hand-rolls its own loading tiles instead of using `<LoadingSkeleton rows={N}>` — named in both the original and this follow-up evaluation.
Implementation: swap the hand-rolled `<div className="space-y-4 animate-pulse">` block for `<LoadingSkeleton rows={3} />`.
Files: `app/subdivisions/[id]/_SubdivisionDetailContent.tsx`.
Data/schema: none.
Acceptance criteria: loading state matches every other page's skeleton tile sizing.
Test cases: static-scan test confirming the file imports and uses `LoadingSkeleton`, not a hand-rolled equivalent.
Priority: B2. Complexity: S.

**B2.3 — Consolidate remaining decade-bucketing reimplementations**
User story: n/a (engineering hygiene, prevents future drift).
Problem: `Math.floor(year/10)*10` logic has reappeared outside `decadeGrouping.ts` in ~6 places since A2.3 (chart data-prep in `_SubdivisionDetailContent.tsx:126-133`, decade filters in `_SubdivisionsContent.tsx`, `HistoricalFactsPanel.tsx`, `_StreetDetailContent.tsx`).
Implementation: extract a shared `decadeKey(year: number | null): string` helper (or reuse `groupByDecade`'s internal key function, exported) from `decadeGrouping.ts`; replace each site's inline formula with a call to it.
Files: `decadeGrouping.ts`, `_SubdivisionDetailContent.tsx`, `_SubdivisionsContent.tsx`, `HistoricalFactsPanel.tsx`, `_StreetDetailContent.tsx`.
Data/schema: none.
Acceptance criteria: zero remaining `Math.floor(*/10)*10` literals outside `decadeGrouping.ts` and the documented `mapConfig.ts`/`formatters.ts` map-legend exception.
Test cases: grep-based static-scan test.
Priority: B2. Complexity: S.

**B2.4 — Extend `sectionOrder.test.ts` coverage gaps**
User story: n/a (engineering hygiene — regression protection).
Problem: no order test exists for the city page, neighborhood detail page, or pin-group page; the chart hex-literal guard only covers 8 of 12 chart files.
Implementation: add order assertions for the 3 untested page types (matching CLAUDE.md's canonical order); add `ConstructionByDecadeChart.tsx`, `NeighborhoodCharts.tsx`, `NeighborhoodPriceChart.tsx`, `PinScopedCharts.tsx` to the existing hex-literal `it.each` list.
Files: `src/lib/sectionOrder.test.ts`.
Data/schema: none.
Acceptance criteria: `npx vitest run` passes with the new assertions; each previously-uncovered file/page now has at least one regression test.
Test cases: the new tests themselves.
Priority: B2. Complexity: S.

**B2.5 — Add `aria-live` to copy-to-clipboard button state changes**
User story: as a screen-reader user, I know when "Copy summary" succeeded.
Problem: the "Copied!" text swap has no `aria-live` region, so the state change is silent to screen readers.
Implementation: wrap the button's status text in a visually-hidden `aria-live="polite"` region, or add the attribute directly to the button's text node.
Files: `app/properties/[pin]/summary/_PropertySummaryContent.tsx` (and any other copy-to-clipboard button found via grep for `navigator.clipboard`).
Data/schema: none.
Acceptance criteria: a screen reader announces "Copied" when the button is activated.
Test cases: manual VoiceOver/NVDA spot check.
Priority: B2. Complexity: S.

**B2.6 — Fix `Breadcrumb.tsx`'s stale "no Block level" doc comment**
User story: n/a (prevents a future editor from "fixing" correct behavior).
Problem: the component's doc comment claims no crumb ever shows a "Block" level; `pinGroups.ts`'s `buildBreadcrumbs` does exactly that for `/pin/[prefix]` pages, correctly.
Implementation: update the comment to note the PIN-hierarchy exception.
Files: `Breadcrumb.tsx`.
Priority: B2. Complexity: S (docs only).

**B3.1 — Expand the admin audit trail to cover higher-risk write paths**
User story: as the admin, destructive or bulk edits are logged, not just the two rarest actions.
Problem: Sprint 5's audit trail logs subdivision merges, boundary edits, and deed notes — the two *rarest* admin actions plus one narrow one — while leaving `updateParcel()`, `deleteSubdivision()` (a hard, irreversible delete), subdivision CRUD, subdivision-linkage writes (the exact surface that's broken production 3 times historically), and bulk neighborhood-assignment actions unlogged.
Implementation: apply the same `logAdminChange()` pattern from `src/lib/adminAudit.ts` to `updateParcel()`, `deleteSubdivision()`, `upsertSubdivisionLink()`/`deleteSubdivisionLink()`, and the bulk neighborhood-assignment actions — prioritize the subdivision-linkage writes first given their history.
Files: `app/admin/_actions/properties.ts`, `app/admin/_actions/subdivisions.ts`, `app/admin/_actions/neighborhoods.ts`.
Data/schema: none (reuses the existing `admin_change_log` table).
Acceptance criteria: a test edit through each newly-instrumented path produces a visible, queryable audit entry.
Test cases: manual test edits per path.
Priority: B3. Complexity: M.

**B3.2 — Delete the dead `subdivisions.parcel_count` column reads/writes**
User story: n/a (engineering hygiene).
Problem: still fetched in 3 places and actively written by `syncParcelCount()`, never rendered anywhere — flagged in the original evaluation, untouched since.
Implementation: remove the 3 `.select()`s that fetch it and the `syncParcelCount()` write path; confirm with the user before dropping the column itself (irreversible) versus just stopping the reads/writes.
Files: `src/lib/supabase/subdivisionQueries.ts`, `app/admin/_actions/properties.ts`.
Data/schema: possibly a column drop, pending user confirmation (irreversible — flag before doing).
Acceptance criteria: `npm run build` passes with zero remaining references; `linked_parcel_count` remains the only parcel-count field read anywhere.
Priority: B3. Complexity: S (app code) / requires confirmation for schema drop.

**B3.3 — Add retention/pagination to `admin_change_log`**
User story: n/a (engineering hygiene — prevents unbounded growth).
Problem: no retention policy exists; the audit-log page hardcodes `.limit(200)` with no pagination.
Implementation: add either a scheduled cleanup (delete rows older than N months) or simple pagination on `/admin/audit-log`; low urgency at current write volume, but no cleanup path exists today.
Files: `app/admin/audit-log/page.tsx`; possibly a new migration for a cleanup function.
Priority: B3. Complexity: S.

**B3.4 — Add teardown-rebuild checks to `data_quality_report`**
User story: as the admin, the data-quality report flags implausible teardown/rebuild data the same way it flags other implausible parcel data.
Problem: the 7-check RPC has no check for `is_teardown_rebuild=true` with a null confidence, or medium/high heuristic disagreement, despite postdating that feature.
Implementation: add an 8th check to `data_quality_report`/`data_quality_summary` following the existing check pattern.
Files: new migration updating `data_quality_report`.
Priority: B3. Complexity: S.

**B3.5 — Route `TeardownBadge` confidence through `confidencePresentation.ts`, or document why not**
User story: n/a (consistency).
Problem: teardown confidence is the 4th independent confidence taxonomy and still doesn't use the shared presentation layer Sprint 3 built for subdivision/historical-fact confidence.
Implementation: either extend `confidencePresentation.ts` to cover teardown confidence's 2-level (medium/high) scale, or add an explicit code comment (matching the one already on `app/sources/page.tsx:59` for property-level confidence) documenting why it's intentionally separate.
Files: `confidencePresentation.ts`, `TeardownBadge.tsx`.
Priority: B3. Complexity: S.

**B3.6 — Remove the dead `neighborhood_id` select in admin properties list**
User story: n/a (cleanup, closes the loop on A1.3).
Problem: `app/admin/properties/page.tsx` still selects the legacy `neighborhood_id` column though it's never rendered.
Implementation: remove it from the `.select()`.
Files: `app/admin/properties/page.tsx`.
Priority: B3. Complexity: S.

**B4.1 — Build a real property-to-property comparison view**
User story: as a buyer or agent, I can pick two or more specific properties (not just same-block neighbors) and see them side by side.
Problem: no comparison view exists beyond the same-block "Nearby homes" list; comparing across streets/subdivisions requires opening separate tabs manually.
Implementation: new route (e.g. `/compare?pins=a,b,c`) reusing `getPropertyDetail()` per PIN and a shared comparison-row component; needs a decision on how properties get added to the comparison (manual PIN entry, or paired with B4.2's watchlist).
Files: new `app/compare/page.tsx` + client content; likely touches `_PropertyDetailContent.tsx`/summary page for an "Add to comparison" affordance.
Data/schema: none required for a URL-param-based approach.
Priority: B4. Complexity: L.

**B4.2 — Add a lightweight session-based compare list / watchlist**
User story: as a buyer, I can build a running list of properties I'm considering without creating an account.
Problem: no favorites/watchlist concept exists anywhere in the app.
Implementation: `localStorage`-backed list (no auth/schema needed), with an "Add to list" affordance on property cards/detail pages and a simple list view; natural pairing with B4.1's comparison view.
Files: new `src/lib/watchlist.ts` (localStorage helper), UI affordances on `EntityCard`/property pages.
Data/schema: none (client-only).
Priority: B4. Complexity: M.

**B4.3 — Add block-scoped, price-aware comparisons**
User story: as a homeowner, I can see how my home compares to this block's recent sales, not just its build year across the whole street/neighborhood/city.
Problem: `loadComparisons()` only ever returns year-built comparisons at street/neighborhood/city scope — never price/assessment, never block-level.
Implementation: compute a block-level median sale price/assessed value from `getPinGroupDetail()`'s already-fetched data (no new query) and add it as an additional comparison sentence via `compareToScope()`.
Files: `app/properties/[pin]/_PropertyDetailContent.tsx`, possibly `src/lib/formatters.ts`'s `compareToScope()`.
Priority: B4. Complexity: M.

**B4.4 — Add explicit sparse-data messaging to the property summary route**
User story: as a user viewing a thin property record's summary, I understand why it's sparse rather than assuming something's broken.
Problem: every section on `/properties/[pin]/summary` degrades silently; there's no "limited data available for this property" message, unlike the rest of the app's `EmptyState` convention.
Implementation: if fewer than N sections have data, render an `EmptyState`-style note explaining the record is thin.
Files: `app/properties/[pin]/summary/_PropertySummaryContent.tsx`.
Priority: B4. Complexity: S.

**B5.1 — Decide the fate of subdivision/street-scoped `historical_facts` columns**
User story: n/a (product decision, not a code task).
Problem: A3.4's migration added `subdivision_id`/`street_name_normalized` columns to `historical_facts` but populated zero rows — schema-only capability that could be mistaken for shipped functionality. It also risks future duplication with `subdivision_timeline_events`, which already covers subdivision-history storytelling.
Implementation: requires a decision from the user — commit to authoring scoped fact content (and reconcile with `subdivision_timeline_events`'s overlapping purpose), or explicitly document this as deferred/exploratory so it isn't mistaken for a finished feature.
Files: none yet — this is a scoping conversation before any implementation.
Priority: B5 (blocked on user decision).
