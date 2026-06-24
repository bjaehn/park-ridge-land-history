# Implementation Phases

Last inspected: 2026-06-23

Use exactly three phases. Stop at the end of each phase and verify before continuing.

## Phase 1: Digital Data Foundation and Admin Operations

Goal: Build the source registry, job tracking, staging model, data quality queues, and initial ingestion roadmap for the most accessible official digital sources.

Sources included:

- Cook County Assessor property characteristics
- Cook County parcel sales
- Cook County assessment history
- Cook County permit data
- Cook County parcels and addresses
- Initial source registry

Data to ingest:

- PIN
- Address
- Municipality
- Township
- Property class
- Year built
- Building square feet
- Land square feet
- Parcel geometry
- Sales
- Assessments
- Appeals
- Permits
- Source metadata

Supabase changes:

- Add `data_sources`.
- Add `ingestion_jobs`.
- Add `ingestion_job_runs`.
- Add `source_artifacts`.
- Add `raw_source_records`.
- Add `normalized_source_records`.
- Add `entity_matches`.
- Add `source_facts`.
- Add `data_quality_queue_items`.
- Add `user_feedback`.
- Verify existing `sales`, `permits`, `appeals`, and assessment tables before creating or modifying related canonical tables.
- Add RLS and public verified views.

Admin changes:

- Add Data Sources section.
- Add Ingestion Jobs section.
- Add Job Runs section.
- Add Data Quality Queues section.
- Add source freshness and job status cards to `/admin`.
- Add failed job and unmatched record summaries.

Frontend changes:

- Add property page placeholders that render source-backed facts only when present.
- Add source freshness and confidence display patterns.
- Add public unknown states for missing facts.
- Do not show unreviewed low-confidence facts as verified.

Automation level:

- Manual admin-triggered jobs first.
- Existing local scripts can be refactored into safe script skeletons with job logging.
- Scheduled refresh can be designed but should not be enabled until production permissions are clear.

Manual review level:

- Medium for address and geometry mismatches.
- Medium for permit descriptions.
- Low for assessment facts when clearly labeled.
- Low to medium for sales because non-market transfer caveats matter.

Risks:

- Supabase CLI is not installed on PATH.
- Local migrations may not fully represent remote schema.
- Existing `import_to_supabase.py` uses old Vite env names and anon-key write pattern.
- Broad public read policies should not be copied to operational tables.

Acceptance criteria:

- Phase 1 source registry rows exist.
- Job run tables can record manual job runs.
- Raw and normalized staging preserve source data.
- Queue items are created for unmatched and conflicting records.
- Admin can view sources, jobs, job runs, and queues.
- Public property modules display only source-backed facts.
- Tests, lint, and build pass if available.

QA steps:

- Check RLS on all new tables.
- Verify service role key is server-side only.
- Verify no migration is destructive.
- Run available checks.
- Confirm no em dash characters in changed files.

## Phase 2: Civic, Infrastructure, and Historical Recognition Layers

Goal: Add Park Ridge GIS, zoning, lead service inventory, historic landmarks, 100-year homes, and civic layers.

Sources included:

- Park Ridge GIS layer discovery
- Zoning data
- Lead service inventory
- Historic landmarks
- 100-year homes
- Active projects if available
- Civic layers
- Census and ACS
- FEMA flood map data if verified
- OpenStreetMap for civic context

Data to ingest:

- Zoning district and geometry
- Lead service record
- Historic recognition address and status
- Landmark name and source
- Active project location and status
- Civic geography
- Census city and tract metrics
- Flood zone reference
- OSM parks, civic buildings, trails, stations, and streets

Supabase changes:

- Add or verify `zoning_records`.
- Add `lead_service_records`.
- Add `landmarks`.
- Add `historic_recognitions`.
- Add `civic_layers`.
- Add `civic_layer_features`.
- Add `census_context_records`.
- Add `flood_map_records`.
- Extend `entity_matches` and `source_facts` for geometry-based matching.

Admin changes:

- Add GIS layer discovery workflow.
- Add zoning matching queue.
- Add lead service address matching queue.
- Add historical recognition review queue.
- Add civic layer coverage dashboard.

