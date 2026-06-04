from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

import geopandas as gpd
from shapely.geometry import Polygon

REPO_ROOT = Path(__file__).resolve().parents[2]
BOUNDARY_PATH = REPO_ROOT / "data" / "raw" / "park_ridge_boundary.geojson"
PARCELS_PATH = REPO_ROOT / "public" / "data" / "park_ridge_parcels_enriched.geojson"
RAW_OUTPUT = REPO_ROOT / "data" / "raw" / "historical" / "cook_county_building_footprints_park_ridge.geojson"
FOOTPRINT_OUTPUT = REPO_ROOT / "public" / "data" / "historical" / "cook_county_building_footprints_2017.geojson"
COVERAGE_OUTPUT = REPO_ROOT / "public" / "data" / "historical" / "park_ridge_lot_coverage.geojson"
PROCESSED_COVERAGE_OUTPUT = REPO_ROOT / "data" / "processed" / "historical" / "park_ridge_lot_coverage.geojson"

BUILDING_QUERY_URL = (
    "https://gis.cookcountyil.gov/traditional/rest/services/Planim/"
    "CookCountyBuildings/FeatureServer/0/query"
)
BUILDING_FIELDS = "OBJECTID,Area_SQFT,Year,Height,Ground_Z,Max_Point"
SPATIAL_CRS = "EPSG:3435"
PUBLIC_CRS = "EPSG:4326"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Park Ridge building footprint and lot coverage layers.")
    parser.add_argument("--force", action="store_true", help="Re-download Cook County building footprints.")
    parser.add_argument("--id-page-size", type=int, default=2000)
    parser.add_argument("--geometry-page-size", type=int, default=175)
    args = parser.parse_args()

    if args.force or not RAW_OUTPUT.exists():
        object_ids = fetch_park_ridge_object_ids(args.id_page_size)
        footprints = fetch_building_geometries(object_ids, args.geometry_page_size)
        write_footprints(footprints, RAW_OUTPUT)
    else:
        footprints = gpd.read_file(RAW_OUTPUT).to_crs(SPATIAL_CRS)

    boundary = gpd.read_file(BOUNDARY_PATH).to_crs(SPATIAL_CRS)
    footprints = footprints[footprints.intersects(boundary.union_all())].copy()
    footprints["layer_kind"] = "building_footprint"
    footprints["source_year"] = footprints["capture_year"].fillna(2017)
    footprints["source_note"] = (
        "Cook County building footprints clipped to Park Ridge; source metadata describes footprints "
        "as derived from county planimetric building data."
    )

    FOOTPRINT_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    footprints.to_crs(PUBLIC_CRS).to_file(FOOTPRINT_OUTPUT, driver="GeoJSON")

    lot_coverage = build_lot_coverage(footprints)
    COVERAGE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    lot_coverage.to_crs(PUBLIC_CRS).to_file(COVERAGE_OUTPUT, driver="GeoJSON")
    PROCESSED_COVERAGE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    lot_coverage.to_crs(PUBLIC_CRS).to_file(PROCESSED_COVERAGE_OUTPUT, driver="GeoJSON")

    print(f"Wrote {len(footprints):,} building footprints to {FOOTPRINT_OUTPUT}")
    print(f"Wrote {len(lot_coverage):,} parcel coverage features to {COVERAGE_OUTPUT}")


def fetch_park_ridge_object_ids(page_size: int) -> list[int]:
    boundary = gpd.read_file(BOUNDARY_PATH).to_crs(SPATIAL_CRS)
    xmin, ymin, xmax, ymax = boundary.total_bounds
    geometry = json.dumps({
        "xmin": xmin,
        "ymin": ymin,
        "xmax": xmax,
        "ymax": ymax,
        "spatialReference": {"wkid": 3435},
    })
    object_ids: list[int] = []
    offset = 0

    while True:
        payload = query_arcgis({
            "f": "json",
            "where": "1=1",
            "outFields": "OBJECTID",
            "returnGeometry": "false",
            "geometry": geometry,
            "geometryType": "esriGeometryEnvelope",
            "inSR": "3435",
            "spatialRel": "esriSpatialRelIntersects",
            "resultRecordCount": str(page_size),
            "resultOffset": str(offset),
            "orderByFields": "OBJECTID",
        })
        features = payload.get("features", [])
        object_ids.extend(int(feature["attributes"]["OBJECTID"]) for feature in features)
        if not payload.get("exceededTransferLimit") or len(features) == 0:
            break
        offset += len(features)
        print(f"Fetched {len(object_ids):,} candidate footprint ids...")

    return sorted(set(object_ids))


