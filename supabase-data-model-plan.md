# Supabase Data Model and Migration Plan

Last inspected: 2026-06-23

## Existing Schema Observations

- Supabase config exists at `supabase/config.toml` with Postgres 15 and public API enabled for `public` and `graphql_public`.
- Supabase CLI is not available on PATH in this environment.
- Migration files use timestamped names under `supabase/migrations`.
- `001_initial_schema.sql` is a stub for remote schema that predates local migration tracking.
- `parcels` is the current property summary table and includes denormalized assessor, permit, sale, appeal, proximity, civic, HARGIS, recognized history, subdivision, neighborhood, and geometry fields.
- Subdivision and parcel history tables already exist in local migrations.
- App code references `sales`, `permits`, `appeals`, `historic_survey_records`, `property_events`, `subdivision_aliases`, and `subdivision_research_tasks`, but local migrations do not define all of them. The next implementation must verify the remote schema before adding or modifying those names.
- Many existing tables have public read RLS. New operational tables should be admin-only unless a curated public view is created.

## Proposed New Tables

### `data_sources`

Purpose: source registry and freshness metadata.

Key columns: `id`, `source_key`, `name`, `owner`, `source_url`, `source_type`, `authority_level`, `license_notes`, `refresh_frequency`, `access_method`, `format`, `matching_keys`, `expected_facts`, `last_checked_at`, `last_successful_ingestion_at`, `status`, `risk_notes`, `admin_notes`, `created_at`, and `updated_at`.

### `ingestion_jobs`

Purpose: reusable job definitions.

Key columns: `id`, `source_id`, `job_key`, `job_type`, `status`, `schedule`, `run_mode`, `default_params`, `expected_schema`, `created_at`, and `updated_at`.

### `ingestion_job_runs`

Purpose: audit every job run.

Key columns: `id`, `job_id`, `source_id`, `status`, `started_at`, `completed_at`, `triggered_by`, `run_mode`, `records_fetched`, `records_parsed`, `records_matched`, `records_inserted`, `records_updated`, `records_rejected`, `errors`, `warnings`, `output_artifact_path`, `logs`, and `next_recommended_action`.

### `source_artifacts`

Purpose: downloaded files, API snapshots, and generated outputs.

Key columns: `id`, `source_id`, `job_run_id`, `artifact_type`, `path`, `content_type`, `sha256`, `record_count`, `created_at`, and `retention_status`.

### `raw_source_records`

Purpose: preserve original source rows.

Key columns: `id`, `source_id`, `job_run_id`, `external_id`, `source_record_hash`, `raw_payload`, `raw_geometry`, and `ingested_at`.

Unique constraint: `(source_id, source_record_hash)`.

### `normalized_source_records`

Purpose: parsed staging rows.

Key columns: `id`, `raw_record_id`, `source_id`, `job_run_id`, `record_type`, `normalized_payload`, `normalized_pin`, `normalized_address`, `normalized_geometry`, `parse_status`, `validation_errors`, and `created_at`.

### `entity_matches`

Purpose: explainable matching records.

Key columns: `id`, `normalized_record_id`, `source_id`, `entity_type`, `entity_id`, `match_method`, `match_status`, `confidence_score`, `confidence_level`, `explanation`, `review_status`, `reviewed_by`, `reviewed_at`, and `created_at`.

### `source_facts`

Purpose: atomic source-backed facts.

Key columns: `id`, `source_id`, `raw_record_id`, `normalized_record_id`, `entity_type`, `entity_id`, `fact_type`, `fact_value`, `fact_label`, `effective_date`, `effective_year`, `date_precision`, `confidence_score`, `confidence_level`, `review_status`, `visibility`, `citation`, `created_at`, and `updated_at`.

### `data_quality_queue_items`

Purpose: admin review workflow.

Key columns: `id`, `queue_type`, `related_entity_type`, `related_entity_id`, `source_id`, `job_run_id`, `severity`, `status`, `assigned_to`, `suggested_resolution`, `evidence`, `admin_notes`, `resolution`, `resolved_at`, `created_at`, and `updated_at`.

### `user_feedback`

Purpose: public corrections and feedback.

Key columns: `id`, `related_entity_type`, `related_entity_id`, `feedback_type`, `message`, `submitter_email`, `status`, `queue_item_id`, `created_at`, and `updated_at`.

## Proposed Table Modifications

Do these only after live schema verification:

