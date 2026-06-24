# Park Ridge Land History Data Roadmap

Last inspected: 2026-06-23

## Executive Summary

Park Ridge Land History should become "Ancestry.com for Park Ridge, Illinois homes" by treating every public claim as a sourced fact with provenance, confidence, review status, and operational visibility. The first move is not manual property research. It is a digital data foundation: source registry, ingestion job tracking, raw staging, normalized staging, canonical facts, matching records, data quality queues, and admin review screens.

Phase 1 should focus on official Cook County and Cook County Assessor digital sources already reflected in the repo scripts: parcel universe, parcel addresses, parcel geometry, property characteristics, parcel sales, assessed values, appeals, permits, and proximity data. Phase 2 should add Park Ridge civic GIS layers after ArcGIS service discovery. Phase 3 should add historical maps, planning documents, recorded document references, subdivision genealogy, OCR, and interpreted claims that require review.

The frontend should tell stories, not dump rows. Property, block, subdivision, neighborhood, city, and source pages should expose construction era, permit timeline, assessment trend, sales context, civic context, source confidence, unknowns, and caveats. Admin should become the operations center for sources, jobs, failures, unmatched records, review queues, corrections, and publish readiness.

## Current Repo Findings

### Framework and Routing

- The app is a Next.js 14 App Router project using React, TypeScript, Tailwind, MapLibre, Recharts, and lucide-react.
- Public routes include `/`, `/properties/[pin]`, `/streets/[street]`, `/blocks/[blockId]`, `/pin/[prefix]`, `/subdivisions`, `/subdivisions/[id]`, `/neighborhoods`, `/neighborhoods/[slug]`, `/city`, `/sections/[sectionId]`, `/sources`, and `/about`.
- Admin routes include `/admin`, `/admin/login`, `/admin/properties`, `/admin/properties/[pin]`, `/admin/subdivisions`, `/admin/subdivisions/[id]`, `/admin/subdivisions/new`, `/admin/neighborhoods`, `/admin/neighborhoods/[id]`, and `/admin/neighborhoods/new`.
- Admin server actions live in `app/admin/_actions`.

### Supabase Integration

- Public Supabase client: `src/lib/supabase/client.ts`, using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server-side admin client: `src/lib/supabase/adminClient.ts`, using `SUPABASE_SERVICE_ROLE_KEY`.
- Admin pages use the service role server-side. The service role key is not used by frontend code.
- `middleware.ts` protects `/admin` with an `admin_session` cookie signed by `ADMIN_SECRET`.
- `@supabase/supabase-js` is installed at `^2.108.1`.
- `supabase --version` failed because the Supabase CLI is not installed on PATH.

### Schema and Migrations

- Supabase config exists at `supabase/config.toml`, targets Postgres 15, and exposes `public` plus `graphql_public`.
- Migrations use timestamped files under `supabase/migrations`.
- `001_initial_schema.sql` is a stub for schema applied before local migration tracking.
- `parcels` is a denormalized public property summary table with geometry, assessor fields, assessment summaries, sales summaries, permit summaries, civic fields, HARGIS fields, recognized history JSON fields, subdivision fields, neighborhood fields, and public read RLS.
- Local migrations define or extend `subdivisions`, `subdivision_geometries`, `subdivision_lots`, `property_subdivision_links`, `subdivision_sources`, `subdivision_timeline_events`, `historical_land_units`, `historical_map_layers`, `parcel_change_events`, `parcel_lineage_edges`, `parcel_change_sources`, `parcel_addresses`, `subdivision_constituent_lots`, `neighborhoods`, `neighborhood_names`, `neighborhood_boundaries`, and `parcel_neighborhood_links`.
- App code references `sales`, `permits`, `appeals`, `historic_survey_records`, `property_events`, `subdivision_aliases`, and `subdivision_research_tasks`, but local migrations do not define all of these tables. Phase 1 must verify the live schema before creating anything with a similar name.
- Existing RLS often allows broad public read. New operational tables should not copy that pattern.

