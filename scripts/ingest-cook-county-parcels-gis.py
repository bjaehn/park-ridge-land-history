"""Ingest Cook County GIS current parcel geometries into the gis_parcels table.

Downloads parcel polygon features from the Cook County ArcGIS FeatureServer,
clips to the Park Ridge area, reprojects to EPSG:4326 if needed, normalizes
PINs to 14-digit format, and upserts into gis_parcels.

gis_parcels stores the authoritative parcel geometry used for spatial
parcel-to-lot matching (Sprint B). It is separate from the enriched `parcels`
table, which carries assessor attribute data.

Prerequisites:
  - Supabase migrations 20260624000000 through 20260624000002 must be applied.
  - The Cook County parcel layer URL is already known (same source as the main
    pipeline; see PARCEL_BOUNDARY_SOURCE_URL in .env.example).

Usage:
  python scripts/ingest-cook-county-parcels-gis.py --dry-run
  python scripts/ingest-cook-county-parcels-gis.py --sample
  python scripts/ingest-cook-county-parcels-gis.py
  python scripts/ingest-cook-county-parcels-gis.py --force
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from scripts.data_sources import PROJECT_ROOT

# ─── Configuration ────────────────────────────────────────────────────────────

INTERIM_DIR = PROJECT_ROOT / "data/interim/subdivisions"
RAW_DIR = PROJECT_ROOT / "data/raw"

# Park Ridge bounding box in WGS84.
PARK_RIDGE_BBOX_WGS84 = (-87.865, 41.993, -87.798, 42.055)

PAGE_SIZE = 500

SOURCE_KEY = "cook_county_gis_parcels_current"

# Default parcel layer URL (same as existing pipeline).
DEFAULT_PARCEL_URL = (
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0"
)

BATCH_SIZE = 100


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest Cook County GIS parcel geometries into gis_parcels."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Download and parse data but do not write to Supabase.",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Fetch at most 20 features and print them; do not write.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if local cache exists.",
    )
    args = parser.parse_args()

    load_dotenv(PROJECT_ROOT / ".env.local")
    load_dotenv(PROJECT_ROOT / ".env")
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)

    cache_path = INTERIM_DIR / "cook_gis_parcels_raw.geojson"

    # ── 1. Resolve layer URL ──────────────────────────────────────────────────
    layer_url = (
        os.getenv("COOK_GIS_PARCELS_SOURCE_URL")
        or os.getenv("PARCEL_BOUNDARY_SOURCE_URL")
        or DEFAULT_PARCEL_URL
    )
    # Strip any trailing /query from environment variables that point to the
    # query endpoint rather than the layer root.
    if layer_url.endswith("/query"):
        layer_url = layer_url[: -len("/query")]
    print(f"Using parcel layer URL: {layer_url}")

    # ── 2. Download (or load from cache) ─────────────────────────────────────
    if cache_path.exists() and not args.force and not args.sample:
        print(f"Loading cached data from {cache_path.relative_to(PROJECT_ROOT)}")
        print("Pass --force to re-download.")
        with cache_path.open(encoding="utf-8") as f:
            features = json.load(f)
    else:
        print("Downloading parcels from Cook County GIS ...")
        features = download_parcels(layer_url, sample=args.sample)
        if not args.sample:
            cache_path.write_text(json.dumps(features), encoding="utf-8")
            print(f"Cached {len(features)} features to {cache_path.relative_to(PROJECT_ROOT)}")

    print(f"\nDownloaded {len(features)} features.")

    if args.sample:
        print("\n--- SAMPLE MODE: printing first 5 features ---")
        for feat in features[:5]:
            props = feat.get("properties") or {}
            geom = feat.get("geometry", {})
            geom_type = geom.get("type", "?") if geom else "none"
            print(json.dumps({**props, "__geom_type": geom_type}, indent=2))
        return

    # ── 3. Parse and normalize ────────────────────────────────────────────────
    rows = [normalize_feature(feat) for feat in features]
    rows = [r for r in rows if r is not None]
    print(f"Parsed {len(rows)} valid rows (discarded {len(features) - len(rows)} without geometry or PIN).")

    if args.dry_run:
        print("\n[DRY RUN] Would upsert the following into gis_parcels:")
        print(f"  {len(rows)} rows")
        if rows:
            print(f"\nSample row:\n{json.dumps(sample_row_for_display(rows[0]), indent=2)}")
        return

    # ── 4. Load to Supabase ───────────────────────────────────────────────────
    supabase = get_supabase_client()
    if not supabase:
        return

    source_id = upsert_source_registry(supabase, layer_url)
    if not source_id:
        print("ERROR: Could not upsert source_registry row.")
        return

    for row in rows:
        row["source_id"] = source_id

    print(f"\nUpserting {len(rows)} rows into gis_parcels ...")
    loaded = 0
    errors = 0
    for batch in batched(rows, BATCH_SIZE):
        try:
            supabase.table("gis_parcels").upsert(
                batch,
                on_conflict="source_id,source_feature_id",
            ).execute()
            loaded += len(batch)
            if loaded % 500 == 0:
                print(f"  {loaded} rows inserted ...")
        except Exception as exc:
            print(f"  ERROR loading batch: {exc}")
            errors += len(batch)
        time.sleep(0.05)

    print(f"\nDone. Inserted {loaded} rows, {errors} errors.")

    # Cross-check: how many gis_parcels PINs match parcels in the enriched table?
    cross_check(supabase, rows)

    print("\nNEXT STEP: Run scripts/match-parcels-to-lots.py (Sprint B)")


# ─── Download helpers ──────────────────────────────────────────────────────────

def download_parcels(layer_url: str, sample: bool = False) -> list[dict[str, Any]]:
    """Download all parcel features within the Park Ridge bounding box."""
    query_url = f"{layer_url}/query"
    lon_min, lat_min, lon_max, lat_max = PARK_RIDGE_BBOX_WGS84
    bbox_str = f"{lon_min},{lat_min},{lon_max},{lat_max}"

    features: list[dict[str, Any]] = []
    offset = 0
    limit = 20 if sample else PAGE_SIZE

    while True:
        params = {
            "f": "geojson",
            "geometry": bbox_str,
            "geometryType": "esriGeometryEnvelope",
            "inSR": "4326",
            "outSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "*",
            "returnGeometry": "true",
            "resultOffset": str(offset),
            "resultRecordCount": str(limit),
        }
        url = f"{query_url}?{urllib.parse.urlencode(params, safe=',=*')}"
        result = fetch_json(url, timeout=60)

        if not result:
            print(f"  WARNING: empty response at offset {offset}")
            break

        page_features = result.get("features", [])
        features.extend(page_features)
        print(f"  offset={offset}: +{len(page_features)} features (total {len(features)})")

        if sample or len(page_features) < limit:
            break
        offset += limit
        time.sleep(0.1)

    return features


def normalize_feature(feat: dict[str, Any]) -> dict[str, Any] | None:
    """Convert a GeoJSON feature to a gis_parcels row dict."""
    props = feat.get("properties") or {}
    geom = feat.get("geometry")

    if not geom:
        return None

    # Resolve PIN from multiple possible field names.
    raw_pin = (
        props.get("PIN") or props.get("Pin") or props.get("pin")
        or props.get("PIN14") or props.get("name") or props.get("NAME")
    )
    if not raw_pin:
        return None

    pin_normalized = normalize_pin(str(raw_pin))
    address = (
        props.get("ADDRESS") or props.get("Address") or props.get("address")
        or props.get("SITUSADR") or props.get("SitusAddress")
    )

    feature_id = str(
        props.get("objectid") or props.get("OBJECTID") or props.get("FID")
        or props.get("ObjectID") or props.get("GLOBALID") or id(feat)
    )

    return {
        "source_year": 2024,
        "source_feature_id": feature_id,
        "pin": str(raw_pin).strip(),
        "pin_normalized": pin_normalized,
        "address": str(address).strip() if address else None,
        "geometry": json.dumps(geom),
        "raw_properties": props,
        "confidence": "high",
    }


def normalize_pin(pin: str) -> str:
    """Normalize PIN to 14-digit string without hyphens."""
    digits = "".join(c for c in pin if c.isdigit())
    return digits.zfill(14)


# ─── Cross-check ──────────────────────────────────────────────────────────────

def cross_check(supabase, rows: list[dict[str, Any]]) -> None:
    """Compare gis_parcels PINs against the enriched parcels table."""
    gis_pins = {r["pin_normalized"] for r in rows if r.get("pin_normalized")}
    try:
        # Fetch all enriched parcel PINs (just the column, no geometry).
        result = supabase.table("parcels").select("pin_normalized").execute()
        enriched_pins = {row["pin_normalized"] for row in (result.data or [])}
        in_both = gis_pins & enriched_pins
        only_gis = gis_pins - enriched_pins
        only_enriched = enriched_pins - gis_pins
        print(f"\nCross-check with enriched parcels table:")
        print(f"  {len(in_both)} PINs in both gis_parcels and parcels")
        print(f"  {len(only_gis)} PINs only in gis_parcels (new since enriched dataset)")
        print(f"  {len(only_enriched)} PINs only in parcels (no GIS geometry downloaded)")
        if only_enriched:
            print("  Note: PINs missing from gis_parcels may be outside the bbox or missing from")
            print("  the GIS layer. These parcels will not be matched in Sprint B.")
    except Exception as exc:
        print(f"  (Cross-check skipped: {exc})")


# ─── Supabase helpers ──────────────────────────────────────────────────────────

def get_supabase_client():
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL in .env")
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except ImportError:
        print("supabase-py not installed. Run: pip install supabase")
        return None


def upsert_source_registry(supabase, layer_url: str) -> str | None:
    from datetime import datetime, timezone
    payload = {
        "source_key": SOURCE_KEY,
        "source_name": "Cook County GIS -- Current Parcels",
        "source_type": "gis_feature_layer",
        "publisher": "Cook County GIS Department",
        "access_method": "arcgis_rest",
        "coverage_area": "Cook County, IL",
        "source_url": layer_url,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "confidence_default": "high",
    }
    try:
        result = (
            supabase.table("source_registry")
            .upsert(payload, on_conflict="source_key")
            .execute()
        )
        rows = result.data
        if rows:
            return rows[0].get("id")
        row = (
            supabase.table("source_registry")
            .select("id")
            .eq("source_key", SOURCE_KEY)
            .single()
            .execute()
        )
        return row.data.get("id") if row.data else None
    except Exception as exc:
        print(f"ERROR upserting source_registry: {exc}")
        return None


# ─── Utility ──────────────────────────────────────────────────────────────────

def fetch_json(url: str, timeout: int = 20) -> dict[str, Any] | None:
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def batched(items: list[Any], size: int):
    for i in range(0, len(items), size):
        yield items[i: i + size]


def sample_row_for_display(row: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in row.items() if k not in ("geometry", "raw_properties")}


if __name__ == "__main__":
    main()
