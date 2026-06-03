from __future__ import annotations

import argparse
import json
import tempfile
import urllib.request
import zipfile
from pathlib import Path

import geopandas as gpd

from scripts.data_sources import PROJECT_ROOT

TIGER_ILLINOIS_PLACES_2024 = "https://www2.census.gov/geo/tiger/TIGER2024/PLACE/tl_2024_17_place.zip"
PARK_RIDGE_PLACEFP = "57875"


def download_park_ridge_boundary(
    output_path: Path = PROJECT_ROOT / "public/data/park_ridge_boundary.geojson",
    raw_path: Path = PROJECT_ROOT / "data/raw/park_ridge_boundary.geojson",
) -> dict[str, object]:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        zip_path = temp_path / "illinois_places.zip"
        zip_path.write_bytes(urllib.request.urlopen(TIGER_ILLINOIS_PLACES_2024, timeout=90).read())
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(temp_path)

        source_path = next(temp_path.glob("*.shp"))
        places = gpd.read_file(source_path)
        boundary = places.loc[places["PLACEFP"] == PARK_RIDGE_PLACEFP].copy()
        if boundary.empty:
            raise RuntimeError("Could not find Park Ridge in the Census Illinois places file.")

        boundary = boundary.to_crs("EPSG:4326")
        boundary["name"] = "Park Ridge"
        boundary["source_name"] = "U.S. Census Bureau TIGER/Line Places 2024"
        boundary["source_url"] = TIGER_ILLINOIS_PLACES_2024
        boundary["source_note"] = "Municipal place boundary replacing the previous synthetic display box."
        boundary["source_year"] = 2024
        boundary = boundary[[
            "name",
            "NAMELSAD",
            "GEOID",
            "ALAND",
            "AWATER",
            "source_name",
            "source_url",
            "source_note",
            "source_year",
            "geometry",
        ]]

        for path in (raw_path, output_path, PROJECT_ROOT / "data/processed/park_ridge_boundary.geojson"):
            path.parent.mkdir(parents=True, exist_ok=True)
            boundary.to_file(path, driver="GeoJSON")

    payload = json.loads(output_path.read_text(encoding="utf-8"))
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Download the real Park Ridge municipal boundary.")
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "public/data/park_ridge_boundary.geojson")
    args = parser.parse_args()
    payload = download_park_ridge_boundary(output_path=args.output)
    print(f"Wrote {len(payload['features'])} Park Ridge boundary feature to {args.output}")


if __name__ == "__main__":
    main()