- Add source attribution, confidence, review, and visibility fields to `sales`, `permits`, `appeals`, and assessment tables if they exist.
- Add `primary_source_fact_id`, `address_confidence_score`, and `address_review_status` to `parcel_addresses` if needed.
- Add `source_id`, `review_status`, `visibility`, and `confidence_score` to civic or historical recognition tables.
- Keep `parcels` as a summary table, but start deriving selected fields from canonical facts rather than writing all data directly to `parcels`.

## Proposed Indexes

- `data_sources(source_key)`
- `ingestion_jobs(source_id, status)`
- `ingestion_job_runs(job_id, started_at desc)`
- `ingestion_job_runs(source_id, status)`
- `raw_source_records(source_id, external_id)`
- `raw_source_records(source_id, source_record_hash)`
- `normalized_source_records(source_id, normalized_pin)`
- `normalized_source_records(source_id, normalized_address)`
- GIST indexes on geometry fields
- `entity_matches(entity_type, entity_id)`
- `entity_matches(match_status, review_status)`
- `source_facts(entity_type, entity_id, fact_type)`
- `source_facts(review_status, visibility)`
- `data_quality_queue_items(queue_type, status, severity)`
- `user_feedback(status, created_at desc)`

## Proposed Views

- `public_property_facts`: only public, verified or auto-verified property facts.
- `public_source_status`: source name, authority, refresh frequency, last success, status, and limitations.
- `admin_source_coverage`: coverage counts by source, entity, and match status.
- `admin_queue_summary`: queue counts by type, status, and severity.
- `admin_job_run_summary`: latest job run status by source and job.
- `property_story_modules`: property facts grouped into frontend modules.

Use `security_invoker = true` for views where supported, or keep sensitive views in a private schema and grant access intentionally.

## RLS Approach

- Enable RLS on every new table.
- Public read policies should exist only for curated public tables or views.
- Admin-only tables should have no anon or authenticated read policy.
- Service role writes should remain server-side only.
- Public facts require `visibility = 'public'` and `review_status in ('verified','auto_verified')`.
- Raw records, normalized records, job logs, queue items, and user feedback are admin-only.

## Public Versus Admin Access Model

Public:

- Read verified fact views.
- Read public source status.
- Submit correction feedback through a server action or route handler that creates `user_feedback` and a queue item.

Admin:

- Read raw and normalized records.
- Run jobs and retry failed runs.
- Approve, reject, hide, or publish facts.
- Resolve data quality queues.
- See logs, errors, and source coverage.

## Staging Versus Canonical Strategy

- Raw staging preserves exact payloads and geometry.
- Normalized staging maps source fields into app field names and validates types.
- Canonical tables store one stable app representation per entity or event.
- `source_facts` stores atomic facts and attribution even when canonical tables have summary columns.
- Summary fields in `parcels` are allowed for performance, but they should be traceable to source facts.

## Source Attribution Strategy

Every canonical row or source fact should identify source id, raw record id when available, job run id when available, citation label, source URL or access path, retrieval date, effective date or year, confidence level, and review status.

## Confidence Scoring Strategy

Use a 0 to 100 score and a label:

- 90 to 100: high
- 60 to 89: medium
- 1 to 59: low
- 0 or null: unknown

Scoring inputs include match type, geometry overlap, source authority, source freshness, field completeness, conflicts, and manual review.

## Data Quality Queue Strategy

Queue anything that is ambiguous, missing, conflicting, stale, sensitive, or interpreted. Queue item statuses should be `new`, `in_review`, `needs_research`, `auto_resolved`, `resolved`, `deferred`, and `rejected`.

## Migration Sequence

1. Verify Supabase CLI availability. If unavailable, install or ask the user to provide it.
2. Run schema inspection against local or remote Supabase.
3. Create migration with the project workflow, using `supabase migration new <descriptive_name>`.
4. Create source registry, job, artifact, raw staging, normalized staging, match, fact, queue, and feedback tables.
5. Enable RLS on all new tables.
6. Add admin-only policies and public verified views.
7. Add seed rows for Phase 1 sources only if approved.
8. Add query helpers and admin UI.
9. Run tests, lint, build, and available Supabase checks.

## Rollback Considerations

- Avoid destructive rewrites of `parcels`.
- Add nullable columns first, backfill second, enforce constraints later.
- Keep raw records immutable so ingestion can be replayed.
- Disable jobs and hide views before deleting data.
- Never delete source artifacts until replacement runs are verified.
