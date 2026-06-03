from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv

from scripts.data_sources import DATA_SOURCES, PROJECT_ROOT
from scripts.pipeline_utils import (
    BUILDING_SQFT_COLUMN_CANDIDATES,
    PIN_COLUMN_CANDIDATES,
    YEAR_BUILT_COLUMN_CANDIDATES,
    choose_primary_record,
    decade_bucket,
    find_likely_column,
    normalize_column_name,
    normalize_pin,
    parse_year,
    year_quality_flags,
)

LAND_SQFT_COLUMN_CANDIDATES = ("land_sqft", "char_land_sf", "land_square_feet", "land_sf", "land_area", "lot_sqft")
ADDRESS_COLUMN_CANDIDATES = ("address", "property_address", "site_address", "mail_address", "addr")
MUNICIPALITY_COLUMN_CANDIDATES = (
    "municipality",
    "city",
    "cook_municipality_name",
    "tax_municipality_name",
    "tax_municipality",
    "location_city",
)
PROPERTY_CLASS_COLUMN_CANDIDATES = ("property_class", "class", "property_use", "major_class")


def read_table(path: Path) -> Any:
    suffix = path.suffix.lower()
    if suffix in {".geojson", ".json", ".gpkg", ".shp"}:
        import geopandas as gpd

        return gpd.read_file(path)
    return pd.read_csv(path, dtype="string")


def required_source(name_startswith: str) -> Path:
    for source in DATA_SOURCES:
        if source.name.startswith(name_startswith):
            return source.local_path
    raise KeyError(name_startswith)


def optional_source(name_startswith: str) -> Path | None:
    path = required_source(name_startswith)
    return path if path.exists() else None


def add_normalized_pin_columns(frame: pd.DataFrame, pin_column: str) -> pd.DataFrame:
    normalized = frame[pin_column].map(normalize_pin).apply(pd.Series)
    return pd.concat([frame, normalized], axis=1)


def build_primary_improvements(improvements: pd.DataFrame) -> pd.DataFrame:
    pin_column = find_likely_column(improvements.columns, PIN_COLUMN_CANDIDATES)
    year_column = find_likely_column(improvements.columns, YEAR_BUILT_COLUMN_CANDIDATES)
    sqft_column = find_likely_column(improvements.columns, BUILDING_SQFT_COLUMN_CANDIDATES)
    land_column = find_likely_column(improvements.columns, LAND_SQFT_COLUMN_CANDIDATES)
    address_column = find_likely_column(improvements.columns, ADDRESS_COLUMN_CANDIDATES)
    municipality_column = find_likely_column(improvements.columns, MUNICIPALITY_COLUMN_CANDIDATES)
    class_column = find_likely_column(improvements.columns, PROPERTY_CLASS_COLUMN_CANDIDATES)

    if not pin_column:
        raise ValueError(f"No likely PIN column found in improvements columns: {list(improvements.columns)}")
    if not year_column:
        print("No likely year-built column found. Year-built values will be Unknown.")

    normalized = add_normalized_pin_columns(improvements.copy(), pin_column)
    records: list[dict[str, Any]] = []

    for pin, group in normalized.dropna(subset=["pin_normalized"]).groupby("pin_normalized"):
        rows = group.to_dict(orient="records")
        primary, method = choose_primary_record(
            rows,
            year_column=year_column or "__missing_year__",
            sqft_column=sqft_column or "__missing_sqft__",
        )
        primary = primary or {}
        years = [parse_year(row.get(year_column)) for row in rows] if year_column else []
        valid_years = [year for year in years if year is not None]
        primary_year = parse_year(primary.get(year_column)) if year_column else None
        flags = set(year_quality_flags(primary_year))
        if primary.get("pin_quality_flag"):
            flags.add(str(primary["pin_quality_flag"]))
        if len(rows) > 1:
            flags.add("multiple_improvements")

        records.append(
            {
                "pin_normalized": pin,
                "pin_original": primary.get("pin_original"),
                "address": primary.get(address_column) if address_column else None,
                "municipality": primary.get(municipality_column) if municipality_column else None,
                "property_class": primary.get(class_column) if class_column else None,
                "year_built": primary_year,
                "decade_built": decade_bucket(primary_year),
                "building_sqft": numeric_or_none(primary.get(sqft_column)) if sqft_column else None,
                "land_sqft": numeric_or_none(primary.get(land_column)) if land_column else None,
                "improvement_count": len(rows),
                "min_year_built": min(valid_years) if valid_years else None,
                "max_year_built": max(valid_years) if valid_years else None,
                "primary_building_selection_method": method,
                "data_quality_flags": sorted(flags),
            }
        )

    return pd.DataFrame(records)


