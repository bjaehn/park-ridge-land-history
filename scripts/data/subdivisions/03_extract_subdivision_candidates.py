"""Script 03: Extract subdivision candidate records from available data sources.

Reads from:
  1. Cook County GIS parcel download with subdivision fields (if available)
  2. data/raw/park_ridge_land_family.csv (manually researched clues)
  3. Park Ridge boundary for spatial filtering

Normalizes subdivision names, deduplicates, and produces a candidate list.

Outputs:
  data/interim/subdivisions/subdivision_candidates.json  – all candidate records
  data/interim/subdivisions/subdivision_name_index.json  – unique subdivision names

Usage:
  python -m scripts.data.subdivisions.03_extract_subdivision_candidates
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any

from scripts.data_sources import PROJECT_ROOT
from scripts.data.subdivisions.normalize import normalize_subdivision_name, display_name

INTERIM_DIR = PROJECT_ROOT / "data/interim/subdivisions"
RAW_DIR = PROJECT_ROOT / "data/raw"

SUBDIVISION_GIS_PATH = RAW_DIR / "cook_county_parcels_with_subdivisions.geojson"
LAND_FAMILY_CSV_PATH = RAW_DIR / "park_ridge_land_family.csv"
DOWNLOAD_REPORT_PATH = INTERIM_DIR / "download_report.json"

# GIS field name candidates for subdivision info
SUBDIVISION_GIS_FIELD_CANDIDATES = [
    "subdivisio", "subdivision", "subdiv", "plat", "platname", "subname",
    "SUBDIVISIO", "SUBDIVISION", "Subdivisio",
]
LOT_GIS_FIELD_CANDIDATES = ["lot", "lotno", "lot_no", "lot_number", "LOT", "LotNo"]
BLOCK_GIS_FIELD_CANDIDATES = ["block", "blockno", "block_no", "block_number", "BLOCK", "BlockNo"]

LAND_FAMILY_SUBDIVISION_TYPES = {
    "subdivision_plat", "lot_block_reference", "subdivision_reference",
    "subdivision", "plat_reference",
}


def main() -> None:
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)

    print("=== Extracting Subdivision Candidates ===\n")

    # Discover GIS subdivision field names from download report
    gis_sub_field, gis_lot_field, gis_block_field = discover_gis_fields()
    print(f"GIS subdivision field: {gis_sub_field or 'not available'}")
    print(f"GIS lot field: {gis_lot_field or 'not available'}")
    print(f"GIS block field: {gis_block_field or 'not available'}")

    # Extract candidates from each source
    gis_candidates = extract_from_gis(gis_sub_field, gis_lot_field, gis_block_field)
    print(f"\nGIS parcel source: {len(gis_candidates)} subdivision attribute records")

    lf_candidates = extract_from_land_family()
    print(f"Land family CSV: {len(lf_candidates)} subdivision reference records")

    all_candidates = gis_candidates + lf_candidates
    print(f"\nTotal raw candidates: {len(all_candidates)}")

    # Build unique subdivision name index
    name_index = build_name_index(all_candidates)
    print(f"Unique normalized subdivision names: {len(name_index)}")

    # Save outputs
    candidates_path = INTERIM_DIR / "subdivision_candidates.json"
    name_index_path = INTERIM_DIR / "subdivision_name_index.json"

    candidates_path.write_text(json.dumps(all_candidates, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {candidates_path.relative_to(PROJECT_ROOT)}")

    name_index_path.write_text(json.dumps(name_index, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {name_index_path.relative_to(PROJECT_ROOT)}")

    # Print top subdivision names
    if name_index:
        by_count = sorted(name_index.values(), key=lambda x: -x["parcel_count"])
        print(f"\nTop 20 subdivisions by parcel count:")
        for entry in by_count[:20]:
            print(f"  {entry['display_name']}: {entry['parcel_count']} parcels")
    else:
        print("\nNo subdivision names found. Manual research or additional data sources needed.")
        print("See docs/data-sources/manual-research-queue.md for next steps.")

    print("\nNEXT STEP: Run 04_match_parcels_to_subdivisions.py")


def discover_gis_fields() -> tuple[str | None, str | None, str | None]:
    """Read the download report to find actual GIS subdivision field names."""
    if not DOWNLOAD_REPORT_PATH.exists():
        return None, None, None

    with DOWNLOAD_REPORT_PATH.open(encoding="utf-8") as f:
        report = json.load(f)

    found_fields = report.get("subdivision_fields_found", [])
    field_names = {f["name"].lower(): f["name"] for f in found_fields}

    sub_field = next(
        (field_names[c] for c in SUBDIVISION_GIS_FIELD_CANDIDATES if c.lower() in field_names),
        None,
    )
    lot_field = next(
        (field_names[c] for c in [f.lower() for f in LOT_GIS_FIELD_CANDIDATES] if c in field_names),
        None,
    )
    block_field = next(
        (field_names[c] for c in [f.lower() for f in BLOCK_GIS_FIELD_CANDIDATES] if c in field_names),
        None,
    )
    return sub_field, lot_field, block_field


def extract_from_gis(
    sub_field: str | None,
    lot_field: str | None,
    block_field: str | None,
) -> list[dict[str, Any]]:
    """Extract subdivision parcel records from the GIS download."""
    if not sub_field or not SUBDIVISION_GIS_PATH.exists():
        return []

    with SUBDIVISION_GIS_PATH.open(encoding="utf-8") as f:
        geojson = json.load(f)

    candidates: list[dict[str, Any]] = []
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        raw_name = props.get(sub_field)
        if not raw_name or str(raw_name).strip() in ("", "NULL", "N/A", "None"):
            continue

        pin = props.get("name") or props.get("pin") or props.get("pin10")
        lot = props.get(lot_field) if lot_field else None
        block = props.get(block_field) if block_field else None
        normalized = normalize_subdivision_name(raw_name)
        if not normalized:
            continue

        candidates.append({
            "pin": pin,
            "raw_subdivision_name": str(raw_name).strip(),
            "normalized_name": normalized,
            "display_name": display_name(normalized),
            "lot_number": str(lot).strip() if lot else None,
            "block_number": str(block).strip() if block else None,
            "source": "Cook County GIS parcel attribute",
            "source_field": sub_field,
            "confidence_level": "medium",
            "match_method": "parcel_gis_attribute",
        })

    return candidates


def extract_from_land_family() -> list[dict[str, Any]]:
    """Extract subdivision references from the land family CSV."""
    if not LAND_FAMILY_CSV_PATH.exists():
        return []

    candidates: list[dict[str, Any]] = []
    with LAND_FAMILY_CSV_PATH.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            record_type = (row.get("record_type") or "").strip().lower()
            if record_type not in LAND_FAMILY_SUBDIVISION_TYPES and "subdivision" not in record_type:
                continue

            title = (row.get("title") or "").strip()
            description = (row.get("description") or "").strip()

            # Try to find the subdivision name in title or description
            name_candidate = extract_subdivision_name_from_text(title) or extract_subdivision_name_from_text(description)
            if not name_candidate:
                continue

            normalized = normalize_subdivision_name(name_candidate)
            if not normalized:
                continue

            pin = (row.get("pin_normalized") or row.get("pin") or "").strip() or None
            lot = extract_lot_from_text(description or title)
            block = extract_block_from_text(description or title)

            candidates.append({
                "pin": pin,
                "address": (row.get("address") or "").strip() or None,
                "raw_subdivision_name": name_candidate,
                "normalized_name": normalized,
                "display_name": display_name(normalized),
                "lot_number": lot,
                "block_number": block,
                "source": row.get("source_name") or "Park Ridge land family research",
                "source_url": row.get("source_url") or None,
                "source_reference": row.get("case_number") or None,
                "confidence_level": "medium",
                "match_method": "parcel_gis_attribute",
                "notes": description if description != title else None,
            })

    return candidates


def extract_subdivision_name_from_text(text: str) -> str | None:
    """Try to extract a subdivision name from a text description."""
    if not text:
        return None
    # Pattern: "XXX Subdivision" or "XXX Addition" or "XXX Park"
    pattern = r"([A-Z][A-Za-z &\'\-\.0-9]+(?:Subdivision|Addition|Resubdivision|Park|Heights|Estates|Manor|Gardens|Woods|Hills|Ridge|Terrace|Place|Court|Village|Acres|Farm|Meadows)(?:\s+(?:No|Number|Unit|Section|Phase)\.?\s*\d+)?)"
    matches = re.findall(pattern, text, re.IGNORECASE)
    if matches:
        return matches[0].strip()
    return None


def extract_lot_from_text(text: str) -> str | None:
    if not text:
        return None
    match = re.search(r"\bLot\s+(\d+(?:-\d+)?)\b", text, re.IGNORECASE)
    return match.group(1) if match else None


def extract_block_from_text(text: str) -> str | None:
    if not text:
        return None
    match = re.search(r"\bBlock\s+(\d+(?:-\d+)?)\b", text, re.IGNORECASE)
    return match.group(1) if match else None


def build_name_index(candidates: list[dict[str, Any]]) -> dict[str, Any]:
    """Deduplicate subdivision names and build a lookup index."""
    index: dict[str, Any] = {}

    for candidate in candidates:
        normalized = candidate.get("normalized_name")
        if not normalized:
            continue

        if normalized not in index:
            index[normalized] = {
                "normalized_name": normalized,
                "display_name": candidate.get("display_name", display_name(normalized)),
                "parcel_count": 0,
                "pin_samples": [],
                "sources": [],
                "lot_numbers": [],
                "block_numbers": [],
                "confidence_level": candidate.get("confidence_level", "unknown"),
                "best_match_method": candidate.get("match_method", "unknown"),
            }

        entry = index[normalized]
        entry["parcel_count"] += 1

        pin = candidate.get("pin")
        if pin and len(entry["pin_samples"]) < 5:
            entry["pin_samples"].append(pin)

        source = candidate.get("source")
        if source and source not in entry["sources"]:
            entry["sources"].append(source)

        lot = candidate.get("lot_number")
        if lot and lot not in entry["lot_numbers"]:
            entry["lot_numbers"].append(lot)

        block = candidate.get("block_number")
        if block and block not in entry["block_numbers"]:
            entry["block_numbers"].append(block)

    return index


if __name__ == "__main__":
    main()
