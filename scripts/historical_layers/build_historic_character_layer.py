from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd

REPO_ROOT = Path(__file__).resolve().parents[2]
PARCELS_PATH = REPO_ROOT / "public" / "data" / "park_ridge_parcels_enriched.geojson"
OUTPUT_PATH = REPO_ROOT / "public" / "data" / "historical" / "park_ridge_historic_character.geojson"
PROCESSED_OUTPUT_PATH = REPO_ROOT / "data" / "processed" / "historical" / "park_ridge_historic_character.geojson"
REFERENCE_YEAR = 2026


def main() -> None:
    parser = argparse.ArgumentParser(description="Build assessor-derived historic character candidates.")
    parser.add_argument("--reference-year", type=int, default=REFERENCE_YEAR)
    args = parser.parse_args()

    parcels = gpd.read_file(PARCELS_PATH)
    parcels["year_built_numeric"] = parcels["year_built"].apply(parse_year)
    candidates = parcels[
        parcels["year_built_numeric"].notna()
        & (parcels["year_built_numeric"] <= args.reference_year - 100)
    ].copy()

    candidates["historic_character_type"] = candidates["year_built_numeric"].apply(character_type)
    candidates["historic_character_score"] = candidates["year_built_numeric"].apply(
        lambda year: character_score(year, args.reference_year)
    )
    candidates["historic_character_label"] = candidates.apply(character_label, axis=1)
    candidates["layer_kind"] = "historic_character"
    candidates["source_note"] = (
        "Assessor-derived 100-year-home candidate layer. This is not an official landmark designation."
    )

    keep_columns = [
        "pin_normalized",
        "address",
        "year_built",
        "decade_built",
        "historic_character_type",
        "historic_character_score",
        "historic_character_label",
        "permit_count",
        "latest_permit_year",
        "layer_kind",
        "source_note",
        "geometry",
    ]
    candidates = candidates[[column for column in keep_columns if column in candidates.columns]]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    candidates.to_file(OUTPUT_PATH, driver="GeoJSON")
    PROCESSED_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    candidates.to_file(PROCESSED_OUTPUT_PATH, driver="GeoJSON")
    print(f"Wrote {len(candidates):,} historic character candidates to {OUTPUT_PATH}")


def parse_year(value: object) -> int | None:
    try:
        year = int(float(str(value)))
    except (TypeError, ValueError):
        return None
    if year < 1800 or year > REFERENCE_YEAR:
        return None
    return year


def character_type(year: int) -> str:
    if year < 1900:
        return "pre_1900"
    if year < 1910:
        return "early_1900s"
    if year < 1920:
        return "pre_1920"
    return "century_home"


def character_score(year: int, reference_year: int) -> float:
    age = reference_year - year
    return round(min(1, max(0, (age - 100) / 45)), 2)


def character_label(row: object) -> str:
    year = int(row["year_built_numeric"])
    address = row.get("address")
    if address:
        return f"{address} ({year})"
    return f"Built circa {year}"


if __name__ == "__main__":
    main()