def enrich_with_universe(primary: pd.DataFrame, universe: pd.DataFrame) -> pd.DataFrame:
    pin_column = find_likely_column(universe.columns, PIN_COLUMN_CANDIDATES)
    if not pin_column:
        print("Parcel universe file found, but no likely PIN column was detected.")
        return primary

    normalized = add_normalized_pin_columns(universe.copy(), pin_column)
    universe_small = pd.DataFrame({"pin_normalized": normalized["pin_normalized"]})
    universe_field_map = {
        "address": find_likely_column(normalized.columns, ADDRESS_COLUMN_CANDIDATES),
        "municipality": find_likely_column(normalized.columns, MUNICIPALITY_COLUMN_CANDIDATES),
        "property_class": find_likely_column(normalized.columns, PROPERTY_CLASS_COLUMN_CANDIDATES),
        "land_sqft": find_likely_column(normalized.columns, LAND_SQFT_COLUMN_CANDIDATES),
    }
    for target, source in universe_field_map.items():
        if source:
            universe_small[f"{target}_universe"] = normalized[source]

    universe_small = universe_small.drop_duplicates("pin_normalized")
    joined = primary.merge(universe_small, on="pin_normalized", how="left")

    for target in ["address", "municipality", "property_class", "land_sqft"]:
        fallback = f"{target}_universe"
        if fallback in joined:
            if target not in joined:
                joined[target] = None
            joined[target] = joined[target].combine_first(joined[fallback])
    return joined


def filter_to_municipality(parcels: Any, boundary_path: Path | None, metadata: pd.DataFrame | None) -> tuple[Any, str]:
    import geopandas as gpd

    target = "Park Ridge"
    if boundary_path:
        boundary = gpd.read_file(boundary_path)
        if boundary.empty:
            print("Boundary file is empty; falling back to attribute filtering.")
        else:
            parcels_projected = parcels.to_crs("EPSG:3435")
            boundary_projected = boundary.to_crs("EPSG:3435")
            union = boundary_projected.geometry.union_all()
            parcels = parcels.copy()
            parcels["centroid_in_target_boundary"] = parcels_projected.geometry.centroid.within(union).values
            parcels["intersects_target_boundary"] = parcels_projected.intersects(union).values
            return parcels[parcels["centroid_in_target_boundary"]].copy(), "centroid_within_boundary"

    muni_column = find_likely_column(parcels.columns, MUNICIPALITY_COLUMN_CANDIDATES)
    if muni_column:
        return parcels[parcels[muni_column].astype(str).str.contains(target, case=False, na=False)].copy(), f"parcel_attribute:{muni_column}"

    if metadata is not None and "municipality" in metadata.columns:
        target_pins = set(metadata.loc[metadata["municipality"].astype(str).str.contains(target, case=False, na=False), "pin_normalized"])
        return parcels[parcels["pin_normalized"].isin(target_pins)].copy(), "joined_metadata_municipality"

    print("No Park Ridge boundary or municipality field found. Exporting all parcel records.")
    return parcels.copy(), "no_filter_available"


