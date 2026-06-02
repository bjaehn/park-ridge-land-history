from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from scripts.data_sources import PROJECT_ROOT


def validate_geojson(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if payload.get("type") != "FeatureCollection":
        raise ValueError(f"{path} is not a FeatureCollection")
    if not isinstance(payload.get("features"), list):
        raise ValueError(f"{path} does not contain a features array")
    return payload


def export_geojson(input_path: Path, public_path: Path) -> None:
    payload = validate_geojson(input_path)
    public_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(input_path, public_path)
    print(f"Copied {len(payload['features'])} features to {public_path.relative_to(PROJECT_ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate and publish processed GeoJSON to public/data.")
    parser.add_argument(
        "--input",
        type=Path,
        default=PROJECT_ROOT / "data/processed/park_ridge_parcels_enriched.geojson",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_ROOT / "public/data/park_ridge_parcels_enriched.geojson",
    )
    args = parser.parse_args()
    export_geojson(args.input, args.output)


if __name__ == "__main__":
    main()
