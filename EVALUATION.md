# Park Ridge Land History — Product Evaluation

Full end-to-end evaluation of the live product and codebase, dated 2026-07-08. See `ROADMAP.md` for the 5-sprint execution plan and `BACKLOG.md` for the itemized task list this evaluation produced.

Research basis (all read-only): three parallel deep-dive code audits (page-level UX/content/a11y across every route; the Supabase data model, confidence/source system, and admin workflows; the design-token/component/chart/map consistency layer), plus direct fetches of the live homepage, search, city, neighborhoods index + one detail page, subdivisions index + two detail pages (one populated, one empty), streets index, permits, sources, about, and one real property page. Every finding is anchored to a specific file, line, or live-page observation.

Methodology caveat: live-page fetches used a static HTML/markdown converter, not a real browser, so client-hydrated content (maps, some charts) may have been under-observed on those specific fetches. Those observations are cross-checked against the source code wherever possible and flagged as "live-only" where they aren't.

Calibration note: this is a more mature codebase than a typical pre-launch app. `formatters.ts` documents and fixes real historical bugs (pluralization, "1950ss," grammar). The subdivision 3-source-union bug — which broke production three separate times per project history — is now correctly implemented and verified byte-identical in its canonical RPC and its two inline reimplementations. The `/sources` page is genuinely exceptional. The scores below are harsh where the evidence supports it, not by default.

---

## 1. Executive summary

**Not ready to send to real Park Ridge homeowners, buyers, or agents today — but it is close, and the gap is fixable in one focused sprint, not a rebuild.** Overall score: **5/10** (Overall public launch readiness).

The product has real substance: a genuine confidence/source model, a citation-backed `historical_facts` table, an unusually candid `/sources` page, and admin tooling (research queue, duplicate-merge, data-quality reports) that most solo civic-data projects never build. That is the foundation a trust product needs.

But three categories of defect sit directly in the path of the exact skepticism this evaluation was designed to apply, and they are not nitpicks:

1. **The app contradicts itself about its own data on the two pages designed to build trust.** `/sources` and `/about` say neighborhood boundaries are "approximate... derived from Census tract groupings, not official... boundaries" describing "five area labels." The neighborhood page itself says the exact opposite: "This is an official City of Park Ridge planning district." One of these is stale copy left over from a migration (the model moved to 7 boundaries sourced from the 1996 Comprehensive Plan). A user who reads both pages — which is exactly what a skeptical homeowner or a PhD historian would do — sees the product lying to itself.
2. **A live, user-visible data bug on the flagship page.** On `/properties/[pin]`, the breadcrumb and the in-page "Neighborhood →" link can point to two *different* neighborhoods for the same property, because one reads a stale legacy column and the other reads the current model. This is precisely the kind of thing that makes a real estate agent stop trusting a tool.
3. **A systemic accessibility failure that also reads as sloppiness.** Nine components render section titles as `<p>` instead of `<h2>`, most severely on the PIN/township/section/block page, where all ten sections are headingless to a screen reader, and on the property page itself, which has ~19 `<h2>`s with zero nesting.

None of these require new data, new infrastructure, or a redesign. They are copy fixes, a data-model consolidation that's mostly already built, and a tag swap.

---

## 2. Top 10 global improvements

**1. Fix the systemic heading-hierarchy bug** — `.section-heading` renders as `<p>` in 9 files; the property page's 19 section headings have no `<h2>`/`<h3>` nesting. `HighlightReel.tsx:74,102`; `_PinGroupContent.tsx` (all 10 sections); `_PermitsContent.tsx:490`; `CommunityProfilePanel.tsx:57`; `HistoricalFactsPanel.tsx:208,220`; `SubdivisionHistoryPanel.tsx:248,258`; `_PropertyDetailContent.tsx:682`+15 subsections. Priority: **A1**

**2. Resolve the neighborhood-boundary "official vs. approximate" contradiction** — `/sources`/`/about` describe boundaries as approximate Census-tract groupings ("five area labels"); the neighborhood page calls the same boundaries "official." `NeighborhoodTypePanel.tsx:13-14` vs. `app/sources/page.tsx:39` vs. `app/about/page.tsx:60` vs. `content.ts:40-52` (7 neighborhoods, 1996 Comprehensive Plan). Priority: **A1**

