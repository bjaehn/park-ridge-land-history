# Property Story Sprint — Follow-up Plan

Written 2026-07-01, alongside the implemented changes from the Property Story
Sprint (see the session summary for what shipped). This covers everything
scoped as **plan-only** — real design decisions, not vague aspirations —
plus the parts of the original brief that were already substantially built
before this sprint started.

## 1. Legal description field taxonomy (Priority 3)

The brief asked for 19 structured fields. Mapping them onto what already
exists:

| Brief field | Current equivalent | Status |
|---|---|---|
| raw_legal_description | `parcels.deed_notes` | Exists |
| lot, block | `property_subdivision_links.lot_number/block_number` | Exists |
| subdivision, canonical_subdivision_id | `property_subdivision_links.subdivision_id` → `subdivisions` | Exists |
| parent_subdivision, parent_subdivision_id | `subdivisions.parent_subdivision_id` | Exists |
| section, township, range, principal_meridian | `historical_subdivision_lineage.section/township/range/meridian` | Exists, but only on lineage records, not every linked property |
| county | `historical_subdivision_lineage.county` | Exists, same caveat |
| recording_document_number | `subdivisions.document_number`, `historical_subdivision_lineage.source_document_number` | Exists |
| recording_date | `subdivisions.recorded_date` | Exists |
| confidence_score | `*.confidence_level` (categorical: high/medium/low/unknown) | Exists as a category, not a numeric score |
| quarter_section | — | **Gap** |
| parse_status, parse_notes | — | **Gap** |
| source_id | `historical_subdivision_lineage.source_id` pattern exists; not on `property_subdivision_links` | Partial gap |

**Real gap:** `quarter_section`, a `parse_status` enum
(`unparsed`/`parsed`/`needs_review`/`rejected`), free-text `parse_notes`, and
a numeric `confidence_score` (0-1) alongside the existing categorical level.

**Why not done this sprint:** the AI deed-analysis pipeline
(`app/admin/_actions/aiDeedAnalysis.ts`) already parses ~12,000 parcels'
worth of `deed_notes` on demand per-property when an admin opens the review
panel. Adding these columns is a small migration. The risk is elsewhere:
retroactively backfilling `parse_status`/`quarter_section` for the ~12,000
parcels that already have `deed_notes` means re-running the AI extraction at
scale, which costs real API spend and needs a review pass before trusting the
output — not something to kick off unattended in the same session as a large
schema/UI change.

**Recommended next sprint:**
1. Add the 4 missing columns via a small migration.
2. Extend `aiDeedAnalysis.ts`'s extraction schema to also return
   `quarter_section` and a 0-1 `confidence_score`.
3. Batch-run it over parcels where `has_deed_notes = true` and
   `parse_status IS NULL`, in controlled batches (e.g. 200 at a time) with a
   human spot-check between batches before continuing.
4. Handle the sprint's other listed edge cases (multiple lots, vacated
   alleys, metes-and-bounds, partial lots) by adding a `parse_status` value
   of `needs_manual_review` and a `legal_description_type` enum
   (`lot_block` / `metes_and_bounds` / `vacated_alley` / `multi_parcel` /
   `exception`) rather than trying to force everything through the
   lot/block model.

## 2. Real block pages (Priority 8)

`app/blocks/[blockId]` currently just redirects to `/pin/[prefix]`, which
already does most of what a block page needs (property grid grouped by
decade, per the pattern in `_PinGroupContent.tsx` that CLAUDE.md documents).
What it's missing, specifically:

- A short narrative ("why does this block look the way it does") synthesized
  from the same verified-facts-only approach used in the property page's
  Why This Matters section — average build year, dominant era, subdivision
  context.