def build_dataset() -> None:
    load_dotenv(PROJECT_ROOT / ".env")
    parcel_path = required_source("Cook County parcel")
    improvement_path = required_source("Cook County Assessor")

    if not parcel_path.exists():
        raise FileNotFoundError(f"Parcel boundary file missing: {parcel_path}")
    if not improvement_path.exists():
        raise FileNotFoundError(f"Assessor improvement file missing: {improvement_path}")

    print("Reading source files...")
    parcels = read_table(parcel_path)
    improvements = read_table(improvement_path)

    if not hasattr(parcels, "geometry"):
        raise ValueError("Parcel source must include geometry. Use a GeoJSON, GPKG, or shapefile source.")

    parcel_pin_column = find_likely_column(parcels.columns, PIN_COLUMN_CANDIDATES)
    if not parcel_pin_column:
        raise ValueError(f"No likely PIN column found in parcel columns: {list(parcels.columns)}")

    parcels = add_normalized_pin_columns(parcels.copy(), parcel_pin_column)
    primary = build_primary_improvements(pd.DataFrame(improvements.drop(columns="geometry", errors="ignore")))

    universe_path = optional_source("Cook County parcel universe")
    if universe_path:
        universe = pd.DataFrame(read_table(universe_path).drop(columns="geometry", errors="ignore"))
        primary = enrich_with_universe(primary, universe)

    filtered_parcels, filter_method = filter_to_municipality(
        parcels,
        optional_source("Park Ridge municipal boundary"),
        primary,
    )
    enriched = filtered_parcels.merge(primary, on="pin_normalized", how="left", suffixes=("_parcel", ""))

    for column in ["address", "municipality", "property_class", "year_built", "decade_built", "building_sqft", "land_sqft", "improvement_count", "primary_building_selection_method"]:
        if column not in enriched:
            enriched[column] = None

    enriched["decade_built"] = enriched["decade_built"].fillna("Unknown")
    enriched["data_quality_flags"] = enriched["data_quality_flags"].apply(normalize_flags)
    enriched["source_note"] = "Cook County parcel and assessor data. Owner names intentionally omitted."

    output_columns = [
        "pin_normalized",
        "pin_original",
        "address",
        "municipality",
        "property_class",
        "year_built",
        "decade_built",
        "building_sqft",
        "land_sqft",
        "improvement_count",
        "primary_building_selection_method",
        "data_quality_flags",
        "source_note",
        "geometry",
    ]
    diagnostic_columns = [column for column in ["centroid_in_target_boundary", "intersects_target_boundary"] if column in enriched]
    enriched = enriched[output_columns + diagnostic_columns]

    processed_path = PROJECT_ROOT / "data/processed/park_ridge_parcels_enriched.geojson"
    public_path = PROJECT_ROOT / "public/data/park_ridge_parcels_enriched.geojson"
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    public_path.parent.mkdir(parents=True, exist_ok=True)
    enriched.to_file(processed_path, driver="GeoJSON")
    enriched.to_file(public_path, driver="GeoJSON")

    boundary_path = optional_source("Park Ridge municipal boundary")
    if boundary_path:
        public_boundary = PROJECT_ROOT / "public/data/park_ridge_boundary.geojson"
        processed_boundary = PROJECT_ROOT / "data/processed/park_ridge_boundary.geojson"
        boundary = read_table(boundary_path)
        boundary.to_file(public_boundary, driver="GeoJSON")
        boundary.to_file(processed_boundary, driver="GeoJSON")

    write_summary(enriched, filter_method)
    print(f"Wrote {processed_path.relative_to(PROJECT_ROOT)}")
    print(f"Wrote {public_path.relative_to(PROJECT_ROOT)}")


def write_summary(enriched: Any, filter_method: str) -> None:
    years = [parse_year(year) for year in enriched["year_built"].tolist()]
    valid_years = [year for year in years if year is not None]
    decade_counts = Counter(enriched["decade_built"].fillna("Unknown").tolist())
    summary = {
        "total_parcels": int(len(enriched)),
        "parcels_with_year_built": int(len(valid_years)),
        "parcels_missing_year_built": int(len(enriched) - len(valid_years)),
        "earliest_year_built": min(valid_years) if valid_years else None,
        "latest_year_built": max(valid_years) if valid_years else None,
        "count_by_decade": dict(sorted(decade_counts.items())),
        "data_source_names": [source.name for source in DATA_SOURCES],
        "park_ridge_filter_method": filter_method,
        "build_timestamp": datetime.now(timezone.utc).isoformat(),
        "known_limitations": [
            "Year built is assessor structure age, not subdivision date.",
            "Current parcel polygons do not reconstruct historical parcel splits or consolidations.",
            "Primary building selection is a transparent v1 heuristic."
        ],
    }
    output = PROJECT_ROOT / "data/processed/parcel_summary.json"
    output.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Wrote {output.relative_to(PROJECT_ROOT)}")


def numeric_or_none(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_flags(value: Any) -> list[str]:
    if isinstance(value, list):
        return value
    if value is None or pd.isna(value):
        return ["missing_assessor_join"]
    return [str(value)]


if __name__ == "__main__":
    build_dataset()
