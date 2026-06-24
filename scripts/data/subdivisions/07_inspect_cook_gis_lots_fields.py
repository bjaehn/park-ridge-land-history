"""Script 07: Inspect Cook County GIS services to find the Lots layer.

Browses the Cook County ArcGIS REST services root to locate the subdivision
plat lots layer, then inspects its field schema and fetches a sample record
for the Park Ridge area.

Run this BEFORE running ingest-cook-county-lots.py. The output tells you:
  - Whether the Lots layer exists and what its URL is
  - What fields carry lot number, block number, and subdivision name
  - A sample record so you can verify field values look correct

Outputs:
  data/interim/subdivisions/cook_gis_lots_field_report.json

Usage:
  python -m scripts.data.subdivisions.07_inspect_cook_gis_lots_fields
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from scripts.data_sources import PROJECT_ROOT

INTERIM_DIR = PROJECT_ROOT / "data/interim/subdivisions"

# Cook County ArcGIS REST services root. The Lots layer may be under
# Hosted or a named service folder. The script searches both.
ARCGIS_SERVICES_ROOT = "https://gis.cookcountyil.gov/hosting/rest/services"

# Candidate service names to try before doing a full tree search.
# Listed most-likely first based on known Cook County GIS naming conventions.
CANDIDATE_LOTS_URLS = [
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Lot/FeatureServer/0",
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Lots/FeatureServer/0",
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/SubdivisionLots/FeatureServer/0",
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Subdivision_Lots/FeatureServer/0",
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/PlattedLots/FeatureServer/0",
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Plat/FeatureServer/0",
    "https://gis.cookcountyil.gov/hosting/rest/services/Property/Lots/FeatureServer/0",
    "https://gis.cookcountyil.gov/hosting/rest/services/Property/SubdivisionLots/FeatureServer/0",
]

# Field names that suggest this layer carries lot/subdivision data.
LOT_CANDIDATE_FIELDS = {
    "lot", "lotno", "lot_no", "lot_num", "lot_number",
    "block", "blockno", "block_no", "block_num", "block_number",
    "subdivisio", "subdivision", "subdiv", "subname", "sub_name",
    "platname", "plat_name", "plat", "legal", "legal_desc", "legal_description",
    "pin", "pin10", "parcelpin",
    "township", "twp", "range", "rng", "section", "sec",
}

# Sample Park Ridge bounding box (WGS84) for fetching a test record.
# Min-X, Min-Y, Max-X, Max-Y (roughly covering Park Ridge)
PARK_RIDGE_BBOX = "-87.858,42.000,-87.805,42.050"


def main() -> None:
    load_dotenv(PROJECT_ROOT / ".env")
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)

    print("=== Cook County GIS Lots Layer Inspection ===\n")

    report: dict[str, Any] = {
        "found_url": None,
        "candidates_tried": [],
        "all_fields": [],
        "lot_candidate_fields": [],
        "sample_record": None,
        "env_var_hint": "COOK_GIS_LOTS_SOURCE_URL",
        "notes": [],
    }

    # 1. Try candidate URLs in order.
    found_url = try_candidate_urls(report)

    if not found_url:
        print("\nNo Lots layer found at any candidate URL.")
        print("Attempting broad service tree search...")
        found_url = search_service_tree(report)

    if found_url:
        print(f"\nLayer found at: {found_url}")
        print(f"Set COOK_GIS_LOTS_SOURCE_URL={found_url} in .env\n")

        # 2. Inspect fields.
        inspect_layer_fields(found_url, report)

        # 3. Fetch a sample record from the Park Ridge area.
        fetch_sample_record(found_url, report)
    else:
        print("\nCould not locate the Lots layer automatically.")
        print("Manual steps:")
        print("  1. Visit https://gis.cookcountyil.gov/hosting/rest/services")
        print("  2. Browse to find a service named 'Lots', 'SubdivisionLots', or 'Plat'")
        print("  3. Copy the FeatureServer/0 URL")
        print("  4. Set COOK_GIS_LOTS_SOURCE_URL=<that URL> in .env")
        print("  5. Re-run this script to validate fields")
        report["notes"].append(
            "Automatic discovery failed. Set COOK_GIS_LOTS_SOURCE_URL in .env manually "
            "and re-run to validate fields."
        )

    out_path = INTERIM_DIR / "cook_gis_lots_field_report.json"
    out_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"\nWrote {out_path.relative_to(PROJECT_ROOT)}")


def try_candidate_urls(report: dict[str, Any]) -> str | None:
    """Try each candidate URL; return the first that responds as a valid layer."""
    env_url = os.getenv("COOK_GIS_LOTS_SOURCE_URL")
    if env_url:
        candidates = [env_url] + CANDIDATE_LOTS_URLS
        print(f"COOK_GIS_LOTS_SOURCE_URL is set; trying it first: {env_url}")
    else:
        candidates = CANDIDATE_LOTS_URLS

    for url in candidates:
        info_url = f"{url}?f=json"
        print(f"Trying {url} ...", end=" ", flush=True)
        result = fetch_json(info_url, timeout=15)
        report["candidates_tried"].append({"url": url, "status": "ok" if result else "failed"})
        if result and "fields" in result:
            print("OK")
            report["found_url"] = url
            return url
        elif result and "error" in result:
            print(f"error: {result['error'].get('message', 'unknown')}")
        else:
            print("not a layer or timeout")

    return None


def search_service_tree(report: dict[str, Any]) -> str | None:
    """Browse the ArcGIS services root looking for a service with 'lot' in the name."""
    root_url = f"{ARCGIS_SERVICES_ROOT}?f=json"
    print(f"Fetching services list from {ARCGIS_SERVICES_ROOT} ...")
    root = fetch_json(root_url, timeout=20)
    if not root:
        print("  Could not reach services root.")
        return None

    services = root.get("services", [])
    folders = root.get("folders", [])
    print(f"  Found {len(services)} services and {len(folders)} folders at root.")

    lot_keywords = {"lot", "plat", "subdivision", "subdiv"}

    def matches_lot(name: str) -> bool:
        low = name.lower()
        return any(kw in low for kw in lot_keywords)

    # Check root-level services.
    for svc in services:
        name = svc.get("name", "")
        stype = svc.get("type", "")
        if stype == "FeatureServer" and matches_lot(name):
            url = f"{ARCGIS_SERVICES_ROOT}/{name}/FeatureServer/0"
            print(f"  Candidate root service: {name} -> {url}")
            result = fetch_json(f"{url}?f=json", timeout=15)
            if result and "fields" in result:
                report["found_url"] = url
                return url

    # Check named folders.
    for folder in folders:
        folder_url = f"{ARCGIS_SERVICES_ROOT}/{folder}?f=json"
        folder_data = fetch_json(folder_url, timeout=15)
        if not folder_data:
            continue
        for svc in folder_data.get("services", []):
            name = svc.get("name", "")
            stype = svc.get("type", "")
            if stype == "FeatureServer" and matches_lot(name):
                short_name = name.split("/")[-1]
                url = f"{ARCGIS_SERVICES_ROOT}/{name}/FeatureServer/0"
                print(f"  Candidate in folder '{folder}': {short_name} -> {url}")
                result = fetch_json(f"{url}?f=json", timeout=15)
                if result and "fields" in result:
                    report["found_url"] = url
                    return url

    return None


def inspect_layer_fields(layer_url: str, report: dict[str, Any]) -> None:
    """Fetch layer metadata and identify lot/subdivision-related fields."""
    meta = fetch_json(f"{layer_url}?f=json", timeout=20)
    if not meta:
        print("Could not fetch layer metadata.")
        return

    fields = meta.get("fields", [])
    report["all_fields"] = [
        {"name": f.get("name"), "alias": f.get("alias"), "type": f.get("type")}
        for f in fields
    ]

    found = [
        f for f in report["all_fields"]
        if any(cand in (f["name"] or "").lower() for cand in LOT_CANDIDATE_FIELDS)
        or any(cand in (f["alias"] or "").lower() for cand in LOT_CANDIDATE_FIELDS)
    ]
    report["lot_candidate_fields"] = found

    print(f"Total fields: {len(fields)}")
    if found:
        print(f"Lot/subdivision-related fields ({len(found)}):")
        for f in found:
            print(f"  {f['name']:30s}  alias={f['alias']!r:40s}  type={f['type']}")
    else:
        print("No lot/subdivision-related fields detected.")
        print("All field names:")
        for f in report["all_fields"][:40]:
            print(f"  {f['name']}")
        if len(report["all_fields"]) > 40:
            print(f"  ... and {len(report['all_fields']) - 40} more")


def fetch_sample_record(layer_url: str, report: dict[str, Any]) -> None:
    """Fetch one record from the Park Ridge bounding box to verify field values."""
    query_url = f"{layer_url}/query"
    out_fields = ",".join(
        f["name"] for f in report["all_fields"]
    ) if report["all_fields"] else "*"

    params = {
        "f": "json",
        "geometry": PARK_RIDGE_BBOX,
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": out_fields[:4000],
        "returnGeometry": "false",
        "resultRecordCount": "3",
    }
    url = f"{query_url}?{urllib.parse.urlencode(params, safe=',=*')}"

    print("\nFetching sample records from Park Ridge bounding box...")
    result = fetch_json(url, timeout=30)
    if not result:
        print("  Could not fetch sample records.")
        report["sample_record"] = {"error": "fetch failed"}
        return

    features = result.get("features", [])
    if not features:
        print("  No features returned in Park Ridge bounding box.")
        print("  This could mean the bbox is wrong or no lots are indexed in this area.")
        report["sample_record"] = {"note": "no features in Park Ridge bbox", "raw": result}
        return

    print(f"  Returned {len(features)} sample feature(s).")
    for i, feat in enumerate(features):
        attrs = feat.get("attributes", {})
        print(f"\n  Feature {i + 1}:")
        for k, v in attrs.items():
            if v is not None:
                print(f"    {k}: {v!r}")

    report["sample_record"] = [f.get("attributes", {}) for f in features]


def fetch_json(url: str, timeout: int = 20) -> dict[str, Any] | None:
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        return None


if __name__ == "__main__":
    main()
