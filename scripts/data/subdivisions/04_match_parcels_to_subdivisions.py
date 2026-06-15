"""Script 04: Match Park Ridge parcels to subdivisions with confidence scoring.

Reads:
  data/interim/subdivisions/subdivision_candidates.json   (from script 03)
  data/interim/subdivisions/subdivision_name_index.json   (from script 03)
  data/processed/park_ridge_parcels_enriched.geojson       (or raw parcel data)

Produces:
  data/interim/subdivisions/subdivision_records.json      – subdivision records ready for import
  data/interim/subdivisions/parcel_subdivision_links.json – one record per parcel-to-subdivision link
  data/interim/subdivisions/unmatched_parcels.json        – parcels with no subdivision match

Usage:
  python -m scripts.data.subdivisions.04_match_parcels_to_subdivisions
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from scripts.data_sources import PROJECT_ROOT
from scripts.data.subdivisions.normalize import normalize_subdivision_name, display_name, rough_similarity
from scripts.data.subdivisions.confidence import (
    confidence_for_method,
    reason_for_method,
    rank_confidence,
)

INTERIM_DIR = PROJECT_ROOT / "data/interim/subdivisions"
PROCESSED_DIR = PROJECT_ROOT / "data/processed"
RAW_DIR = PROJECT_ROOT / "data/raw"

CANDIDATES_PATH = INTERIM_DIR / "subdivision_candidates.json"
NAME_INDEX_PATH = INTERIM_DIR / "subdivision_name_index.json"
PARCEL_PATH = PROCESSED_DIR / "park_ridge_parcels_enriched.geojson"

FUZZY_MATCH_THRESHOLD = 0.75


def main() -> None:
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)

    print("=== Matching Parcels to Subdivisions ===\n")

    if not CANDIDATES_PATH.exists():
        print("Subdivision candidates not found. Run script 03 first.")
        return

    with CANDIDATES_PATH.open(encoding="utf-8") as f:
        candidates: list[dict[str, Any]] = json.load(f)

    with NAME_INDEX_PATH.open(encoding="utf-8") as f:
        name_index: dict[str, Any] = json.load(f)

    print(f"Loaded {len(candidates)} candidates, {len(name_index)} unique subdivision names.")

    # Build per-PIN candidate lookup
    pin_candidates = build_pin_candidate_lookup(candidates)
    print(f"Candidates cover {len(pin_candidates)} unique PINs.")

    # Build subdivision records
    subdivision_records = build_subdivision_records(name_index)
    print(f"Created {len(subdivision_records)} subdivision records.")

    # Match parcels
    if PARCEL_PATH.exists():
        parcel_links, unmatched = match_parcel_geojson(
            PARCEL_PATH, pin_candidates, subdivision_records
        )
    else:
        print(f"Enriched parcel file not found at {PARCEL_PATH.relative_to(PROJECT_ROOT)}.")
        print("Generating links from candidates only (no full parcel GeoJSON).")
        parcel_links, unmatched = match_from_candidates_only(pin_candidates, subdivision_records)

    # Update subdivision parcel counts
    for link in parcel_links:
        sid = link.get("subdivision_id")
        if sid and sid in subdivision_records:
            subdivision_records[sid]["parcel_count"] = (
                subdivision_records[sid].get("parcel_count") or 0
            ) + 1

    print(f"\nMatches: {len(parcel_links)} parcel-subdivision links")
    print(f"Unmatched: {len(unmatched)} parcels with no subdivision match")

    # Save outputs
    records_list = list(subdivision_records.values())
    records_path = INTERIM_DIR / "subdivision_records.json"
    links_path = INTERIM_DIR / "parcel_subdivision_links.json"
    unmatched_path = INTERIM_DIR / "unmatched_parcels.json"

    records_path.write_text(json.dumps(records_list, indent=2, ensure_ascii=False), encoding="utf-8")
    links_path.write_text(json.dumps(parcel_links, indent=2, ensure_ascii=False), encoding="utf-8")
    unmatched_path.write_text(json.dumps(unmatched, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\nWrote {records_path.relative_to(PROJECT_ROOT)}")
    print(f"Wrote {links_path.relative_to(PROJECT_ROOT)}")
    print(f"Wrote {unmatched_path.relative_to(PROJECT_ROOT)}")

    # Summary
    print_confidence_summary(parcel_links)
    print("\nNEXT STEP: Run 05_load_to_supabase.py")


def build_pin_candidate_lookup(candidates: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    lookup: dict[str, list[dict[str, Any]]] = {}
    for candidate in candidates:
        pin = (candidate.get("pin") or "").strip()
        if pin:
            lookup.setdefault(pin, []).append(candidate)
    return lookup


def build_subdivision_records(name_index: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Create subdivision table records from the name index. Each gets a stable UUID."""
    records: dict[str, dict[str, Any]] = {}
    for normalized_name, entry in name_index.items():
        record_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"park-ridge-subdivision:{normalized_name}"))
        records[record_id] = {
            "id": record_id,
            "name": entry.get("display_name") or display_name(normalized_name),
            "normalized_name": normalized_name,
            "alternate_names": [],
            "recorded_date": None,
            "recorded_year": None,
            "plat_book": None,
            "plat_page": None,
            "document_number": None,
            "original_owner": None,
            "developer": None,
            "surveyor": None,
            "source_name": ", ".join(entry.get("sources", [])) or None,
            "source_reference": ", ".join(entry.get("source_references", [])[:5]) or None,
            "source_url": entry.get("source_urls", [None])[0] if entry.get("source_urls") else None,
            "confidence_level": entry.get("confidence_level", "unknown"),
            "confidence_reason": reason_for_method(entry.get("best_match_method", "no_match")),
            "notes": " ".join(entry.get("notes", [])[:2]) or None,
            "parcel_count": 0,
        }
    return records


