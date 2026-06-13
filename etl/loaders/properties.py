"""
ETL loader: properties → Supabase properties table.
Reads from enriched GeoJSON and upserts into Supabase.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

from etl.config.sources import (
    ENRICHED_GEOJSON_PATH,
    SUPABASE_BATCH_SIZE,
    LOCAL_ONLY_MODE,
)
from etl.supabase.client import get_supabase_client
from etl.transforms.normalize import normalize_pin
from etl.validators.properties import validate_property_record

logger = logging.getLogger(__name__)


def load_properties_from_geojson(
    geojson_path: str = ENRICHED_GEOJSON_PATH,
    import_run_id: str | None = None,
    dry_run: bool = False,
) -> dict:
    """
    Load properties from the enriched GeoJSON into Supabase.

    Args:
        geojson_path: Path to the enriched GeoJSON file.
        import_run_id: UUID of the data_import_runs record for this run.
        dry_run: If True, validate records but do not write to Supabase.

    Returns:
        dict with keys: total, valid, invalid, upserted, errors
    """
    path = Path(geojson_path)
    if not path.exists():
        raise FileNotFoundError(f"Enriched GeoJSON not found: {geojson_path}")

    logger.info(f"Loading properties from {geojson_path}")

    with open(path) as f:
        geojson = json.load(f)

    features = geojson.get("features", [])
    logger.info(f"Found {len(features)} features in GeoJSON")

    results = {
        "total": len(features),
        "valid": 0,
        "invalid": 0,
        "upserted": 0,
        "skipped_local_only": 0,
        "errors": [],
    }

    valid_records = []
    for feature in features:
        try:
            record = _feature_to_property_record(feature, import_run_id)
            validation_errors = validate_property_record(record)
            if validation_errors:
                results["invalid"] += 1
                results["errors"].append({
                    "pin": record.get("pin"),
                    "errors": validation_errors,
                })
                continue
            valid_records.append(record)
            results["valid"] += 1
        except Exception as e:
            results["invalid"] += 1
            results["errors"].append({"error": str(e)})

    logger.info(f"Valid: {results['valid']}, Invalid: {results['invalid']}")

    if dry_run:
        logger.info("Dry run — not writing to Supabase")
        return results

    if LOCAL_ONLY_MODE:
        logger.warning("LOCAL_ONLY_MODE — Supabase not configured, skipping upsert")
        results["skipped_local_only"] = results["valid"]
        return results

    client = get_supabase_client()
    for batch in _batched(valid_records, SUPABASE_BATCH_SIZE):
        response = client.table("properties").upsert(batch, on_conflict="pin").execute()
        results["upserted"] += len(batch)
        logger.info(f"Upserted batch of {len(batch)} properties")

    return results


def _feature_to_property_record(
    feature: dict,
    import_run_id: str | None,
) -> dict[str, Any]:
    """Convert a GeoJSON feature to a Supabase properties row."""
    props = feature.get("properties", {})
    geometry = feature.get("geometry")

    pin = normalize_pin(
        props.get("pin_normalized") or props.get("pin_original") or ""
    )

    return {
        "pin": pin,
        "pin_formatted": _format_pin(pin),
        "address": props.get("address"),
        "municipality": props.get("municipality", "CITY OF PARK RIDGE"),
        "property_class": props.get("property_class"),
        "year_built": props.get("year_built"),
        "decade_built": props.get("decade_built"),
        "building_sqft": props.get("building_sqft"),
        "land_sqft": props.get("land_sqft"),
        "improvement_count": props.get("improvement_count"),
        "data_quality_flags": props.get("data_quality_flags") or [],
        "source_note": props.get("source_note"),
        "import_run_id": import_run_id,
        "geometry": json.dumps(geometry) if geometry else None,
        "updated_at": datetime.utcnow().isoformat(),
    }


def _format_pin(pin: str) -> str | None:
    """Format a 14-digit PIN as XX-XX-XXX-XXX-XXXX."""
    digits = "".join(c for c in pin if c.isdigit())
    if len(digits) != 14:
        return None
    return f"{digits[0:2]}-{digits[2:4]}-{digits[4:7]}-{digits[7:10]}-{digits[10:14]}"


def _batched(items: list, size: int) -> Iterator[list]:
    for i in range(0, len(items), size):
        yield items[i : i + size]