### Admin, Data Scripts, Search, and Deployment

- Existing admin pages manage subdivisions, properties, and neighborhoods.
- There are no clear existing job, queue, cron, worker, or scheduled ingestion tables.
- `scripts/download_cook_county_live.py` already downloads Cook County Socrata and ArcGIS sources for parcel universe, addresses, improvements, permits, sales, assessed values, appeals, proximity, and parcel geometry.
- `scripts/data_sources.py` is a file-based source registry concept, not a Supabase operations registry.
- `scripts/import_to_supabase.py` posts directly to `parcels` using old `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` names. Phase 1 should replace this pattern with server-side ingestion, logging, and source attribution.
- Property search is implemented in `src/lib/supabase/homeQueries.ts` against `parcels` by address or normalized PIN.
- Deployment assumes Railway, with `npm run build` and `npm start`. Python GIS tooling is local per README.

### Existing Frontend Pages

- Property pages already show identity, PIN breakdown, neighborhood chips, timeline, sales, assessment chart, permits, HARGIS, subdivision ancestry, comparisons, what this means, unknowns, and raw assessor details.
- Street, block, subdivision, neighborhood, city, and source pages already exist and should be expanded rather than replaced.
- `/sources` already explains methodology, sources, confidence, limitations, and privacy.

## Required Analysis Questions

1. Digital sources that can be acquired immediately: Cook County Assessor Socrata datasets already referenced by scripts, Cook County parcel FeatureServer, Census TIGER and Census API, OSM through Overpass or extracts, and FEMA NFHL after endpoint verification.
2. Sources with APIs or structured downloads: Cook County Socrata, Cook County FeatureServer, Census API and TIGER, FEMA NFHL, OSM, and likely Park Ridge ArcGIS layers after service discovery.
3. Sources requiring scraping: Park Ridge web pages for historic recognition, planning pages, and civic notices if no feed or GIS service exists. Scraping needs terms review.
4. Sources requiring ArcGIS discovery: Park Ridge GIS, zoning, lead service inventory, historic landmarks, 100-year homes, active projects, and civic layers.
5. Sources requiring OCR or PDF parsing: planning documents, comprehensive plans, recorded plats, Sanborn maps, historical atlases, and scanned map metadata.
6. Sources matchable by PIN: assessor characteristics, parcel universe, sales, assessed values, appeals, permits, parcel geometry, proximity, and some recorded document indexes if PIN is present.
7. Sources matchable by address: Park Ridge civic layers, landmarks, 100-year homes, lead service inventory, HARGIS, permits without PIN, and user corrections.
8. Sources requiring geometry matching: zoning, parcels, neighborhoods, subdivisions, flood zones, civic layers, historical map coverage, and OSM features.
9. Sources not public without admin review: historical claims, interpreted map evidence, landmark address matches, lead service matches, scraped facts, OCR facts, recorded document interpretations, and low-confidence subdivision assignments.
10. Facts safe to show automatically: official current parcel identity, PIN, address when matched, assessor year built with caveat, lot and building size with caveat, assessment history clearly labeled, sales records clearly labeled, and source freshness.
11. Facts needing caveats: assessment values, year built, permit coverage, sales market status, neighborhood boundaries, zoning, flood references, lead service inventory, and HARGIS spatial matches.
12. Facts needing confidence levels: every match, every interpreted fact, subdivision assignment, neighborhood assignment, historical recognition match, lead service address match, and historical map evidence.
13. Admin-only facts: raw source records, unmatched records, rejected matches, hidden facts, user contact info, job logs with sensitive errors, and unreviewed lead service or historical claims.
14. Minimum viable data pipeline: source registry, job run record, raw artifact, parsed rows, normalized rows, entity matches, canonical facts, queue items, and verified public facts.
15. Minimum viable admin operations center: sources list, job runs list, failed jobs, queue summary, unmatched records, source freshness, and approve or hide fact action.
16. Smallest useful frontend change: source-backed property fact cards that render only when canonical facts exist, with source, confidence, and unknown states.
17. Failure surfacing: job run status, error log, failed source badge, queue item for schema change or ingestion failure, and admin dashboard alert.
18. User corrections: public correction form creates admin-only feedback and a queue item, never direct public fact edits.
19. Source freshness display: last successful ingestion, last checked, refresh frequency, stale status, and limitations.
20. Duplicate avoidance: stable source ids, external ids, row hashes, unique constraints per source and natural key, and canonical fact de-duplication by entity, fact type, value, effective date, and source.

