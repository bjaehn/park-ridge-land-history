from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from scripts.data_sources import PROJECT_ROOT
from scripts.pipeline_utils import normalize_pin

COOK_2021_PARCELS_GEOJSON = "https://datacatalog.cookcountyil.gov/resource/77tz-riq7.geojson"
COOK_2021_PARCELS_PAGE = "https://datacatalog.cookcountyil.gov/Boundaries-Districts/ccgisdata-Parcel-2021/77tz-riq7"


def download_cook_2021_park_ridge_parcels(
    output_path: Path = PROJECT_ROOT / "public/data/historical/cook_parcels_2021.geojson",
    municipality: str = "Park Ridge",
) -> dict[str, Any]:
    params = {
        "$limit": "50000",
        "$where": f"municipality='{municipality}'",
    }
    url = f"{COOK_2021_PARCELS_GEOJSON}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=180) as response:
        payload = json.loads(response.read().decode("utf-8"))

    features = [normalize_feature(feature) for feature in payload.get("features", [])]
    result = {
        "type": "FeatureCollection",
        "name": "cook_county_park_ridge_parcels_2021",
        "features": features,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    return result


def normalize_feature(feature: dict[str, Any]) -> dict[str, Any]:
    properties = feature.get("properties", {})
    pin_normalized = pin14_from_2021_properties(properties)
    pin_result = normalize_pin(pin_normalized)
    normalized_pin = pin_result["pin_normalized"]
    return {
        "type": "Feature",
        "properties": {
            "pin_normalized": normalized_pin,
            "pin_original": format_pin(normalized_pin) if normalized_pin else None,
            "pin10": properties.get("pin10"),
            "pinu": str(properties.get("pinu") or "0").zfill(4),
            "source_year": 2021,
            "municipality": properties.get("municipality"),
            "parceltype": properties.get("parceltype"),
            "property_class": properties.get("assessorbldgclass"),
            "political_township": properties.get("politicaltownship"),
            "source_name": "Cook County ccgisdata - Parcel 2021",
            "source_url": COOK_2021_PARCELS_PAGE,
            "source_note": "Official Cook County 2021 parcel snapshot filtered to municipality = Park Ridge.",
            "synthetic_sample": False,
        },
        "geometry": feature.get("geometry"),
    }


def pin14_from_2021_properties(properties: dict[str, Any]) -> str:
    pin10 = str(properties.get("pin10") or "").zfill(10)
    pinu = str(properties.get("pinu") or "0").zfill(4)
    return f"{pin10}{pinu}"


def format_pin(pin: str | None) -> str | None:
    if not pin or len(pin) != 14:
        return pin
    return f"{pin[0:2]}-{pin[2:4]}-{pin[4:7]}-{pin[7:10]}-{pin[10:14]}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Download Cook County 2021 Park Ridge parcel boundaries.")
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "public/data/historical/cook_parcels_2021.geojson")
    parser.add_argument("--municipality", default="Park Ridge")
    args = parser.parse_args()
    result = download_cook_2021_park_ridge_parcels(args.output, args.municipality)
    print(f"Wrote {len(result['features'])} 2021 parcel features to {args.output}")


if __name__ == "__main__":
    main()
