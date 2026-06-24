# Admin Operations Plan

Last inspected: 2026-06-23

## Admin IA

Admin should become the operations center for automated and semi-automated data work.

Primary sections:

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

Existing admin sections for subdivisions, properties, and neighborhoods should remain. The new operations sections should link from the current `/admin` dashboard.

## Job Dashboard Design

User goal: understand whether data pipelines are healthy.

Main screen:

- Latest run by job
- Source status
- Failed jobs
- Stale sources
- Records fetched, parsed, matched, rejected
- Next recommended action

Filters:

- Source
- Job type
- Status
- Run mode
- Date range
- Has errors

Table columns:

- Job
- Source
- Status
- Last started
- Last completed
- Triggered by
- Records fetched
- Matched percent
- Rejected count
- Next action

Detail view:

- Run metadata
- Logs
- Errors
- Warnings
- Output artifact
- Record counts
- Queue items created

Actions:

- Run now
- Retry failed run
- Mark investigated
- Open source
- Open created queue items

Statuses:

- Draft
- Ready
- Running
- Succeeded
- Succeeded with warnings
- Failed
- Paused

Required warnings:

- Running a job can change staged and canonical data.
- Failed jobs may leave partial staging rows.
- Public facts should not update without publish rules.

Acceptance criteria:

- Admin can see latest health for every source.
- Admin can retry a failed job.
- Admin can trace a public fact to a job run.

## Source Registry Admin

User goal: know what each source is, when it was checked, and what it powers.

Main screen:

- Source list with owner, status, authority, freshness, and phase.

Filters:

- Status
- Authority
- Phase
- Access method
- Risk

Table columns:

- Source
- Owner
- Type
- Authority
- Refresh frequency
- Last checked
- Last successful ingestion
- Status
- Risk

Detail view:

- URL or access path
- License notes
- Expected facts
- Matching keys
- Current limitations
- Related jobs
- Related frontend modules

Actions:

- Edit metadata
- Mark needs verification
- Mark verified
- Pause source
- View latest run

Statuses:

- Proposed
- Needs verification
- Verified
- Active
- Paused
- Deprecated
- Failed

Acceptance criteria:

- Every source used by public pages has a registry row.
- Every source shows freshness and limitations.

## Ingestion Jobs Admin

User goal: configure and operate ingestion safely.

Main screen:

- Jobs grouped by source and phase.

Filters:

- Source
- Job type
- Schedule
- Status

Table columns:

- Job key
- Source
- Type
- Schedule
- Status
- Last run
- Last result

Detail view:

- Parameters
- Expected schema
- Matching keys
- Run history
- Queue rules

Actions:

- Run manually
- Disable
- Edit schedule
- Retry latest failed run
- Open logs

Acceptance criteria:

- Admin can run Phase 1 jobs manually.
- No job runs from the browser with public keys.

## Data Quality Queues

User goal: resolve ambiguity before it becomes a public claim.

Main screen:

- Queue summary by type, status, and severity.

Filters:

- Queue type
- Status
- Severity
- Source
- Assigned to
- Entity type

Table columns:

- Type
- Entity
- Source
- Severity
- Status
- Suggested resolution
- Created
- Updated
- Assigned to

Detail view:

- Evidence
- Raw source values
- Normalized values
- Current canonical values
- Match explanation
- Admin notes
- Resolution history

Actions:

- Assign to me
- Approve match
- Reject match
- Merge duplicate
- Hide fact
- Mark needs research
- Defer
- Resolve

Statuses:

- New
- In review
- Needs research
- Auto-resolved
- Resolved
- Deferred
- Rejected

Acceptance criteria:

- Queue item explains why it exists.
- Admin can resolve without touching raw database records.

## Matching Review Workflows

Property matching:

- Review unmatched PINs, duplicate PINs, conflicting geometry, and address mismatches.
- Show candidate parcels, score, match method, and evidence.

Address corrections:

- Review normalized address, raw address, candidate parcel, and confidence.
- Allow setting primary address or alias address.

Subdivision matching:

- Review subdivision name, legal description, lot and block, geometry, and parcel candidates.
- Allow `verified`, `inferred`, `hidden`, or `needs research`.

Neighborhood assignment:

- Review polygon source, centroid match, boundary confidence, and alternate neighborhood labels.
- Allow manual override with source and notes.

Acceptance criteria:

- Every approved match writes a match record with reviewer, time, evidence, and confidence.
- Every rejected match remains auditable.

## Source and Citation Review

User goal: ensure public facts can be traced.

Main screen:

- Facts missing citations
- Facts with weak citations
- Sources needing license review

Actions:

- Add citation label
- Add source URL
- Mark source verified
- Hide fact until cited

Acceptance criteria:

- No public fact lacks a source id.
- No interpreted historical fact publishes without reviewed citation.

## Historical Fact Review

User goal: approve interpretation after source acquisition.

Main screen:

- Extracted or proposed historical facts with source, entity, confidence, and claim text.

Actions:

- Approve as verified
- Approve as inferred
- Request research
- Hide
- Reject

Warnings:

- Map evidence is observation evidence, not proof of construction date.
- OCR facts require human review.

Acceptance criteria:

- No historical claim is public until reviewed.

## User Feedback Review

User goal: turn user corrections into trackable work.

Actions:

- Link to property or source fact
- Convert to queue item
- Request more detail
- Mark resolved
- Reject

Acceptance criteria:

- User feedback never edits public facts directly.
- Admin can trace a correction to a resolution.

## Publish Readiness Dashboard

User goal: know what can safely go public.

Main screen:

- Facts ready to publish
- Facts blocked by missing source
- Facts blocked by low confidence
- Facts blocked by review
- Sources stale or failed

Actions:

- Publish selected facts
- Hide selected facts
- Open blocking queue
- Export readiness report

Acceptance criteria:

- Admin can see why a fact is not public.
- Public pages consume only publish-ready facts.

## Coverage Dashboard

User goal: measure data completeness.

Metrics:

- Parcel count
- Address coverage
- Year built coverage
- Sales coverage
- Assessment coverage
- Permit coverage
- Parcel geometry coverage
- Subdivision coverage
- Neighborhood coverage
- Zoning coverage
- Lead service coverage
- Historic recognition coverage
- Queue backlog
- Source freshness

Acceptance criteria:

- Coverage can be filtered by source, neighborhood, subdivision, street, and block.

## Admin Statuses

Job statuses: `draft`, `ready`, `running`, `succeeded`, `succeeded_with_warnings`, `failed`, and `paused`.

Match statuses: `matched`, `probable_match`, `ambiguous`, `unmatched`, `conflict`, and `needs_review`.

Review statuses: `unreviewed`, `auto_verified`, `verified`, `inferred`, `hidden`, `rejected`, and `deferred`.

Queue statuses: `new`, `in_review`, `needs_research`, `auto_resolved`, `resolved`, `deferred`, and `rejected`.

## Admin Acceptance Criteria

- Admin write functionality is not public.
- Service role operations run server-side.
- Every job run is visible with counts and logs.
- Every failed job creates a visible admin signal.
- Every queue item has evidence and a resolution path.
- Every public fact can be traced to source, job, and review status.
- Low-confidence and sensitive facts are blocked from automatic publication.