## Data Design Principles

- Preserve raw source data.
- Normalize into canonical tables.
- Attribute every fact to a source.
- Track confidence for every matched or interpreted fact.
- Separate verified facts from inferred facts.
- Separate public facts from admin-only facts.
- Queue anything ambiguous.
- Automate acquisition, not trust.
- Admin approves interpretation.
- The frontend tells stories, not tables.
- Every missing-data state should explain what is missing and why.
- Every ingestion job should be observable.
- Every automated match should be explainable.
- Every source should have freshness metadata.
- Every public claim should be traceable.

## Prioritized Source Inventory

| Source | Availability | Authority | Structure | Matchability | User value | Automation | Review burden | Risk | Phase |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Cook County Assessor property characteristics | 5 | 5 | 5 | 5 | 5 | 5 | 3 | 2 | 1 |
| Cook County parcel sales | 5 | 5 | 5 | 5 | 5 | 5 | 2 | 2 | 1 |
| Cook County assessment history | 5 | 5 | 5 | 5 | 4 | 5 | 1 | 2 | 1 |
| Cook County building permits | 5 | 4 | 4 | 5 | 5 | 5 | 3 | 2 | 1 |
| Cook County parcel geometry and addresses | 5 | 5 | 5 | 5 | 5 | 5 | 3 | 2 | 1 |
| Park Ridge GIS and community portal layers | 3 | 5 | 3 | 3 | 5 | 3 | 3 | 3 | 2 |
| Park Ridge zoning | 3 | 5 | 3 | 4 | 4 | 3 | 2 | 3 | 2 |
| Historic landmarks and 100-year homes | 3 | 4 | 3 | 3 | 5 | 3 | 4 | 3 | 2 |
| Lead service inventory | 3 | 5 | 3 | 3 | 4 | 3 | 4 | 4 | 2 |
| Census and ACS | 5 | 5 | 5 | 2 | 3 | 4 | 2 | 2 | 2 |
| OpenStreetMap | 5 | 3 | 4 | 3 | 3 | 4 | 2 | 2 | 2 |
| FEMA and Illinois flood map data | 4 | 5 | 4 | 4 | 3 | 4 | 3 | 3 | 2 |
| Historical maps and Sanborn maps | 2 | 4 | 2 | 2 | 5 | 2 | 5 | 4 | 3 |
| Park Ridge planning documents | 3 | 5 | 2 | 2 | 4 | 2 | 5 | 3 | 3 |
| Recorded documents and legal descriptions | 2 | 5 | 2 | 4 | 5 | 2 | 5 | 4 | 3 |

Review burden and risk use 5 for high burden or high risk.

## Supabase Schema Plan

Proposed operational tables:

- `data_sources`: source registry and freshness status.
- `ingestion_jobs`: reusable job definitions by source.
- `ingestion_job_runs`: every run, trigger, counts, status, logs, warnings, errors, and artifacts.
- `source_artifacts`: downloaded files, API snapshots, checksums, and retention metadata.
- `raw_source_records`: immutable raw source rows with payload JSONB and optional geometry.
- `normalized_source_records`: parsed rows mapped to canonical fields.
- `entity_matches`: explainable matches between source records and canonical entities.
- `source_facts`: atomic facts with entity, source, value, confidence, review status, visibility, and citation.
- `data_quality_queue_items`: unmatched, ambiguous, conflicting, stale, failed, and correction review items.
- `user_feedback`: public correction submissions linked to queue items.

