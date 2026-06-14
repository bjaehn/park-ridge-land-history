"""Script 01: Inspect Cook County GIS data sources for subdivision fields.

Queries the Cook County ArcGIS FeatureServer and Cook County Socrata APIs
to discover which fields contain subdivision names, lot numbers, and block numbers.

Outputs:
  data/interim/subdivisions/cook_gis_parcel_field_report.json
  data/interim/subdivisions/cook_socrata_parcel_universe_field_report.json

Usage:
  python -m scripts.data.subdivisions.01_inspect_cook_gis_fields

Does not download full datasets; only inspects metadata and a small sample.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from scripts.data_sources import PROJECT_ROOT

PARCEL_FEATURE_SERVER_INFO = "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0"
PARCEL_FEATURE_SERVER_QUERY = "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0/query"
COOK_GIS_HUB_SEARCH = "https://gis.cookcountyil.gov/hosting/rest/services"

SOCRATA_UNIVERSE = "https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json"
SOCRATA_UNIVERSE_COLUMNS = "https://datacatalog.cookcountyil.gov/api/views/nj4t-kc8j.json"

# Sample PIN from Park Ridge for field testing
SAMPLE_PIN = "09211010010000"

SUBDIVISION_CANDIDATE_FIELDS = {
    "subdivisio", "subdivision", "subdiv", "plat", "lotno", "lot_no",
    "lot", "block", "blockno", "block_no", "legal", "legal_desc",
    "legal_description", "platname", "subname",
}

INTERIM_DIR = PROJECT_ROOT / "data/interim/subdivisions"


def main() -> None:
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)

    print("=== Cook County GIS Subdivision Field Inspection ===\n")

    # 1. Inspect the ArcGIS Parcel FeatureServer
    parcel_report = inspect_arcgis_parcel_layer()
    report_path = INTERIM_DIR / "cook_gis_parcel_field_report.json"
    report_path.write_text(json.dumps(parcel_report, indent=2), encoding="utf-8")
    print(f"Wrote {report_path.relative_to(PROJECT_ROOT)}")

    # 2. Inspect the Socrata Parcel Universe schema
    socrata_report = inspect_socrata_parcel_universe()
    socrata_path = INTERIM_DIR / "cook_socrata_parcel_universe_field_report.json"
    socrata_path.write_text(json.dumps(socrata_report, indent=2), encoding="utf-8")
    print(f"Wrote {socrata_path.relative_to(PROJECT_ROOT)}")

    # 3. Summary
    print_summary(parcel_report, socrata_report)


def inspect_arcgis_parcel_layer() -> dict[str, Any]:
    print("Fetching Cook County GIS Parcel FeatureServer field metadata...")
    report: dict[str, Any] = {
        "source": "Cook County GIS Hosted Parcel FeatureServer",
        "url": PARCEL_FEATURE_SERVER_INFO,
        "status": "unknown",
        "all_fields": [],
        "subdivision_candidate_fields": [],
        "sample_record": None,
        "error": None,
    }

    try:
        # Get layer metadata
        info_url = f"{PARCEL_FEATURE_SERVER_INFO}?f=json"
        with urllib.request.urlopen(info_url, timeout=30) as response:
            metadata = json.loads(response.read().decode("utf-8"))

        fields = metadata.get("fields", [])
        report["all_fields"] = [{"name": f.get("name"), "alias": f.get("alias"), "type": f.get("type")} for f in fields]
        report["status"] = "metadata_fetched"

        # Check for subdivision-related fields
        found_subdivision_fields = [
            f for f in report["all_fields"]
            if any(cand in f["name"].lower() for cand in SUBDIVISION_CANDIDATE_FIELDS)
        ]
        report["subdivision_candidate_fields"] = found_subdivision_fields

        if found_subdivision_fields:
            print(f"  FOUND {len(found_subdivision_fields)} subdivision-candidate fields!")
            for f in found_subdivision_fields:
                print(f"    {f['name']} ({f['alias']})")
        else:
            print(f"  No subdivision candidate fields in {len(fields)} available fields.")
            print(f"  Available fields: {[f['name'] for f in report['all_fields'][:20]]}")

        # Fetch a sample record to see actual values
        all_field_names = ",".join(f["name"] for f in fields) if fields else "*"
        sample_report = fetch_sample_record(all_field_names)
        report["sample_record"] = sample_report

    except Exception as error:
        report["status"] = "error"
        report["error"] = str(error)
        print(f"  ERROR fetching FeatureServer metadata: {error}")

    return report


def fetch_sample_record(out_fields: str) -> dict[str, Any] | None:
    """Fetch one parcel record to see actual field values."""
    try:
        params = {
            "f": "json",
            "outFields": out_fields[:2000],  # URL length limit
            "returnGeometry": "false",
            "where": f"name='{SAMPLE_PIN}'",
            "resultRecordCount": "1",
        }
        url = f"{PARCEL_FEATURE_SERVER_QUERY}?{urllib.parse.urlencode(params, safe=',()*=')}"
        with urllib.request.urlopen(url, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
        features = payload.get("features", [])
        if features:
            return features[0].get("attributes", {})
        return {"note": f"No record found for PIN {SAMPLE_PIN}"}
    except Exception as error:
        return {"error": str(error)}


def inspect_socrata_parcel_universe() -> dict[str, Any]:
    """Inspect the Cook County Assessor Parcel Universe Socrata dataset for subdivision fields."""
    print("\nFetching Cook County Socrata Parcel Universe column metadata...")
    report: dict[str, Any] = {
        "source": "Cook County Assessor Parcel Universe",
        "url": SOCRATA_UNIVERSE,
        "dataset_id": "nj4t-kc8j",
        "status": "unknown",
        "all_columns": [],
        "subdivision_candidate_columns": [],
        "error": None,
    }

    try:
        columns_url = f"{SOCRATA_UNIVERSE_COLUMNS}"
        with urllib.request.urlopen(columns_url, timeout=30) as response:
            metadata = json.loads(response.read().decode("utf-8"))

        columns = metadata.get("columns", [])
        report["all_columns"] = [
            {
                "field_name": c.get("fieldName"),
                "name": c.get("name"),
                "data_type_name": c.get("dataTypeName"),
            }
            for c in columns
        ]
        report["status"] = "metadata_fetched"

        found_subdivision_columns = [
            c for c in report["all_columns"]
            if any(cand in (c["field_name"] or "").lower() for cand in SUBDIVISION_CANDIDATE_FIELDS)
            or any(cand in (c["name"] or "").lower() for cand in SUBDIVISION_CANDIDATE_FIELDS)
        ]
        report["subdivision_candidate_columns"] = found_subdivision_columns

        if found_subdivision_columns:
            print(f"  FOUND {len(found_subdivision_columns)} subdivision-candidate columns!")
            for c in found_subdivision_columns:
                print(f"    {c['field_name']} ({c['name']})")
        else:
            print(f"  No subdivision candidate columns in {len(columns)} available columns.")

    except Exception as error:
        report["status"] = "error"
        report["error"] = str(error)
        print(f"  ERROR fetching Socrata metadata: {error}")

    return report


def print_summary(parcel_report: dict[str, Any], socrata_report: dict[str, Any]) -> None:
    print("\n=== Summary ===")

    gis_fields = parcel_report.get("subdivision_candidate_fields", [])
    socrata_cols = socrata_report.get("subdivision_candidate_columns", [])

    if gis_fields:
        print(f"\nCook County GIS parcel layer HAS {len(gis_fields)} subdivision-related field(s).")
        print("Next step: run 02_download_cook_gis_parcels_subdivisions.py to download with those fields.")
    else:
        print("\nCook County GIS parcel layer has NO detected subdivision fields.")
        print("The subdivision name is NOT directly available in the current parcel FeatureServer layer.")
        print("Options:")
        print("  1. Check Cook County GIS Hub for a more complete parcel layer with subdivision attributes.")
        print("  2. Obtain subdivision data from the Cook County Recorder plat database (manual).")
        print("  3. Populate data/raw/park_ridge_land_family.csv with manually researched subdivision data.")
        print("  4. Use the subdivision tables to store manually entered records.")

    if socrata_cols:
        print(f"\nSocrata Parcel Universe HAS {len(socrata_cols)} subdivision-related column(s).")
    else:
        print("\nSocrata Parcel Universe has NO subdivision columns in its schema.")

    print("\nSee data/interim/subdivisions/ for full field reports.")
    print("See docs/data-sources/subdivision-data-inventory.md for complete source documentation.")


if __name__ == "__main__":
    main()
