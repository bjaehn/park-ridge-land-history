from __future__ import annotations

import argparse
import csv
import json
import math
import time
import urllib.parse
import urllib.request
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from scripts.data_sources import PROJECT_ROOT
from scripts.pipeline_utils import normalize_pin

SOCRATA_UNIVERSE = "https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json"
SOCRATA_IMPROVEMENTS = "https://datacatalog.cookcountyil.gov/resource/x54s-btds.json"
PARCEL_FEATURE_SERVER = "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0/query"

UNIVERSE_FIELDS = [
    "pin",
    "year",
    "class",
    "lat",
    "lon",
    "cook_municipality_name",
    "tax_municipality_name",
    "township_name",
    "township_code",
    "zip_code",
]

IMPROVEMENT_FIELDS = [
    "pin",
    "year",
    "card",
    "class",
    "township_code",
    "char_yrblt",
    "char_bldg_sf",
    "char_land_sf",
    "char_beds",
    "char_rooms",
    "char_fbath",
    "char_hbath",
    "char_type_resd",
    "char_cnst_qlty",
    "char_use",
    "row_id",
]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download current Park Ridge parcel, Parcel Universe, and assessor improvement data."
    )
    parser.add_argument("--municipality", default="CITY OF PARK RIDGE")
    parser.add_argument("--year", default="latest", help="Assessment year, or 'latest'.")
    parser.add_argument("--limit-pins", type=int, default=None, help="Optional small sample for development.")
    parser.add_argument("--chunk-size", type=int, default=75)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    load_dotenv(PROJECT_ROOT / ".env")

    raw_dir = PROJECT_ROOT / "data/raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    year = resolve_year(args.year, args.municipality)
    print(f"Using {args.municipality} assessment year {year}")

    universe_path = raw_dir / "parcel_universe.csv"
    improvements_path = raw_dir / "assessor_improvements.csv"
    parcels_path = raw_dir / "cook_county_parcels.geojson"

    universe_rows = fetch_universe(args.municipality, year)
    if args.limit_pins:
        universe_rows = universe_rows[: args.limit_pins]
        print(f"Limited to first {len(universe_rows)} PINs for development.")

    write_csv(universe_path, universe_rows, UNIVERSE_FIELDS, args.force)

    pins = sorted(
        {
            result["pin_normalized"]
            for result in (normalize_pin(row.get("pin")) for row in universe_rows)
            if result["pin_normalized"]
        }
    )
    print(f"Prepared {len(pins)} normalized PINs.")

    improvement_rows = fetch_improvements(pins, year, args.chunk_size)
    write_csv(improvements_path, improvement_rows, IMPROVEMENT_FIELDS, args.force)

    parcel_geojson = fetch_parcel_geometries(pins, args.chunk_size)
    parcels_path.write_text(json.dumps(parcel_geojson), encoding="utf-8")
    print(f"Wrote {len(parcel_geojson['features'])} parcel geometries to {parcels_path.relative_to(PROJECT_ROOT)}")


def resolve_year(year: str, municipality: str) -> str:
    if year != "latest":
        return str(int(float(year)))
    rows = socrata_get(
        SOCRATA_UNIVERSE,
        {
            "$select": "max(year)",
            "$where": f"cook_municipality_name='{municipality}'",
        },
    )
    value = rows[0].get("max_year") if rows else None
    if not value:
        raise RuntimeError("Could not determine latest Parcel Universe year.")
    return str(int(float(value)))


def fetch_universe(municipality: str, year: str) -> list[dict[str, Any]]:
    print("Downloading Parcel Universe rows...")
    return socrata_get_all(
        SOCRATA_UNIVERSE,
        {
            "$select": ",".join(UNIVERSE_FIELDS),
            "$where": f"cook_municipality_name='{municipality}' and year={year}",
            "$order": "pin",
        },
    )


def fetch_improvements(pins: list[str], year: str, chunk_size: int) -> list[dict[str, Any]]:
    print("Downloading assessor improvement rows...")
    rows: list[dict[str, Any]] = []
    for index, chunk in enumerate(chunks(pins, chunk_size), start=1):
        where = f"year={year} and pin in ({quoted_list(chunk)})"
        rows.extend(
            socrata_get_all(
                SOCRATA_IMPROVEMENTS,
                {
                    "$select": ",".join(IMPROVEMENT_FIELDS),
                    "$where": where,
                    "$order": "pin,card",
                },
            )
        )
        print_progress(index, len(pins), chunk_size, "improvement chunks")
    return rows


def fetch_parcel_geometries(pins: list[str], chunk_size: int) -> dict[str, Any]:
    print("Downloading parcel geometries...")
    features: list[dict[str, Any]] = []
    seen: set[str] = set()
    total_chunks = math.ceil(len(pins) / chunk_size)
    for index, chunk in enumerate(chunks(pins, chunk_size), start=1):
        payload = arcgis_get(
            {
                "f": "geojson",
                "outFields": "name,pin10,parceltype,taxcode",
                "returnGeometry": "true",
                "outSR": "4326",
                "where": f"name in ({quoted_list(chunk)})",
            }
        )
        for feature in payload.get("features", []):
            pin = feature.get("properties", {}).get("name")
            if pin and pin not in seen:
                seen.add(pin)
                features.append(feature)
        print(f"  parcel geometry chunks {index}/{total_chunks}: {len(features)} features")
        time.sleep(0.05)

    return {
        "type": "FeatureCollection",
        "name": "cook_county_park_ridge_parcels",
        "features": features,
    }


def socrata_get_all(base_url: str, params: dict[str, str], page_size: int = 50000) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        page_params = {**params, "$limit": str(page_size), "$offset": str(offset)}
        page = socrata_get(base_url, page_params)
        rows.extend(page)
        if len(page) < page_size:
            return rows
        offset += page_size


def socrata_get(base_url: str, params: dict[str, str]) -> list[dict[str, Any]]:
    with urllib.request.urlopen(f"{base_url}?{urllib.parse.urlencode(params, safe=',()*=')}", timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def arcgis_get(params: dict[str, str]) -> dict[str, Any]:
    with urllib.request.urlopen(f"{PARCEL_FEATURE_SERVER}?{urllib.parse.urlencode(params, safe=',()*=')}", timeout=90) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if "error" in payload:
        raise RuntimeError(payload["error"])
    return payload


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str], force: bool) -> None:
    if path.exists() and not force:
        print(f"Skip existing {path.relative_to(PROJECT_ROOT)}; pass --force to overwrite.")
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {path.relative_to(PROJECT_ROOT)}")


def chunks(values: list[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(values), size):
        yield values[index : index + size]


def quoted_list(values: Iterable[str]) -> str:
    return ",".join(f"'{value}'" for value in values)


def print_progress(index: int, item_count: int, chunk_size: int, label: str) -> None:
    total = math.ceil(item_count / chunk_size)
    print(f"  {label} {index}/{total}")
    time.sleep(0.05)


if __name__ == "__main__":
    main()
