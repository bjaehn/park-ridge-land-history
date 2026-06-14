"""
Load park_ridge_parcels_enriched.geojson into the Supabase `parcels` table.

Usage:
  .venv/Scripts/python scripts/import_to_supabase.py
  .venv/Scripts/python scripts/import_to_supabase.py --batch-size 200 --dry-run

Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (or .env).
Packages used: geopandas, shapely (already in .venv), python-dotenv, urllib (stdlib).
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

import geopandas as gpd
from dotenv import load_dotenv
import os

PROJECT_ROOT = Path(__file__).resolve().parent.parent
GEOJSON_PATH = PROJECT_ROOT / "public" / "data" / "park_ridge_parcels_enriched.geojson"


def load_env() -> tuple[str, str]:
    load_dotenv(PROJECT_ROOT / ".env.local")
    load_dotenv(PROJECT_ROOT / ".env")
    url = os.environ.get("VITE_SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
    if not url or not key:
        sys.exit("ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local")
    return url, key


# All property columns in the parcels table (must match the schema exactly).
# PostgREST requires every row in a batch to have the same set of keys.
ALL_COLUMNS = [
    "pin_normalized", "pin_original", "address", "municipality", "property_class",
    "year_built", "decade_built", "building_sqft", "land_sqft", "improvement_count",
    "primary_building_selection_method", "data_quality_flags", "source_note",
    "permit_count", "latest_permit_year", "nearby_teardown_count",
    "permit_pressure_score", "permit_pressure_type", "permit_stability_type",
    "recent_permit_count", "recent_teardown_count",
    "permit_pressure_1_type", "permit_stability_1_type", "permit_pressure_1_score",
    "recent_permit_1_count", "recent_teardown_1_count",
    "permit_pressure_5_type", "permit_stability_5_type", "permit_pressure_5_score",
    "recent_permit_5_count", "recent_teardown_5_count",
    "permit_pressure_10_type", "permit_stability_10_type", "permit_pressure_10_score",
    "recent_permit_10_count", "recent_teardown_10_count",
    "permit_pressure_all_type", "permit_stability_all_type", "permit_pressure_all_score",
    "recent_permit_all_count", "recent_teardown_all_count",
    "sale_count", "latest_sale_year", "latest_sale_price", "max_sale_price",
    "assessed_year_count", "first_assessed_year", "first_assessed_total",
    "latest_assessed_year", "latest_assessed_total", "assessed_value_change_pct",
    "assessed_value_timeline",
    "appeal_count", "latest_appeal_year", "open_appeal_count", "total_assessment_reduction",
    "proximity_year", "nearest_park_name", "nearest_park_dist_ft",
    "nearest_metra_stop_name", "nearest_metra_stop_dist_ft",
    "nearest_bike_trail_name", "nearest_bike_trail_dist_ft",
    "foreclosure_count_half_mile_5yr", "foreclosure_per_1000_half_mile_5yr",
    "nearest_major_road_name", "nearest_major_road_dist_ft",
    "street_block_id", "street_block_tract", "street_block_source",
    "hargis_record_count", "hargis_refnum", "hargis_refnums",
    "hargis_name", "hargis_location", "hargis_nr_eval", "hargis_category",
    "hargis_arch_class", "hargis_current_function", "hargis_historic_function",
    "hargis_wall_materials", "hargis_architect", "hargis_builder",
    "hargis_begin_year", "hargis_end_year", "hargis_survey_date", "hargis_survey_year",
    "hargis_opinion_significance", "hargis_photo_count", "hargis_pdf_count",
    "hargis_photo_url", "hargis_pdf_url",
    "hargis_photos_json", "hargis_pdfs_json", "hargis_match_method", "hargis_records_json",
    "civic_record_count", "civic_records_json",
    "directory_record_count", "directory_records_json",
    "sanborn_snapshot_count", "sanborn_snapshots_json",
    "paper_trail_record_count", "paper_trail_records_json",
    "recognized_history_count", "recognized_history_json",
    "land_family_record_count", "land_family_records_json",
    "house_evolution_timeline",
    "centroid_in_target_boundary", "intersects_target_boundary",
    "geometry",
]

INT_FLOAT_FIELDS = {
    "year_built", "improvement_count", "permit_count", "latest_permit_year",
    "nearby_teardown_count", "sale_count", "latest_sale_year", "assessed_year_count",
    "first_assessed_year", "latest_assessed_year", "appeal_count", "latest_appeal_year",
    "open_appeal_count", "proximity_year", "hargis_record_count", "hargis_begin_year",
    "hargis_end_year", "hargis_survey_year", "hargis_photo_count", "hargis_pdf_count",
    "civic_record_count", "directory_record_count", "sanborn_snapshot_count",
    "paper_trail_record_count", "recognized_history_count", "land_family_record_count",
    "recent_permit_count", "recent_teardown_count",
    "recent_permit_1_count", "recent_teardown_1_count",
    "recent_permit_5_count", "recent_teardown_5_count",
    "recent_permit_10_count", "recent_teardown_10_count",
    "recent_permit_all_count", "recent_teardown_all_count",
}


def feature_to_row(feature: dict) -> dict:
    props = feature.get("properties") or {}
    row: dict = {col: None for col in ALL_COLUMNS}  # default everything to None

    for key in ALL_COLUMNS:
        if key == "geometry":
            continue
        val = props.get(key)
        if val is None:
            continue
        if key in INT_FLOAT_FIELDS and isinstance(val, float):
            row[key] = int(val)
        else:
            row[key] = val

    geom = feature.get("geometry")
    if geom:
        row["geometry"] = f"SRID=4326;{geom_to_ewkt(geom)}"

    return row


def geom_to_ewkt(geom: dict) -> str:
    from shapely.geometry import shape
    from shapely import wkt as shapely_wkt
    return shapely_wkt.dumps(shape(geom), rounding_precision=7)


def post_batch(url: str, key: str, rows: list[dict], dry_run: bool) -> int:
    endpoint = f"{url}/rest/v1/parcels"
    payload = json.dumps(rows).encode()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    if dry_run:
        print(f"  [dry-run] would POST {len(rows)} rows ({len(payload):,} bytes)")
        return len(rows)
    req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return len(rows)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        print(f"  HTTP {exc.code}: {body[:400]}")
        raise


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=150)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Import only first N features (for testing)")
    args = parser.parse_args()

    supabase_url, supabase_key = load_env()

    print(f"Reading {GEOJSON_PATH} ...")
    with open(GEOJSON_PATH, encoding="utf-8") as f:
        geojson = json.load(f)

    features = geojson["features"]
    if args.limit:
        features = features[: args.limit]
    total = len(features)
    print(f"Loaded {total:,} features")

    batch: list[dict] = []
    imported = 0
    errors = 0

    for i, feature in enumerate(features):
        try:
            row = feature_to_row(feature)
        except Exception as exc:
            pin = (feature.get("properties") or {}).get("pin_normalized", f"feature[{i}]")
            print(f"  SKIP {pin}: {exc}")
            errors += 1
            continue

        batch.append(row)

        if len(batch) >= args.batch_size:
            batch_num = imported // args.batch_size + 1
            print(f"  Posting batch {batch_num} ({imported + 1}-{imported + len(batch)} of {total}) ...")
            imported += post_batch(supabase_url, supabase_key, batch, args.dry_run)
            batch = []

    if batch:
        batch_num = imported // args.batch_size + 1
        print(f"  Posting batch {batch_num} ({imported + 1}-{imported + len(batch)} of {total}) ...")
        imported += post_batch(supabase_url, supabase_key, batch, args.dry_run)

    print(f"\nDone. {imported:,} rows imported, {errors} skipped.")
    if errors:
        print("Some rows were skipped due to conversion errors (see above).")


if __name__ == "__main__":
    main()