def fetch_building_geometries(object_ids: list[int], page_size: int) -> gpd.GeoDataFrame:
    rows: list[dict[str, Any]] = []
    geometries: list[Polygon] = []

    for start in range(0, len(object_ids), page_size):
        chunk = object_ids[start:start + page_size]
        where = f"OBJECTID IN ({', '.join(str(object_id) for object_id in chunk)})"
        payload = query_arcgis({
            "f": "json",
            "where": where,
            "outFields": BUILDING_FIELDS,
            "returnGeometry": "true",
        })
        for feature in payload.get("features", []):
            geometry = polygon_from_arcgis_rings(feature.get("geometry", {}).get("rings", []))
            if geometry is None:
                continue
            attrs = feature.get("attributes", {})
            rows.append({
                "objectid": attrs.get("OBJECTID"),
                "footprint_sqft": attrs.get("Area_SQFT"),
                "capture_year": parse_int(attrs.get("Year")),
                "height_ft": attrs.get("Height"),
                "ground_z": attrs.get("Ground_Z"),
                "max_point": attrs.get("Max_Point"),
            })
            geometries.append(geometry)
        if start and start % (page_size * 10) == 0:
            print(f"Fetched geometry for {min(start + page_size, len(object_ids)):,} candidate footprints...")
        time.sleep(0.05)

    return gpd.GeoDataFrame(rows, geometry=geometries, crs=SPATIAL_CRS)


def build_lot_coverage(footprints: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    parcels = gpd.read_file(PARCELS_PATH).to_crs(SPATIAL_CRS)
    parcels["parcel_area_sqft"] = parcels.geometry.area
    parcels["coverage_join_id"] = parcels.index

    points = footprints.copy()
    points.geometry = points.geometry.representative_point()
    joined = gpd.sjoin(
        points[["objectid", "footprint_sqft", "height_ft", "geometry"]],
        parcels[["coverage_join_id", "geometry"]],
        how="inner",
        predicate="within",
    )

    aggregates = joined.groupby("coverage_join_id").agg(
        building_footprint_sqft=("footprint_sqft", "sum"),
        footprint_count=("objectid", "count"),
        max_building_height_ft=("height_ft", "max"),
    )

    coverage = parcels.merge(aggregates, on="coverage_join_id", how="left")
    coverage["building_footprint_sqft"] = coverage["building_footprint_sqft"].fillna(0).round(1)
    coverage["footprint_count"] = coverage["footprint_count"].fillna(0).astype(int)
    coverage["max_building_height_ft"] = coverage["max_building_height_ft"].round(1)
    coverage["lot_coverage_pct"] = (
        coverage["building_footprint_sqft"] / coverage["parcel_area_sqft"].where(coverage["parcel_area_sqft"] > 0)
    ).fillna(0).clip(lower=0, upper=1).round(3)
    coverage["lot_coverage_class"] = coverage["lot_coverage_pct"].apply(coverage_class)
    coverage["layer_kind"] = "lot_coverage"
    coverage["source_note"] = "Computed by joining Cook County building footprints to Park Ridge parcel polygons."

    keep_columns = [
        "pin_normalized",
        "address",
        "year_built",
        "decade_built",
        "land_sqft",
        "building_sqft",
        "parcel_area_sqft",
        "building_footprint_sqft",
        "footprint_count",
        "max_building_height_ft",
        "lot_coverage_pct",
        "lot_coverage_class",
        "layer_kind",
        "source_note",
        "geometry",
    ]
    return coverage[[column for column in keep_columns if column in coverage.columns]]


def write_footprints(footprints: gpd.GeoDataFrame, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    footprints.to_file(output_path, driver="GeoJSON")


def query_arcgis(params: dict[str, str], retries: int = 3) -> dict[str, Any]:
    data = urllib.parse.urlencode(params).encode("utf-8")
    request = urllib.request.Request(BUILDING_QUERY_URL, data=data)
    request.add_header("Content-Type", "application/x-www-form-urlencoded")
    for attempt in range(retries):
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if "error" not in payload:
            return payload
        if attempt == retries - 1:
            raise RuntimeError(f"ArcGIS query failed: {payload['error']}")
        time.sleep(1 + attempt)
    raise RuntimeError("ArcGIS query failed.")


def polygon_from_arcgis_rings(rings: list[list[list[float]]]) -> Polygon | None:
    if not rings:
        return None
    try:
        polygon = Polygon(rings[0], rings[1:])
        if polygon.is_empty:
            return None
        if not polygon.is_valid:
            polygon = polygon.buffer(0)
        return polygon
    except (TypeError, ValueError):
        return None


def parse_int(value: object) -> int | None:
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return None


def coverage_class(value: float) -> str:
    if value >= 0.45:
        return "high_coverage"
    if value >= 0.28:
        return "moderate_coverage"
    if value > 0:
        return "low_coverage"
    return "no_footprint"


if __name__ == "__main__":
    main()
