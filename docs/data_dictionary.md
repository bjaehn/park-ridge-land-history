# Data Dictionary and Schema Inspection

Run this command after adding raw source files:

```bash
python scripts/inspect_sources.py
```

The script writes detected columns, likely PIN fields, likely year-built fields, row counts, and sample rows here. This placeholder exists so the documentation path is present before source data is downloaded.

## Enriched Parcel Timeline Fields

The public parcel GeoJSON can include these house evolution fields when `data/raw/assessor_permits.csv` is available:

| Field | Meaning |
| --- | --- |
| `permit_count` | Number of direct Cook County Assessor permit rows associated with the parcel PIN. |
| `latest_permit_year` | Most recent direct permit year derived from `date_issued`, falling back to permit year when needed. |
| `nearby_teardown_count` | Number of capped nearby demolition-like permit events added as context. |
| `house_evolution_timeline` | JSON-encoded timeline containing original build, direct permit events, and nearby teardown events. |
| `civic_record_count` | Number of matched Park Ridge public case or design review records. |
| `civic_records_json` | JSON-encoded city file clues, including case number, record type, title, source link, and document link when available. |
| `directory_record_count` | Number of matched city directory, phone book, or local-history address breadcrumbs. |
| `directory_records_json` | JSON-encoded directory clues, including year, resident/listing display text, source, and access note. |
| `sanborn_snapshot_count` | Number of matched Sanborn/fire insurance map references. |
| `sanborn_snapshots_json` | JSON-encoded Sanborn clues, including map year, sheet, interpretation note, source link, document link, and rights note. |

Timeline event descriptions prefer the Assessor Permits `work_description` field because the source documentation identifies it as the canonical description of permitted work.

The optional public-history imports can match by `pin_normalized` when available, or by address when a source artifact does not include parcel identifiers.