Canonical strategy:

- Keep `parcels` as the current public property summary table in Phase 1.
- Verify existing `sales`, `permits`, `appeals`, and assessment tables before adding duplicates.
- Extend existing subdivision, neighborhood, and parcel history tables rather than replacing them.
- Add verified public views such as `public_property_facts`, `public_source_status`, and `property_story_modules`.

RLS strategy:

- Enable RLS on every new table.
- Public read only from verified public views or rows with `visibility = 'public'` and `review_status in ('verified','auto_verified')`.
- Raw records, normalized records, job logs, queues, and feedback are admin-only.
- Admin writes stay server-side with service role.
- Do not expose service role keys to frontend code.

## Ingestion Architecture

1. Register source in `data_sources`.
2. Define job in `ingestion_jobs`.
3. Start `ingestion_job_runs` with status `running`.
4. Download raw artifact to durable storage or controlled artifact path.
5. Insert raw rows into `raw_source_records`.
6. Normalize rows into `normalized_source_records`.
7. Match rows to parcels, addresses, subdivisions, neighborhoods, or areas.
8. Write canonical facts and source facts.
9. Create queue items for ambiguous, conflicting, missing, low-confidence, sensitive, or failed records.
10. Publish only facts that satisfy source rules and review status.

## Matching and Entity Resolution Plan

Use statuses: `matched`, `probable_match`, `ambiguous`, `unmatched`, `conflict`, and `needs_review`.

- PIN to property: normalize to 14 digits and match `parcels.pin_normalized`.
- Address to property: normalize street number, name, suffix, unit, and ZIP. Match `parcel_addresses`, then `parcels.address`.
- Parcel geometry to property: match by PIN first, then centroid and overlap when PIN is absent.
- Permit, sale, and assessment to property: PIN first, address fallback only if PIN is absent.
- Zoning geometry to property: spatial intersection with parcel centroid and overlap percent.
- Landmark and 100-year home to property: address match plus optional distance check.
- Lead service to property: address match, then queue if sensitive or ambiguous.
- Historical map coverage to area: map bounding polygon to property, block, subdivision, or neighborhood.
- Subdivision name to subdivision: normalized name, aliases, lot and block references, parent tract, and geometry.
- Neighborhood polygon to property: centroid within current boundary, with boundary confidence.

Use 0 to 100 confidence internally and labels `high`, `medium`, `low`, and `unknown` in UI.

## Data Quality Queues Plan

Queue types:

- Missing address
- No address found
- Unmatched PIN
- Duplicate PIN
- Duplicate address
- Conflicting year built
- Conflicting square footage
- Conflicting sale history
- Conflicting geometry
- Missing subdivision
- Low-confidence subdivision match
- Missing neighborhood
- Low-confidence neighborhood match
- Landmark address unmatched
- Lead service address unmatched
- Permit unmatched
- Source missing citation
- Historical claim needs review
- Data source changed schema
- Ingestion job failed
- User correction submitted

Queue fields:

- Queue item id
- Queue type
- Related entity
- Source
- Severity
- Status
- Assigned to
- Created at
- Updated at
- Suggested resolution
- Evidence
- Admin notes
- Resolution
- Resolved at

Statuses: `new`, `in_review`, `needs_research`, `auto_resolved`, `resolved`, `deferred`, and `rejected`.

## Admin Plan

Admin sections:

1. Data Sources
2. Ingestion Jobs
3. Job Runs
4. Data Quality Queues
5. Property Matching
6. Address Corrections
7. Subdivision Matching
8. Neighborhood Assignment
9. Historical Facts Review
10. Source and Citation Review
11. User Feedback
12. Publish Readiness
13. Data Coverage Dashboard
14. Error Logs
15. Refresh Schedule

