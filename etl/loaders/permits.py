"""
ETL loader: permits → Supabase permits table.
Reads from the enriched GeoJSON permit timelines (no sample limits).
"""

import json
import logging
from pathlib import Path
from typing import Any, Iterator

from etl.config.sources import (
    ENRICHED_GEOJSON_PATH,
    SUPABASE_BATCH_SIZE,
    LOCAL_ONLY_MODE,
    DEMOLITION_KEYWORDS,
    NEW_CONSTRUCTION_KEYWORDS,
    ADDITION_KEYWORDS,
    REMODEL_KEYWORDS,
)
from etl.supabase.client import get_supabase_client
from etl.transforms.normalize import normalize_pin

logger = logging.getLogger(__name__)


def classify_permit_type(description: str | None) -> str:
    """Classify a permit by its description text."""
    if not description:
        return "other"
    desc_lower = description.lower()
    if any(kw in desc_lower for kw in DEMOLITION_KEYWORDS):
        return "demolition"
    if any(kw in desc_lower for kw in NEW_CONSTRUCTION_KEYWORDS):
        return "new_construction"
    if any(kw in desc_lower for kw in ADDITION_KEYWORDS):
        return "addition"
    if any(kw in desc_lower for kw in REMODEL_KEYWORDS):
        return "remodel"
    return "other"


def load_permits_from_geojson(
    geojson_path: str = ENRICHED_GEOJSON_PATH,
    import_run_id: str | None = None,
    dry_run: bool = False,
) -> dict:
    """
    Extract all permit events from enriched GeoJSON and load into Supabase.

    NOTE: This processes ALL permits from ALL parcels — no sample limits.
    If you see any --limit-pins or row caps, remove them before running.
    """
    path = Path(geojson_path)
    if not path.exists():
        raise FileNotFoundError(f"Enriched GeoJSON not found: {geojson_path}")

    with open(path) as f:
        geojson = json.load(f)

    features = geojson.get("features", [])
    logger.info(f"Extracting permits from {len(features)} parcels")

    permit_records: list[dict[str, Any]] = []
    skipped = 0

    for feature in features:
        props = feature.get("properties", {})
        pin = normalize_pin(props.get("pin_normalized") or props.get("pin_original") or "")
        if not pin:
            skipped += 1
            continue

        timeline_raw = props.get("house_evolution_timeline")
        if isinstance(timeline_raw, str):
            try:
                timeline = json.loads(timeline_raw)
            except (json.JSONDecodeError, TypeError):
                timeline = []
        elif isinstance(timeline_raw, list):
            timeline = timeline_raw
        else:
            timeline = []

        for event in timeline:
            if event.get("event_type") != "permit":
                continue
            permit_records.append({
                "pin": pin,
                "permit_number": event.get("permit_number"),
                "local_permit_number": event.get("local_permit_number"),
                "permit_type": classify_permit_type(event.get("description")),
                "description": event.get("description"),
                "status": event.get("status"),
                "date_issued": event.get("date") or (str(event["year"]) if event.get("year") else None),
                "estimated_completion": event.get("estimated_completion_date"),
                "job_code": event.get("job_code"),
                "assessable": event.get("assessable"),
                "municipality": event.get("municipality"),
                "source_id": "cook-county-assessor-permits",
                "import_run_id": import_run_id,
                "raw_record": json.dumps(event),
            })

    logger.info(f"Extracted {len(permit_records)} permit records ({skipped} parcels skipped)")

    results = {
        "total_parcels": len(features),
        "total_permits": len(permit_records),
        "skipped_parcels": skipped,
        "upserted": 0,
        "errors": [],
    }

    if dry_run:
        logger.info("Dry run — not writing to Supabase")
        return results

    if LOCAL_ONLY_MODE:
        logger.warning("LOCAL_ONLY_MODE — Supabase not configured")
        return results

    client = get_supabase_client()
    for batch in _batched(permit_records, SUPABASE_BATCH_SIZE):
        client.table("permits").upsert(batch).execute()
        results["upserted"] += len(batch)

    logger.info(f"Upserted {results['upserted']} permits")
    return results


def _batched(items: list, size: int) -> Iterator[list]:
    for i in range(0, len(items), size):
        yield items[i : i + size]