- Nearby comparison blocks (2-3 adjacent PIN-prefix groups with their own
  median year / permit activity, so a block doesn't feel isolated).
- Permit/sales-velocity summary at the block level (the RPCs this needs
  likely already exist in some form given `parcel_year_comparisons` and
  `permit_list` — needs verification, not new plumbing).

**Recommended next sprint:** keep the URL structure as-is
(`/pin/[prefix]`) rather than building a parallel `/blocks/[blockId]` route;
redirect makes sense long-term too, just enrich the destination. Estimated
one focused session: one new RPC for block-level narrative stats, one new
component for the narrative + comparison blocks, inserted into
`_PinGroupContent.tsx` above the existing property grid per CLAUDE.md's
section-order rule.

## 3. Remaining materialized views (Priority 9)

Implemented this sprint: `property_data_quality` (wired into the property
page). Not implemented, because none has a consuming page yet:

- `property_story`, `property_timeline` — would duplicate what
  `getPropertyDetail()` already assembles client-side; only worth building
  if that assembly logic becomes a measured performance problem.
- `property_land_lineage` — `loadLandLineage()` already does this join
  reasonably efficiently; revisit if property page load time becomes an
  issue.
- `subdivision_summary`, `subdivision_history_summary` — largely covered by
  the existing `subdivision_index_view` and `subdivision_property_counts`.
- `block_summary` — build alongside the block page work in section 2 above,
  not before there's a consumer.
- `neighborhood_summary`, `city_summary` — the existing neighborhood/city
  pages already have bespoke RPCs; a generic summary view would be a second
  code path to keep in sync, not a simplification.
- `citation_coverage_summary` — a natural extension of
  `property_data_quality`, aggregated to subdivision/neighborhood level.
  Worth building once the Admin citation-completeness dashboard (section 4)
  is scoped, since that's its first real consumer.

None of the above should be built speculatively — build the consuming page
or RPC caller first, or alongside, per the project's own "no unfinished
architecture" rule.

## 4. Admin editorial CMS (Priority 11)

Shipped this sprint: duplicate-subdivision detection + merge workflow
(`/admin/subdivisions/duplicates`), data quality dashboard
(`/admin/data-quality`). Both are real instances of "Admin as editorial
CMS," not just plans.

Not shipped, and genuinely needs its own sprint:

- **Historical fact approval workflow.** Right now every fact/timeline event
  is inserted directly with a `confidence_level`, and subdivisions have a
  `status` (verified / partially_verified / research_candidate /
  needs_manual_review / deprecated) but there's no UI step where an admin
  flips a subdivision from `research_candidate` to `verified`, or approves an
  individual fact. The status field exists on subdivisions; it doesn't yet
  exist on individual `subdivision_timeline_events` rows. Add a `reviewed`
  boolean + `reviewed_by`/`reviewed_at` to that table, and a review queue
  page filtering to `reviewed = false`.
- **Citation completeness dashboard.** Needs `citation_coverage_summary`
  (section 3) first.
- **Confidence distribution / timeline-gap finder.** Straightforward once
  the fact-level review flag above exists — these are just aggregate queries
  over it.
- **Broken source-link checker.** A scheduled job (see section 5) that
  HEAD-requests every `subdivision_sources.source_url` and
  `property_events.source_url` and flags dead links. Needs a job runner,
  which this project doesn't have yet (see below).

## 5. Deployment reliability (Priority 10)

Shipped this sprint: `/api/health` (DB reachability check) and a build-SHA
footer in Admin (reads `RAILWAY_GIT_COMMIT_SHA`/`VERCEL_GIT_COMMIT_SHA` if
the host sets it — verify Railway actually populates this env var; if not,
it'll need to be set explicitly in the Railway service config).

Not shipped — these are deploy-pipeline changes that deserve their own
sign-off, separate from a UX/data sprint:

- Migration validation gate before deploy (e.g. a CI step that runs
  `supabase db diff` against the target and fails the build on drift).
- Seed validation.
- Nightly database backup verification (requires knowing Railway's current
  backup setup, which wasn't inspected this sprint).
- Data quality report generation as a scheduled job — the script exists now
  (`npm run data:quality-report`), it just isn't wired to a scheduler.
- Environment variable validation at boot.
- Production smoke tests.

This project has no job runner today (no pg_cron, no external cron service
referenced in the codebase). Before building any "nightly" or "scheduled"
item above, the first decision is *what* runs scheduled jobs — Railway cron,
a GitHub Action, or Supabase's pg_cron extension — which is a real
architecture choice that should be made deliberately, not implied by one
bullet in a checklist.

## 6. City / neighborhood story UX (Priority 7)

Both pages already do a lot of what the brief asks (narrative, stat grids,
decade charts, highlight reels, "how Park Ridge was platted" section on the
city page). What's genuinely missing:

- Rail/road/school civic-development narrative — the current pages don't
  connect housing growth to civic infrastructure at all. This needs new
  source material (Park Ridge Historical Society, municipal records), not
  just new UI.
- Historical map gallery — no imagery pipeline exists yet; `docs/georeferencing_historical_imagery.md`
  already has relevant groundwork, worth reading before starting this.
- "Most changed" neighborhood/block ranking — computable now from existing
  permit/sale/teardown signals (`getChangeSignal()` in `formatters.ts`
  already scores this per-property; aggregating it to neighborhood level is
  a small RPC, not a new concept).

## What needs a human decision before continuing

1. **Priority 3 batch reprocessing** (section 1) costs real AI API spend at
   ~12,000-parcel scale — needs a budget/scope decision, not just a green
   light.
2. **Job runner choice** (section 5) is an architecture decision affecting
   every future scheduled feature.
3. **The 3 unresolved subdivision research gaps** from this sprint (Kinsey's
   Park Edge, Kinsey's Talcott Road, Park Ridge Manor) need someone with
   physical or paid access to archives web search can't reach — Cook County
   Recorder plat books, the Park Ridge Historical Society's physical files,
   or a newspapers.com-style paid archive.
