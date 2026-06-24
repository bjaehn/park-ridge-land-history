"""Ingest Cook County GIS Lots into the gis_lots Supabase table.

Cook County distributes lots data in two separate files:
  Lot_2019.csv    -- attribute table: OBJECTID, LOT, SUBBLK, PAGE_SUBREF, LOTTYPE, area/length
  <name>.geojson  -- polygon geometries: one feature per lot, OBJECTID joins back to CSV

This script handles both the split (CSV+GeoJSON) and single-file (GeoJSON with embedded
attributes) cases.

Split format (recommended for the 1.4M-record Cook County export):
  python scripts/ingest-cook-county-lots.py \\
      --file data/raw/Lot_2019.geojson \\
      --attr-csv data/raw/Lot_2019.csv

Single-file GeoJSON (attributes embedded in properties):
  python scripts/ingest-cook-county-lots.py --file /path/to/lots.geojson

FeatureServer download (requires a working public URL):
  python scripts/ingest-cook-county-lots.py --dry-run

In all modes the script:
  - Filters to the Park Ridge bounding box
  - Reprojects from EPSG:3435 to EPSG:4326 when needed
  - Upserts into gis_lots keyed on (source_id, source_feature_id)

Prerequisites:
  pip install ijson pyproj supabase python-dotenv
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Iterator

from dotenv import load_dotenv

# ─── Configuration ────────────────────────────────────────────────────────────

try:
    from scripts.data_sources import PROJECT_ROOT
except ImportError:
    PROJECT_ROOT = Path(__file__).resolve().parents[1]

INTERIM_DIR = PROJECT_ROOT / "data/interim/subdivisions"

# Park Ridge bounding box in WGS84 (lon_min, lat_min, lon_max, lat_max).
LON_MIN, LAT_MIN, LON_MAX, LAT_MAX = -87.875, 41.985, -87.790, 42.065

# Same box in EPSG:3435 (Illinois State Plane East, feet).
X_MIN_3435, Y_MIN_3435 = 1_055_000, 1_875_000
X_MAX_3435, Y_MAX_3435 = 1_095_000, 1_920_000

PAGE_SIZE = 500
BATCH_SIZE = 100
SOURCE_KEY = "cook_county_gis_lots"

DEFAULT_CANDIDATE_URLS = [
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Lot/FeatureServer/0",
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Lots/FeatureServer/0",
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/SubdivisionLots/FeatureServer/0",
]

# Default CSV attribute table path (set in .env or pass --attr-csv).
DEFAULT_ATTR_CSV = PROJECT_ROOT / "data/raw/Lot_2019.csv"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest Cook County GIS Lots into gis_lots table."
    )
    parser.add_argument(
        "--file", metavar="PATH",
        help="Path to GeoJSON geometry file. Streams it and filters to Park Ridge.",
    )
    parser.add_argument(
        "--attr-csv", metavar="PATH",
        default=str(DEFAULT_ATTR_CSV),
        help=f"Path to Lot_2019.csv attribute table (default: {DEFAULT_ATTR_CSV.name}). "
             "Only needed when the GeoJSON does not embed lot/block/subdivision attributes.",
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse and filter but do not write to Supabase.")
    parser.add_argument("--sample", action="store_true",
                        help="Process the first 20 matching features and print them; do not write.")
    parser.add_argument("--force", action="store_true",
                        help="Re-download even if local cache exists (FeatureServer mode only).")
    args = parser.parse_args()

    load_dotenv(PROJECT_ROOT / ".env.local")
    load_dotenv(PROJECT_ROOT / ".env")
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)

    # Pre-load attribute CSV if it exists (used when GeoJSON has no embedded attributes).
    attr_csv_path = Path(args.attr_csv)
    attr_lookup: dict[str, dict] = {}
    if attr_csv_path.exists():
        print(f"Loading attribute table: {attr_csv_path.name} ...")
        attr_lookup = load_attr_csv(attr_csv_path)
        print(f"  Loaded {len(attr_lookup):,} rows keyed by OBJECTID\n")
    elif args.file:
        print(f"Note: {attr_csv_path.name} not found — using only embedded GeoJSON properties.\n")

    if args.file:
        run_file_mode(
            Path(args.file), attr_lookup,
            dry_run=args.dry_run, sample=args.sample,
        )
    else:
        run_api_mode(attr_lookup, dry_run=args.dry_run, sample=args.sample, force=args.force)


# ─── Attribute CSV loader ─────────────────────────────────────────────────────

def load_attr_csv(path: Path) -> dict[str, dict]:
    """Read Lot_2019.csv into a dict keyed by OBJECTID string."""
    lookup: dict[str, dict] = {}
    with path.open(encoding="utf-8-sig", errors="replace") as f:
        for row in csv.DictReader(f):
            oid = row.get("OBJECTID", "").strip()
            if oid:
                lookup[oid] = row
    return lookup


# ─── File mode (streaming GeoJSON + CSV join) ─────────────────────────────────

def run_file_mode(
    file_path: Path,
    attr_lookup: dict[str, dict],
    dry_run: bool,
    sample: bool,
) -> None:
    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}")
        return

    file_size_mb = file_path.stat().st_size / 1_000_000
    print(f"Reading {file_path.name} ({file_size_mb:.0f} MB)")

    crs_wkid = detect_crs(file_path)
    in_state_plane = crs_wkid in (102671, 3435, 26971)
    print(f"CRS: wkid={crs_wkid} ({'EPSG:3435 State Plane' if in_state_plane else 'WGS84 assumed'})")

    reproject = None
    if in_state_plane:
        try:
            from pyproj import Transformer
            reproject = Transformer.from_crs(crs_wkid, 4326, always_xy=True).transform
            print("Reprojection: EPSG:3435 -> EPSG:4326 enabled")
        except ImportError:
            print("WARNING: pyproj not installed. Install with: pip install pyproj")

    print(f"Filtering to Park Ridge bounding box ...\n")

    rows: list[dict[str, Any]] = []
    seen = matched = 0
    report_every = 100_000

    try:
        for feat in stream_geojson(file_path):
            seen += 1
            if seen % report_every == 0:
                print(f"  Scanned {seen:,} features, {matched:,} in Park Ridge ...")

            geom = feat.get("geometry")
            if not geom:
                continue
            if not in_park_ridge_bbox(geom, in_state_plane):
                continue

            matched += 1
            row = normalize_feature(feat, attr_lookup=attr_lookup, reproject=reproject, idx=seen)
            if row:
                rows.append(row)

            if sample and matched >= 20:
                break

    except Exception as exc:
        print(f"ERROR reading file at feature {seen}: {exc}")
        if not rows:
            return

    print(f"\nScanned {seen:,} total features.")
    print(f"Found {matched:,} in Park Ridge bounding box.")
    print(f"Parsed {len(rows)} valid rows.")

    if sample:
        print("\n--- SAMPLE ---")
        for r in rows[:5]:
            display = {k: v for k, v in r.items() if k not in ("geometry", "raw_properties")}
            print(json.dumps(display, indent=2))
        return

    if dry_run:
        print(f"\n[DRY RUN] Would upsert {len(rows)} rows into gis_lots.")
        _print_subdivision_summary(rows)
        return

    _upsert_to_supabase(rows, source_url=str(file_path))


# ─── GeoJSON streaming ────────────────────────────────────────────────────────

def stream_geojson(file_path: Path) -> Iterator[dict[str, Any]]:
    """Stream GeoJSON features one at a time. Tries fiona, then ijson, then full load."""
    try:
        import fiona
        with fiona.open(str(file_path)) as src:
            for feat in src:
                yield {
                    "type": "Feature",
                    "geometry": feat.get("geometry"),
                    "properties": dict(feat.get("properties") or {}),
                    "_fiona_id": feat.get("id"),
                }
        return
    except ImportError:
        pass

    try:
        import ijson
        with file_path.open("rb") as f:
            for feat in ijson.items(f, "features.item"):
                yield feat
        return
    except ImportError:
        pass

    print("WARNING: Neither fiona nor ijson installed. Loading full file into memory.")
    print("Install with: pip install ijson")
    with file_path.open(encoding="utf-8") as f:
        data = json.load(f)
    for feat in data.get("features", []):
        yield feat


# ─── CRS detection ────────────────────────────────────────────────────────────

def detect_crs(file_path: Path) -> int:
    try:
        import fiona
        with fiona.open(str(file_path)) as src:
            crs = src.crs
            if crs and hasattr(crs, "to_epsg"):
                epsg = crs.to_epsg()
                return epsg if epsg else 4326
            if crs and "init" in crs:
                return int(crs["init"].replace("epsg:", ""))
    except Exception:
        pass

    try:
        with file_path.open(encoding="utf-8", errors="replace") as f:
            header = f.read(8192)

        # WGS84 indicators — check first, they are unambiguous.
        if any(s in header for s in ("CRS84", "EPSG:4326", "WGS_1984", "WGS84", '"4326"')):
            return 4326

        # State Plane indicators — use quoted/surrounded forms to avoid false
        # matches against coordinate digits or attribute values.
        if any(s in header for s in (
            "102671", '"3435"', "'3435'", "Illinois_StatePlane",
            "Illinois State Plane", "NAD83 / Illinois East",
        )):
            return 3435
    except Exception:
        pass

    # Last resort: peek at the first x-coordinate.
    # Cook County WGS84 longitudes are around -87 to -88 (abs < 180).
    # State Plane East feet are around 1,000,000–1,200,000 (abs > 10,000).
    try:
        with file_path.open(encoding="utf-8", errors="replace") as f:
            chunk = f.read(16384)
        # Find the first coordinate pair inside a "coordinates" array.
        coord_match = re.search(r'"coordinates"\s*:\s*\[+\s*\[\s*(-?\d+\.\d+)', chunk)
        if coord_match:
            x = float(coord_match.group(1))
            if abs(x) > 10000:
                return 3435
    except Exception:
        pass

    return 4326


# ─── Bounding box filter ──────────────────────────────────────────────────────

def in_park_ridge_bbox(geom: dict | None, in_state_plane: bool) -> bool:
    if not geom:
        return False
    if in_state_plane:
        xmin, ymin, xmax, ymax = X_MIN_3435, Y_MIN_3435, X_MAX_3435, Y_MAX_3435
    else:
        xmin, ymin, xmax, ymax = LON_MIN, LAT_MIN, LON_MAX, LAT_MAX

    coord = _first_coord(geom)
    if coord is None:
        return False
    x, y = coord
    return xmin <= x <= xmax and ymin <= y <= ymax


def _first_coord(geom: dict) -> tuple[float, float] | None:
    gtype = geom.get("type", "")
    coords = geom.get("coordinates")
    if not coords:
        return None
    try:
        if gtype == "Point":
            return float(coords[0]), float(coords[1])
        if gtype in ("MultiPoint", "LineString"):
            return float(coords[0][0]), float(coords[0][1])
        if gtype in ("MultiLineString", "Polygon"):
            return float(coords[0][0][0]), float(coords[0][0][1])
        if gtype == "MultiPolygon":
            return float(coords[0][0][0][0]), float(coords[0][0][0][1])
    except (IndexError, TypeError, ValueError):
        pass
    return None


# ─── Geometry reprojection ────────────────────────────────────────────────────

def reproject_geometry(geom: dict, reproject_fn) -> dict:
    gtype = geom.get("type", "")
    depths = {
        "Point": 1, "MultiPoint": 2, "LineString": 2,
        "MultiLineString": 3, "Polygon": 3, "MultiPolygon": 4,
    }
    depth = depths.get(gtype)
    if depth is None:
        return geom

    def _reproject(coords, d):
        if d == 1:
            return list(reproject_fn(coords[0], coords[1]))
        return [_reproject(c, d - 1) for c in coords]

    return {**geom, "coordinates": _reproject(geom["coordinates"], depth)}


# ─── Feature normalization ────────────────────────────────────────────────────

def _sanitize(obj):
    """Recursively convert Decimal to float so the value is JSON-serializable."""
    from decimal import Decimal
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize(v) for v in obj]
    return obj


def normalize_feature(
    feat: dict[str, Any],
    attr_lookup: dict[str, dict],
    reproject: Any,
    idx: int,
) -> dict[str, Any] | None:
    props = _sanitize(feat.get("properties") or feat.get("attributes") or {})
    geom = feat.get("geometry")
    if not geom:
        return None

    if reproject:
        try:
            geom = reproject_geometry(geom, reproject)
        except Exception:
            return None

    def get_prop(*keys):
        for k in keys:
            v = props.get(k)
            if v is not None and str(v).strip():
                return str(v).strip()
        return None

    # Resolve OBJECTID from embedded properties or fiona ID.
    feature_id = (
        get_prop("OBJECTID", "objectid", "FID", "OID")
        or str(feat.get("_fiona_id", ""))
        or str(idx)
    )

    # Join with CSV attribute table when available.
    csv_row = attr_lookup.get(feature_id, {}) if feature_id else {}

    # Prefer CSV attributes; fall back to embedded GeoJSON properties.
    lot_number = (
        csv_row.get("LOT") or get_prop("LOT", "LotNo", "LOT_NO", "lot_number", "Lot")
    )
    block_number = (
        csv_row.get("SUBBLK") or get_prop("SUBBLK", "BLOCK", "BlockNo", "BLOCK_NO", "block_number")
    )
    page_subref = (
        csv_row.get("PAGE_SUBREF") or get_prop("PAGE_SUBREF", "SUBDIVISIO", "SUBDIVISION", "SubName")
    )
    lot_type = csv_row.get("LOTTYPE") or get_prop("LOTTYPE", "LOTTYPE")
    shape_area = csv_row.get("SHAPE_Area") or get_prop("SHAPE_Area", "Shape_Area")
    shape_length = csv_row.get("SHAPE_Length") or get_prop("SHAPE_Length", "Shape_Length")

    # Clean up empty strings.
    block_number = block_number.strip() if block_number else None
    if block_number == "":
        block_number = None

    # PAGE_SUBREF is the subdivision identifier in Cook County's plat book system.
    # Use it as the subdivision_name since no human-readable name is in this dataset.
    subdivision_name = page_subref
    normalized_name = _normalize_subdivision_name(page_subref) if page_subref else None

    # Build raw_properties for audit trail.
    raw_props = {**props}
    if csv_row:
        raw_props["_csv"] = csv_row

    return {
        "source_year": 2025,
        "source_feature_id": feature_id,
        "geometry": json.dumps(_sanitize(geom)),
        "pin": None,
        "lot_number": lot_number,
        "block_number": block_number,
        "subdivision_name": subdivision_name,
        "normalized_subdivision_name": normalized_name,
        "township": None,
        "range": None,
        "section": None,
        "raw_properties": raw_props,
        "confidence": "medium",
    }


def _normalize_subdivision_name(name: str) -> str:
    n = name.lower().strip()
    n = n.replace("'", "").replace("'", "").replace("`", "")
    n = re.sub(r"\s+", "_", n)
    n = re.sub(r"[^a-z0-9_]", "", n)
    return n.strip("_")


# ─── FeatureServer mode (API download) ────────────────────────────────────────

def run_api_mode(
    attr_lookup: dict[str, dict],
    dry_run: bool,
    sample: bool,
    force: bool,
) -> None:
    cache_path = INTERIM_DIR / "cook_gis_lots_raw.geojson"
    layer_url = os.getenv("COOK_GIS_LOTS_SOURCE_URL") or _find_layer_url()
    if not layer_url:
        print("ERROR: Could not find the Cook County GIS Lots layer.")
        print("Use --file to read from a local GeoJSON file:")
        print("  python scripts/ingest-cook-county-lots.py --file data/raw/Lot_2019.geojson")
        return
    print(f"Using layer URL: {layer_url}")

    if cache_path.exists() and not force and not sample:
        print(f"Loading cached data from {cache_path.name}")
        with cache_path.open(encoding="utf-8") as f:
            features = json.load(f)
    else:
        features = _download_from_api(layer_url, sample=sample)
        if not sample:
            cache_path.write_text(json.dumps(features), encoding="utf-8")

    print(f"Downloaded {len(features)} features.")

    rows = [normalize_feature(f, attr_lookup=attr_lookup, reproject=None, idx=i)
            for i, f in enumerate(features)]
    rows = [r for r in rows if r]

    if sample:
        for r in rows[:5]:
            print(json.dumps({k: v for k, v in r.items() if k not in ("geometry", "raw_properties")}, indent=2))
        return

    if dry_run:
        print(f"\n[DRY RUN] Would upsert {len(rows)} rows into gis_lots.")
        _print_subdivision_summary(rows)
        return

    _upsert_to_supabase(rows, source_url=layer_url)


def _download_from_api(layer_url: str, sample: bool) -> list[dict[str, Any]]:
    query_url = f"{layer_url}/query"
    bbox = f"{LON_MIN},{LAT_MIN},{LON_MAX},{LAT_MAX}"
    features = []
    offset = 0
    limit = 20 if sample else PAGE_SIZE
    while True:
        params = {
            "f": "geojson", "geometry": bbox,
            "geometryType": "esriGeometryEnvelope", "inSR": "4326", "outSR": "4326",
            "spatialRel": "esriSpatialRelIntersects", "outFields": "*",
            "returnGeometry": "true", "resultOffset": str(offset),
            "resultRecordCount": str(limit),
        }
        url = f"{query_url}?{urllib.parse.urlencode(params, safe=',=*')}"
        result = _fetch_json(url, timeout=60)
        if not result:
            break
        page = result.get("features", [])
        features.extend(page)
        print(f"  offset={offset}: +{len(page)}")
        if sample or len(page) < limit:
            break
        offset += limit
        time.sleep(0.1)
    return features


def _find_layer_url() -> str | None:
    for url in DEFAULT_CANDIDATE_URLS:
        result = _fetch_json(f"{url}?f=json", timeout=10)
        if result and "fields" in result:
            return url
    return None


# ─── Supabase upsert ──────────────────────────────────────────────────────────

def _upsert_to_supabase(rows: list[dict[str, Any]], source_url: str) -> None:
    supabase = _get_supabase_client()
    if not supabase:
        return

    source_id = _upsert_source_registry(supabase, source_url)
    if not source_id:
        print("ERROR: Could not upsert source_registry row.")
        return

    for row in rows:
        row["source_id"] = source_id

    print(f"\nUpserting {len(rows)} rows into gis_lots ...")
    loaded = errors = 0
    for batch in _batched(rows, BATCH_SIZE):
        try:
            supabase.table("gis_lots").upsert(
                batch, on_conflict="source_id,source_feature_id"
            ).execute()
            loaded += len(batch)
            if loaded % 500 == 0:
                print(f"  {loaded} rows inserted ...")
        except Exception as exc:
            print(f"  ERROR loading batch: {exc}")
            errors += len(batch)
        time.sleep(0.05)

    print(f"\nDone. Inserted {loaded} rows, {errors} errors.")
    _print_subdivision_summary(rows)
    print("\nNEXT STEP: Run scripts/match-parcels-to-lots.py (Sprint B)")


def _upsert_source_registry(supabase, source_url: str) -> str | None:
    from datetime import datetime, timezone
    payload = {
        "source_key": SOURCE_KEY,
        "source_name": "Cook County GIS -- Subdivision Lots (2019)",
        "source_type": "gis_feature_layer",
        "publisher": "Cook County GIS Department",
        "access_method": "bulk_download",
        "coverage_area": "Cook County, IL",
        "source_url": source_url,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "confidence_default": "medium",
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

def _get_supabase_client():
    url = (os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
           or os.getenv("NEXT_PUBLIC_SUPABASE_URL"))
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


def _fetch_json(url: str, timeout: int = 20) -> dict[str, Any] | None:
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception:
        return None


def _batched(items, size: int):
    for i in range(0, len(items), size):
        yield items[i: i + size]


def _print_subdivision_summary(rows: list[dict[str, Any]]) -> None:
    from collections import Counter
    names = [r["subdivision_name"] for r in rows if r.get("subdivision_name")]
    counts = Counter(names)
    print(f"\nTop PAGE_SUBREF values in Park Ridge area ({len(counts)} unique plat pages):")
    for name, cnt in counts.most_common(25):
        print(f"  {cnt:5d}  {name}")
    if len(counts) > 25:
        print(f"  ... and {len(counts) - 25} more")


if __name__ == "__main__":
    main()
