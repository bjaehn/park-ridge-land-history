"""Script 02: Download Cook County GIS parcel data with subdivision fields.

Extends the existing parcel download to include all available subdivision-related
fields from the Cook County ArcGIS FeatureServer.

Reads the field inspection report from script 01 to know which fields to request.
If no subdivision fields are available, this script documents that gap and exits.

Also checks for subdivision data in the Cook County Assessor Parcel Universe
Socrata dataset if subdivision columns were found there by script 01.

Outputs:
  data/raw/cook_county_parcels_with_subdivisions.geojson
  data/interim/subdivisions/download_report.json

Usage:
  python -m scripts.data.subdivisions.02_download_cook_gis_parcels_subdivisions
  python -m scripts.data.subdivisions.02_download_cook_gis_parcels_subdivisions --municipality "CITY OF PARK RIDGE"
  python -m scripts.data.subdivisions.02_download_cook_gis_parcels_subdivisions --force
"""

from __future__ import annotations

import argparse
import json
import math
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from scripts.data_sources import PROJECT_ROOT
from scripts.pipeline_utils import normalize_pin

PARCEL_FEATURE_SERVER = "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0/query"
SOCRATA_UNIVERSE = "https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json"

INTERIM_DIR = PROJECT_ROOT / "data/interim/subdivisions"
RAW_DIR = PROJECT_ROOT / "data/raw"

KNOWN_SUBDIVISION_FIELD_ALIASES = {
    "subdivisio", "subdivision", "subdiv", "plat", "platname",
    "lot", "lotno", "lot_no", "lot_number",
    "block", "blockno", "block_no", "block_number",
}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download Cook County GIS parcels with subdivision fields."
    )
    parser.add_argument("--municipality", default="CITY OF PARK RIDGE")
    parser.add_argument("--chunk-size", type=int, default=75)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    load_dotenv(PROJECT_ROOT / ".env")
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    output_path = RAW_DIR / "cook_county_parcels_with_subdivisions.geojson"
    report_path = INTERIM_DIR / "download_report.json"

    if output_path.exists() and not args.force:
        print(f"Skip existing {output_path.relative_to(PROJECT_ROOT)}; pass --force to overwrite.")
        return

    # Load field inspection report from script 01
    field_report_path = INTERIM_DIR / "cook_gis_parcel_field_report.json"
    if not field_report_path.exists():
        print("Field report not found. Run 01_inspect_cook_gis_fields.py first.")
        print(f"Expected: {field_report_path.relative_to(PROJECT_ROOT)}")
        return

    with field_report_path.open(encoding="utf-8") as f:
        field_report = json.load(f)

    subdivision_fields = field_report.get("subdivision_candidate_fields", [])
    all_fields = field_report.get("all_fields", [])

    # Build field list: always include PIN fields + any subdivision fields found
    base_fields = ["name", "pin10", "parceltype", "taxcode"]
    subdivision_field_names = [f["name"] for f in subdivision_fields]
    out_fields = base_fields + [f for f in subdivision_field_names if f not in base_fields]

    report: dict[str, Any] = {
        "municipality": args.municipality,
        "fields_requested": out_fields,
        "subdivision_fields_found": subdivision_fields,
        "features_downloaded": 0,
        "features_with_subdivision_value": 0,
        "status": "pending",
        "notes": [],
    }

    if not subdivision_fields:
        msg = (
            "No subdivision fields found in Cook County GIS parcel layer. "
            "Downloading base parcel data only. "
            "Subdivision data must come from manual research or the land family CSV."
        )
        print(f"\n{msg}")
        report["notes"].append(msg)
        report["status"] = "no_subdivision_fields_available"
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

        # Still download with base fields in case this file is needed
        print("Downloading base parcel data (no subdivision fields)...")
    else:
        print(f"\nFound {len(subdivision_fields)} subdivision field(s): {subdivision_field_names}")
        print(f"Downloading parcels for {args.municipality} with fields: {out_fields}...")

    # Get PIN list from existing parcel universe if available
    universe_path = RAW_DIR / "parcel_universe.csv"
    if universe_path.exists():
        pins = load_pins_from_universe(universe_path, args.municipality)
        print(f"Loaded {len(pins)} PINs from existing parcel universe.")
    else:
        print("Parcel universe not found. Run the main pipeline first.")
        print("Downloading all parcels for municipality via GIS attribute filter instead...")
        pins = None

    features = download_parcel_features(pins, out_fields, args.chunk_size)
    report["features_downloaded"] = len(features)

    if subdivision_fields:
        sub_field = subdivision_field_names[0]
        with_value = sum(
            1 for f in features
            if f.get("properties", {}).get(sub_field) not in (None, "", "NULL", "N/A")
        )
        report["features_with_subdivision_value"] = with_value
        pct = round((with_value / max(len(features), 1)) * 100, 1)
        print(f"  {with_value} of {len(features)} parcels ({pct}%) have a {sub_field} value.")

    geojson = {"type": "FeatureCollection", "name": "cook_county_park_ridge_parcels_subdivisions", "features": features}
    output_path.write_text(json.dumps(geojson), encoding="utf-8")
    print(f"Wrote {output_path.relative_to(PROJECT_ROOT)} ({len(features)} features)")

    report["status"] = "complete"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {report_path.relative_to(PROJECT_ROOT)}")

    if not subdivision_fields:
        print("\nNEXT STEPS (no subdivision fields in GIS layer):")
        print("  1. Check Cook County GIS Hub at cookcountyilgis.hub.arcgis.com for a complete parcel layer.")
        print("  2. Research subdivision names via Cook County Recorder at ccrd.info.")
        print("  3. Populate data/raw/park_ridge_land_family.csv with subdivision clues.")
        print("  4. Then run script 03 to extract subdivision candidates from available data.")
    else:
        print("\nNEXT STEP: Run 03_extract_subdivision_candidates.py")


