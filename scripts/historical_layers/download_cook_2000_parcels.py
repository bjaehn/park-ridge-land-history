from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

import geopandas as gpd
from shapely.geometry import mapping

from scripts.data_sources import PROJECT_ROOT
from scripts.pipeline_utils import normalize_pin

COOK_2000_PARCELS_GEOJSON = "https://datacatalog.cookcountyil.gov/resource/bbcr-ryng.geojson"
COOK_2000_PARCELS_PAGE = "https://datacatalog.cookcountyil.gov/Property-Taxation/2000Parcels/bbcr-ryng"


def download_cook_2000_park_ridge_parcels(
    output_path: Path = PROJECT_ROOT / "public/data/historical/cook_parcels_2000.geojson",
    boundary_path: Path = PROJECT_ROOT / "public/data/park_ridge_boundary.geojson",
) -> dict[str, Any]:
    boundary = gpd.read_file(boundary_path).to_crs("EPSG:4326")
    west, south, east, north = boundary.total_bounds
    raw_payload = fetch_bbox_features(north=north, west=west, south=south, east=east)
    raw_features = raw_payload.get("features", [])
    candidates = gpd.GeoDataFrame.from_features(raw_features, crs="EPSG:4326")

    if candidates.empty:
        raise RuntimeError("Cook County 2000 parcel query returned no features.")

    boundary_projected = boundary.to_crs("EPSG:3435")
    candidates_projected = candidates.to_crs("EPSG:3435")
    boundary_union = boundary_projected.geometry.union_all()
    filtered = candidates.loc[candidates_projected.geometry.centroid.within(boundary_union)].copy()

    features = [normalize_feature(row) for _, row in filtered.iterrows()]
    result = {
        "type": "FeatureCollection",
        "name": "cook_county_park_ridge_parcels_2000",
        "features": features,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    return result


def fetch_bbox_features(north: float, west: float, south: float, east: float) -> dict[str, Any]:
    params = {
        "$limit": "50000",
        "$where": f"within_box(the_geom,{north},{west},{south},{east})",
    }
    url = f"{COOK_2000_PARCELS_GEOJSON}?{urllib.parse.urlencode(params, safe=',()')}"
    with urllib.request.urlopen(url, timeout=240) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_feature(row: Any) -> dict[str, Any]:
    pin_result = normalize_pin(row.get("pin14"))
    normalized_pin = pin_result["pin_normalized"]
    return {
        "type": "Feature",
        "properties": {
            "pin_normalized": normalized_pin,
            "pin_original": format_pin(normalized_pin) if normalized_pin else row.get("pin14"),
            "pin10": row.get("pin10"),
            "pinu": str(row.get("pinu") or "0").zfill(4),
            "source_year": 2000,
            "parceltype": row.get("parceltype"),
            "taxcode": row.get("taxcode"),
            "shape_area": numeric_or_none(row.get("shape_area")),
            "shape_len": numeric_or_none(row.get("shape_len")),
            "source_name": "Cook County 2000Parcels",
            "source_url": COOK_2000_PARCELS_PAGE,
            "source_note": "Official Cook County 2000 parcel snapshot spatially filtered to parcels with centroids inside the current Park Ridge municipal boundary.",
            "park_ridge_filter_method": "centroid_within_2024_tiger_boundary",
            "synthetic_sample": False,
        },
        "geometry": mapping(row.geometry),
    }


def numeric_or_none(value: Any) -> float | None:
    try:
        if value in (None, ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def format_pin(pin: str | None) -> str | None:
    if not pin or len(pin) != 14:
        return pin
    return f"{pin[0:2]}-{pin[2:4]}-{pin[4:7]}-{pin[7:10]}-{pin[10:14]}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Download Cook County 2000 Park Ridge parcel boundaries.")
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "public/data/historical/cook_parcels_2000.geojson")
    parser.add_argument("--boundary", type=Path, default=PROJECT_ROOT / "public/data/park_ridge_boundary.geojson")
    args = parser.parse_args()
    result = download_cook_2000_park_ridge_parcels(args.output, args.boundary)
    print(f"Wrote {len(result['features'])} 2000 parcel features to {args.output}")


if __name__ == "__main__":
    main()