Frontend changes:

- Add zoning snapshot on property page.
- Add lead service infrastructure card with caveat.
- Add historic recognition badge.
- Add nearby landmarks and civic context.
- Add neighborhood and city civic modules.

Automation level:

- Fully automate source refresh when ArcGIS services are stable and terms allow.
- Require admin approval for initial source activation.
- Require admin review for sensitive or ambiguous matches.

Manual review level:

- Medium for zoning geometry matches.
- Medium to high for lead service address matches.
- Medium for landmark and 100-year home address matches.
- Low to medium for OSM civic context if clearly labeled.

Risks:

- Park Ridge layer endpoints may be hidden behind web maps.
- Terms and licensing need review.
- Lead service context is sensitive.
- Zoning and flood displays can be mistaken for legal conclusions.

Acceptance criteria:

- Park Ridge layer sources are verified before ingestion.
- Civic facts have source and freshness metadata.
- Sensitive facts do not auto-publish without review.
- Property page shows civic modules only when sourced facts exist.

QA steps:

- Validate geometry intersections.
- Review false positive address matches.
- Confirm caveats appear near sensitive facts.
- Verify admin can hide or unpublish civic facts.

## Phase 3: Historical Maps, Planning Documents, Subdivision Genealogy, and Advanced Interpretation

Goal: Add deeper historical context that may require OCR, document parsing, confidence scoring, and admin review before publishing.

Sources included:

- Historical map metadata
- Sanborn map metadata
- Planning documents
- Comprehensive plan references
- Recorded document references
- Subdivision genealogy
- Historical aerial imagery
- Existing HARGIS and recognized history source files

Data to ingest:

- Map title, year, publisher, coverage, sheet number, image or tile link
- Georeference status
- Planning document title, year, page, map references
- Recorded document number, date, type, legal description
- Subdivision parent and child references
- Historical fact candidates

Supabase changes:

- Extend `historical_map_layers`.
- Add `historical_map_sheets` if needed.
- Add `planning_documents`.
- Add `planning_document_facts`.
- Add `recorded_document_references`.
- Extend `historical_subdivision_lineage`.
- Add historical fact review fields to `source_facts`.

Admin changes:

- Add historical fact review.
- Add OCR review queue.
- Add map georeference review.
- Add recorded document interpretation workflow.
- Add source confidence workflow.

Frontend changes:

- Add property map evidence timeline.
- Add city historical map gallery.
- Add subdivision genealogy modules.
- Add planning timeline.
- Add development era stories.

Automation level:

- Automate metadata acquisition where allowed.
- Automate OCR or text extraction only into review queues.
- Do not auto-publish interpreted claims.

Manual review level:

- High for historical maps and Sanborn property claims.
- High for recorded document interpretation.
- High for planning document claims.
- Medium for map metadata.

Risks:

- Licensing and reuse restrictions.
- OCR errors.
- Georeferencing errors.
- Legal descriptions require expertise.
- Map evidence can be misread as construction proof.

Acceptance criteria:

- Historical metadata can be stored without claiming property facts.
- Every historical claim has review status, confidence, and citation.
- Public pages show only reviewed historical claims.
- Admin can reject or hide weak interpretations.

QA steps:

- Verify citation completeness.
- Verify georeferenced coverage alignment.
- Verify no OCR claim is public without review.
- Confirm caveats distinguish observed evidence from proven dates.

## Exact Next Prompt For Codex

Read `data-roadmap.md`, `data-sources.md`, `supabase-data-model-plan.md`, `admin-operations-plan.md`, `frontend-data-display-plan.md`, and `implementation-phases.md`. Implement Phase 1 only. Inspect the repository and live migration patterns again before editing. Create or update Supabase migrations safely using the project's migration workflow. Add source registry tables, ingestion job tables, staging table patterns, data quality queue tables, and RLS. Add admin pages for source registry, job runs, and queues. Add script skeletons for Cook County digital sources that preserve raw data, normalize records, log job runs, and never run automatically. Add frontend placeholders that show source-backed facts only when present. Run available checks. Avoid em dashes in every created or modified file. Stop before Phase 2.
