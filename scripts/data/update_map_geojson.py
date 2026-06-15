"""Update the map GeoJSON with Supabase-enriched columns and trim to map-only properties.

Reads:  public/data/park_ridge_parcels_map.geojson  (existing, has geometry)
Writes: public/data/park_ridge_parcels_map.geojson  (same file, updated)

Changes made:
  - Adds neighborhood_id and street_name_normalized from Supabase
  - Strips all properties except the 7 fields the map actually uses
  - Result is ~3-5 MB instead of 29 MB

Usage:
  python -m scripts.data.update_map_geojson
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv(PROJECT_ROOT / ".env")

SUPABASE_URL = (
    os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    or os.getenv("VITE_SUPABASE_URL")
    or os.getenv("SUPABASE_URL")
    or ""
).rstrip("/")
SUPABASE_KEY = (
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    or os.getenv("VITE_SUPABASE_ANON_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or ""
)

MAP_FIELDS = {
    "pin_normalized",
    "address",
    "decade_built",
    "year_built",
    "permit_count",
    "neighborhood_id",
    "street_name_normalized",
}


def fetch_enrichment(page_size: int = 1000) -> dict[str, dict]:
    """Return {pin_normalized: {neighborhood_id, street_name_normalized}} for all parcels."""
    try:
        import requests
    except ImportError:
        raise SystemExit("requests not installed. Run: pip install requests")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    }
    url = f"{SUPABASE_URL}/rest/v1/parcels"
    params = {
        "select": "pin_normalized,neighborhood_id,street_name_normalized",
        "order": "pin_normalized",
    }

    result: dict[str, dict] = {}
    offset = 0
    while True:
        r = requests.get(
            url,
            headers={**headers, "Range": f"{offset}-{offset + page_size - 1}"},
            params=params,
            timeout=30,
        )
        r.raise_for_status()
        rows = r.json()
        if not rows:
            break
        for row in rows:
            pin = row.get("pin_normalized")
            if pin:
                result[pin] = {
                    "neighborhood_id": row.get("neighborhood_id"),
                    "street_name_normalized": row.get("street_name_normalized"),
                }
        print(f"  fetched {offset + len(rows):,} parcels...", end="\r")
        if len(rows) < page_size:
            break
        offset += page_size
        time.sleep(0.05)

    print(f"\n  total enrichment rows: {len(result):,}")
    return result


def main() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit(
            "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and "
            "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
        )

    geojson_path = PROJECT_ROOT / "public" / "data" / "park_ridge_parcels_map.geojson"
    if not geojson_path.exists():
        raise SystemExit(f"GeoJSON not found: {geojson_path}")

    print(f"Reading {geojson_path} ({geojson_path.stat().st_size / 1_048_576:.1f} MB)...")
    with geojson_path.open(encoding="utf-8") as f:
        fc = json.load(f)

    features = fc.get("features", [])
    print(f"Loaded {len(features):,} features.")

    print("Fetching enrichment data from Supabase...")
    enrichment = fetch_enrichment()

    updated = skipped = 0
    for feat in features:
        props = feat.get("properties") or {}
        pin = props.get("pin_normalized")
        extra = enrichment.get(pin, {})

        slim = {k: props.get(k) for k in MAP_FIELDS}
        slim["neighborhood_id"] = extra.get("neighborhood_id") or props.get("neighborhood_id")
        slim["street_name_normalized"] = extra.get("street_name_normalized") or props.get("street_name_normalized")
        feat["properties"] = slim
        if extra:
            updated += 1
        else:
            skipped += 1

    print(f"Updated: {updated:,}  Skipped (no Supabase match): {skipped:,}")

    out = json.dumps(fc, separators=(",", ":"), ensure_ascii=False)
    geojson_path.write_text(out, encoding="utf-8")
    size_mb = geojson_path.stat().st_size / 1_048_576
    print(f"Saved {geojson_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