Core actions:

- Run an ingestion job manually.
- View scheduled jobs.
- Retry failed jobs.
- View job logs.
- See source freshness.
- See coverage by source.
- Review unmatched records.
- Approve or reject matches.
- Mark facts as verified, inferred, or hidden.
- Publish or hide facts.
- Review user corrections.
- Track completion progress.

## Frontend Display Plan

Property page modules:

- Property identity
- Address confidence
- Parcel facts
- Construction era
- Building and lot comparison
- Sale timeline
- Assessment trend
- Permit timeline
- Zoning snapshot
- Historic recognition
- Lead service record if available
- Related subdivision
- Related neighborhood
- Related block or street
- Source confidence panel
- What this means summary
- Caveats and unknowns

Block or street page modules:

- Homes by decade
- Typical year built
- Typical lot size
- Typical home size
- Permit activity
- Sales turnover
- Oldest and newest homes
- Similar homes
- Landmark or 100-year homes nearby
- How this block developed
- Data coverage and caveats

Subdivision, neighborhood, city, and data source pages should expand existing patterns with source-backed story modules, confidence, caveats, and unknown states.

## Automation Plan

Use the existing stack first:

- Local scripts for initial imports and backfills.
- Server-side Next.js admin actions for manual job triggers.
- Supabase tables for job state, logs, source registry, and queue items.
- Supabase Storage or controlled artifact paths for raw files.
- Railway cron only if current deployment supports it after verification.
- GitHub Actions only for safe metadata checks or scheduled source health checks unless production-write secrets and audit controls are approved.
- Supabase Edge Functions or scheduled jobs only after CLI and project capabilities are verified.

Automate acquisition and parsing now. Require admin review for interpretation, low-confidence matches, sensitive infrastructure, and historical claims.

## Risk and Privacy Review

- Do not publish owner names.
- Treat lead service inventory as sensitive infrastructure context.
- Treat flood data as a map reference, not insurance or risk advice.
- Treat assessment data as tax assessment context, not appraisal.
- Avoid scraping without terms review.
- Keep raw records and logs admin-only.
- Do not expose service role keys.
- Do not publish unreviewed historical interpretations.
- Add source freshness and caveats to every public module.

## Three-Phase Roadmap

- Phase 1: Digital Data Foundation and Admin Operations.
- Phase 2: Civic, Infrastructure, and Historical Recognition Layers.
- Phase 3: Historical Maps, Planning Documents, Subdivision Genealogy, and Advanced Interpretation.

## Acceptance Criteria

- All requested planning files exist.
- Current repo findings are documented before proposed changes.
- Phase 1 is implementable by the next Codex run.
- Supabase plan includes RLS, public versus admin access, staging, attribution, and confidence.
- Admin plan covers jobs, queues, source registry, review workflows, coverage, and publish readiness.
- Frontend plan avoids raw data dumps.
- Automation plan separates acquisition from trust.
- No destructive database operation is proposed or run.
- No created or modified file contains an em dash.

## QA Plan

- Verify no em dash characters in created files.
- Verify requested file names exist.
- Verify repo findings match inspected files.
- Run `git status --short` after file creation.
- Do not run migrations.
- Do not import data.
- Do not edit existing dirty `roadmap.md`.

## Open Questions

- Is the live Supabase schema ahead of local migrations for `sales`, `permits`, `appeals`, and `historic_survey_records`?
- Should operational tables live in `public` with strict RLS or in a private schema with selected public views?
- Should raw artifacts be stored in Supabase Storage, repo-local `data/raw`, Railway volume storage, or another durable store?
- Which Park Ridge ArcGIS layers are officially exportable and licensed for reuse?
- What admin identity model should replace the current single `ADMIN_SECRET` cookie as operations grow?
- What public correction channel should be used before user accounts exist?