**3. Fix the breadcrumb/in-page neighborhood mismatch and strip unexplained cadastral jargon** — the property breadcrumb derives its neighborhood from a stale legacy column; the page body computes it from the typed-FK model. They can disagree. The breadcrumb also renders raw "Township 09 / Section 0935 / Block 0935416" with no explanation, violating `Breadcrumb.tsx`'s own documented contract ("No 'Block' level ever appears here"). Live example: `901 S Crescent Ave`. Priority: **A1**

**4. Apply "no uncited historical claim" to the homepage and editorial era-labels** — homepage `CITY_NARRATIVE` (1854, George Penny, Pennyville, Brickton, 1873) has zero citation despite the same facts existing properly cited in `historical_facts`. `NEIGHBORHOOD_ERA_LABELS` sentences are self-admitted in code comments as "interpretive, not sourced from the plan" yet render beside a formal `ConfidenceBadge` with no marker of their own. Priority: **A1**

**5. Consolidate the four uncoordinated confidence taxonomies** — property (`formatters.ts`), subdivision (`subdivisionTypes.ts`), historical-fact, and teardown confidence are four independent heuristics; `source_registry.confidence_default` (built to unify them) is read by zero queries. Priority: **A2**

**6. Standardize `PageHeader` usage and enforce canonical section order** — `PageHeader` is bypassed by home, permits, streets index, subdivisions index; subdivision/city/street pages deviate from CLAUDE.md's canonical order (highlight reel before charts on subdivisions; no price-comparison on subdivisions; city page injects an out-of-hierarchy Community Profile panel with no highlight reel). Priority: **A2**

**7. Unify the decade-grouping pattern into one shared component** — the "canonical" file (`_PinGroupContent.tsx:310-352`) doesn't match its own written spec, and 5 other implementations each diverge differently (dot rendering, "Unknown" vs "Unknown era" vs "Date unknown" vs a dead "Date uncertain" check, and the streets index uses a different bucketing granularity while claiming compliance). Priority: **A2**

**8. Unify the chart/badge color palette to design tokens** — Recharts files hardcode Tailwind-default hex (`#a78bfa`, `#0d9488`, `#1e293b`, etc.) that don't match the app's actual tokens; `EraPortraitChart`'s pre-1980 colors have no relationship to the map's `ERA_PALETTE` shown on the same page; `TeardownBadge` bypasses the confidence-token system. Priority: **A2/A3**