def match_parcel_geojson(
    parcel_path: Path,
    pin_candidates: dict[str, list[dict[str, Any]]],
    subdivision_records: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    with parcel_path.open(encoding="utf-8") as f:
        geojson = json.load(f)

    links: list[dict[str, Any]] = []
    unmatched: list[dict[str, Any]] = []

    # Build name→record_id lookup for fuzzy matching
    name_to_id: dict[str, str] = {r["normalized_name"]: r["id"] for r in subdivision_records.values()}

    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        pin = props.get("pin_normalized") or props.get("pin_original") or props.get("name")
        if not pin:
            continue
        pin = str(pin).strip()

        candidates = pin_candidates.get(pin, [])
        if not candidates:
            unmatched.append({"pin": pin, "address": props.get("address")})
            continue

        # Pick best candidate for this PIN (highest confidence)
        best = max(candidates, key=lambda c: rank_confidence(c.get("confidence_level", "unknown")))
        normalized = best.get("normalized_name")
        sub_id = name_to_id.get(normalized) if normalized else None

        if not sub_id:
            unmatched.append({"pin": pin, "address": props.get("address")})
            continue

        links.append({
            "pin": pin,
            "address": props.get("address"),
            "subdivision_id": sub_id,
            "lot_number": best.get("lot_number"),
            "block_number": best.get("block_number"),
            "match_method": best.get("match_method", "parcel_gis_attribute"),
            "confidence_level": best.get("confidence_level", "unknown"),
            "confidence_reason": reason_for_method(best.get("match_method", "no_match")),
            "source_name": best.get("source"),
            "source_reference": best.get("source_reference"),
        })

    return links, unmatched


def match_from_candidates_only(
    pin_candidates: dict[str, list[dict[str, Any]]],
    subdivision_records: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    links: list[dict[str, Any]] = []
    unmatched: list[dict[str, Any]] = []
    name_to_id: dict[str, str] = {r["normalized_name"]: r["id"] for r in subdivision_records.values()}

    for pin, candidates in pin_candidates.items():
        if not candidates:
            unmatched.append({"pin": pin})
            continue

        best = max(candidates, key=lambda c: rank_confidence(c.get("confidence_level", "unknown")))
        normalized = best.get("normalized_name")
        sub_id = name_to_id.get(normalized) if normalized else None

        if not sub_id:
            unmatched.append({"pin": pin})
            continue

        links.append({
            "pin": pin,
            "address": best.get("address"),
            "subdivision_id": sub_id,
            "lot_number": best.get("lot_number"),
            "block_number": best.get("block_number"),
            "match_method": best.get("match_method", "parcel_gis_attribute"),
            "confidence_level": best.get("confidence_level", "unknown"),
            "confidence_reason": reason_for_method(best.get("match_method", "no_match")),
            "source_name": best.get("source"),
            "source_reference": best.get("source_reference"),
        })

    return links, unmatched


def print_confidence_summary(links: list[dict[str, Any]]) -> None:
    by_confidence: dict[str, int] = {}
    for link in links:
        level = link.get("confidence_level", "unknown")
        by_confidence[level] = by_confidence.get(level, 0) + 1

    print("\nConfidence distribution:")
    for level in ("high", "medium", "low", "unknown"):
        count = by_confidence.get(level, 0)
        pct = round(count / max(len(links), 1) * 100, 1)
        print(f"  {level}: {count} ({pct}%)")


if __name__ == "__main__":
    main()
