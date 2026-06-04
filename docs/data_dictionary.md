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

Timeline event descriptions prefer the Assessor Permits `work_description` field because the source documentation identifies it as the canonical description of permitted work.