**9. Delete dead code and close the legacy-column trap** — a 5,883-line dead alternate stylesheet (`src/styles/global.css`), 3 unused `Sparkline*Card` components, dead `CoverageTable.tsx`/`fetchParcelsInSubdivision()`, and the still-read legacy `parcels.neighborhood_id` column (the direct cause of #3). Priority: **A3**

**10. Build a buyer/agent "listing-ready summary" view** — the raw material (comparison sentences, permit/sale history, source coverage) already exists but is spread across a long page with no shareable, single-screen view. Priority: **A4**

Full problem/evidence/impact/implementation detail for each item is in the approved plan file and is preserved in `BACKLOG.md`'s corresponding task entries.

---

## 3. Scorecard

| # | Category | Score | Priority |
|---|---|---|---|
| 1 | First impression and value proposition | 7/10 | A1 |
| 2 | Search and findability | 7/10 | A3 |
| 3 | Property page usability | 6/10 | A1 |
| 4 | Historical storytelling | 6/10 | A2/A3 |
| 5 | Data quality and accuracy | 6/10 | A1/A2 |
| 6 | Source transparency and citation quality | 7/10 | A1 |
| 7 | UX consistency | 4/10 | A2 |
| 8 | Information architecture | 6/10 | A2 |
| 9 | Visual design | 6/10 | A2/A3 |
| 10 | Mobile usability | 7/10 | A4 |
| 11 | Accessibility | 4/10 | A1 |
| 12 | Performance (not fully assessed) | 6/10 | A3 |
| 13 | Map usefulness | 7/10 | A4 |
| 14 | Chart and data visualization usefulness | 5/10 | A2/A3 |
| 15 | Home buyer usefulness | 7/10 | A2/A4 |
| 16 | Real estate agent usefulness | 6/10 | A2/A4 |
| 17 | Local historian usefulness | 6/10 | A1 |
| 18 | Trust and credibility | 5/10 | A1 |
| 19 | Admin/data workflow readiness | 6/10 | A5 (A2 if editor count grows) |
| 20 | Overall public launch readiness | 5/10 | A1 |

**Selected evidence** (see the approved plan transcript for the full evidence/why/fix writeup per category):

- **UX consistency (4/10)**: `PageHeader` bypassed by 4 pages; 6 mutually-divergent decade-grouping implementations despite one being declared canonical; canonical section order violated on subdivision, city, and street pages; chart color palette disconnected from design tokens on 10+ files.
- **Accessibility (4/10)**: the heading-hierarchy bug is severe and real (the PIN page is entirely headingless to a screen reader), offset by genuinely good compensating patterns (skip-link, `lang="en"`, `aria-expanded`/`aria-label` on all disclosure badges, real alt text with fallbacks, non-color-only signaling).
- **Trust and credibility (5/10)**: the ingredients for trust are real (confidence badges with tooltips, `/sources` candor, `historical_facts` citations) but two concrete contradiction bugs and an uncited homepage narrative sit directly on top of them.

---

## 4. Persona evaluations

Ten personas were evaluated independently: Senior UX expert (5/10), Human factors expert (5/10), FAANG-level product manager (5/10), Data analyst (6/10), Park Ridge home buyer (6/10), Park Ridge homeowner (6/10), PhD historian (5/10), Real estate agent (6/10), Information architect (5/10), Visual/product designer (5/10).

Recurring most-severe concerns across personas:
- The neighborhood-boundary contradiction and the breadcrumb/neighborhood-mismatch bug were independently flagged as the top concern by the home buyer, homeowner, historian, and real estate agent personas.
- Design/IA-focused personas (UX expert, information architect, visual designer) converged on the same root cause: documented "canonical" patterns (decade-grouping, `PageHeader`, `Breadcrumb`'s hierarchy contract, chart color tokens) exist but are not actually enforced, and have drifted in 5-6 different directions across the codebase.
- The FAANG PM and data analyst personas converged on: `source_registry` and `CommunityProfilePanel` are both examples of infrastructure/content built without a clear decision about how it fits into the rest of the product.

The full top-10 improvement list, trust-builder, and rejection-trigger for each of the 10 personas is preserved in the approved plan transcript (`C:\Users\bjaeh\.claude\plans\you-are-claude-code-witty-pine.md`) and summarized into `BACKLOG.md`'s task entries.

---

## 5. Cross-persona conflict analysis

- **Historian (wants full nuance/citation) vs. Home buyer (wants simplicity).** Resolution: keep the plain-language "Why This Matters" narrative as the primary read, with sourcing/uncertainty detail available via the disclosure pattern already used for "Technical details" and legal-description text — extend that same progressive-disclosure pattern to editorial era-labels and citation depth.
- **Data analyst (wants raw precision/full provenance) vs. Real estate agent (wants a fast, usable story).** Resolution: same progressive-disclosure principle — build the agent-facing shareable summary as a *derived* view on top of the precise data, not a simplification that discards it.
- **FAANG PM (wants focus, fewer widgets) vs. Visual designer (wants emotional richness).** Resolution: cut redundancy (the two overlapping ancestry widgets, the four independent decade-grouping implementations) rather than richness (the highlight reel, historical-facts storytelling) — these are separate axes.
- **Information architect (wants one clean hierarchy) vs. the product's actual data model (genuinely has 4 distinct, legitimate geography taxonomies).** Resolution: the taxonomies are legitimate and shouldn't be collapsed; the fix is making the *relationship* between them explicit and visible in-product, not eliminating any of them.
- **Admin/data-quality rigor (wants audit trail, draft/publish staging) vs. solo-operator pace.** Resolution: explicitly deferred to Sprint 5/A5 — appropriate for a single-admin project today, but a hard prerequisite before adding a second editor.

---

## 6. UX consistency audit

- **Page header**: standardize on `PageHeader`; 4 pages bypass it with 3 different ad hoc heading sizes.
- **Decade grouping**: standardize on one `<DecadeGroup>` component; 6 divergent implementations exist today.
- **Card container**: extract a `<Card>` primitive; `bg-surface-card border border-surface-border rounded-lg` is copy-pasted ~30 times.
- **Empty states**: standardize on `<EmptyState>`; streets index hand-rolls a plain div instead.
- **Loading skeletons**: standardize on `<LoadingSkeleton rows={N}>`; subdivision detail page hand-rolls its own with different tile sizing.
- **Confidence-style indicators**: standardize on `<ConfidenceBadge>`; the subdivisions index reimplements a bare dot separately.
- **Badge token usage**: `TeardownBadge` and the subdivision teardown callout use raw Tailwind defaults instead of the `confidence-*`/`accent-amber` tokens `ConfidenceBadge` correctly uses.
- **Chart color theme**: extract one `chartTheme.ts`; 10 Recharts files currently hardcode a mutually-inconsistent palette.
- **Breadcrumb depth rules**: decide once whether index-page crumbs (Streets, Subdivisions, Neighborhoods) always appear or never do; currently inconsistent.
- **Section order enforcement**: extend the existing `sectionOrder.test.ts` (already proven effective at catching the chart-heading regression) to assert full section ordering, not just heading text.

---

## 7. Data quality and accuracy audit

- `source_registry` exists but is unused (`confidence_default` read by zero queries) — aspirational infrastructure, not a live system.
- 4 independent confidence taxonomies (property, subdivision, historical fact, teardown) with different scales/heuristics, all displayed as "High/Medium/Low" without disclosing they mean structurally different things per domain.
- `parcels.neighborhood_id` (superseded 2026-06-22, "Phase 2 never happened") is still read by a live path (`properties.ts`) and causes the breadcrumb/in-page neighborhood mismatch.
- `subdivisions.parcel_count` (legacy, deed-only, GIS-lot-count-based, never refreshed) is still fetched though not rendered — dead query cost, and a landmine for a future page expecting `linked_parcel_count`'s semantics.
- The subdivision 3-source-union pattern (deed links, direct FK, GIS-lot spatial match) is implemented correctly in its canonical RPC and matches exactly in its 2 inline reimplementations — previously broken 3 times per project history, now solid.
- `historical_facts` (source_id → historical_sources, page citation, confidence) is the strongest sourcing implementation in the codebase, but coverage is narrow (city-wide and neighborhood-level facts only).
- `content.ts`'s `CITY_NARRATIVE`, `NEIGHBORHOOD_ERA_LABELS`, and the `south_park` narrative fallback are hardcoded historical/interpretive prose with no citation or confidence marker at their point of display.
- A real 7-check admin data-quality report exists (missing address, duplicate PIN, no subdivision link, no legal description, contradictory year, implausible year, unmatched permit/orphaned sale PIN) — currently admin-only.
- The subdivision "Park Ridge (Resubdivision of Brickton)" (first live index entry) renders with no stat grid, map, price comparison, or property list — likely a legitimate not-yet-linked research entry, but should say so explicitly rather than showing nothing.

---

## 8. Usability audit by journey

- **First visit**: strong value proposition and honest coverage disclaimer; undercut by an uncited founding-history teaser.
- **Searching an address**: strong, flexible search with an excellent 3-tier empty state; "PIN" used with zero inline explanation.
- **Reviewing a property**: strongest page in the product content-wise, undermined by the breadcrumb bug, unexplained jargon, and a flattened heading structure.
- **Understanding history**: excellent where `historical_facts` is populated (city/neighborhood), thin or absent on subdivision/street pages, undermined by the boundary-methodology contradiction.
- **Comparing nearby homes**: no dedicated comparison view exists.
- **Reviewing permits**: functional with an honest 2018+ coverage-gap disclosure; filter UI lacks `<fieldset>` grouping; page bypasses `PageHeader`.
- **Sharing or using findings**: the weakest journey — no export, no shareable summary, no print-friendly view anywhere, despite two of five named personas (buyers, agents) needing exactly this.

---

*See `ROADMAP.md` for the 5-sprint execution plan and `BACKLOG.md` for the full itemized task list (A1.1 through A5.4).*