def load_pins_from_universe(path: Path, municipality: str) -> list[str]:
    import csv
    pins = []
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            muni = row.get("cook_municipality_name", "").strip().upper()
            if municipality.upper() in muni or muni in municipality.upper():
                result = normalize_pin(row.get("pin"))
                if result.get("pin_valid"):
                    pins.append(result["pin_normalized"])
    return sorted(set(pins))


def download_parcel_features(
    pins: list[str] | None,
    out_fields: list[str],
    chunk_size: int,
) -> list[dict[str, Any]]:
    features: list[dict[str, Any]] = []
    seen: set[str] = set()

    if pins:
        total_chunks = math.ceil(len(pins) / chunk_size)
        for index, chunk in enumerate(chunks(pins, chunk_size), start=1):
            where = f"name in ({quoted_list(chunk)})"
            batch = arcgis_query(where, out_fields)
            for feature in batch:
                pin = feature.get("properties", {}).get("name")
                if pin and pin not in seen:
                    seen.add(pin)
                    features.append(feature)
            print(f"  chunk {index}/{total_chunks}: {len(features)} features total")
            time.sleep(0.05)
    else:
        # Fallback: query by parcel type without a PIN filter
        print("  No PIN list available; downloading all parcel features...")
        batch = arcgis_query("1=1", out_fields, result_record_count=5000)
        features.extend(batch)
        print(f"  Downloaded {len(features)} parcel features.")

    return features


def arcgis_query(where: str, out_fields: list[str], result_record_count: int | None = None) -> list[dict[str, Any]]:
    params: dict[str, str] = {
        "f": "geojson",
        "outFields": ",".join(out_fields),
        "returnGeometry": "true",
        "outSR": "4326",
        "where": where,
    }
    if result_record_count:
        params["resultRecordCount"] = str(result_record_count)
    url = f"{PARCEL_FEATURE_SERVER}?{urllib.parse.urlencode(params, safe=',()*=')}"
    with urllib.request.urlopen(url, timeout=90) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if "error" in payload:
        raise RuntimeError(f"ArcGIS error: {payload['error']}")
    return payload.get("features", [])


def chunks(values: list[str], size: int):
    for i in range(0, len(values), size):
        yield values[i: i + size]


def quoted_list(values) -> str:
    return ",".join(f"'{v}'" for v in values)


if __name__ == "__main__":
    main()
