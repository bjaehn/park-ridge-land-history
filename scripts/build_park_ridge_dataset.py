from __future__ import annotations

import json
import re
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
ADDRESS_COLUMN_CANDIDATES = (
    "address",
    "property_address",
    "site_address",
    "prop_address_full",
    "mail_address",
    "addr",
)
MUNICIPALITY_COLUMN_CANDIDATES = (
    "municipality",
    "city",
    "cook_municipality_name",
    "tax_municipality_name",
    "tax_municipality",
    "location_city",
)
PROPERTY_CLASS_COLUMN_CANDIDATES = ("property_class", "class", "property_use", "major_class")
PERMIT_DATE_COLUMN_CANDIDATES = ("date_issued", "issued_date", "permit_date")
PERMIT_YEAR_COLUMN_CANDIDATES = ("year", "permit_year")
PERMIT_DESCRIPTION_COLUMN_CANDIDATES = ("work_description", "description", "permit_description")
PERMIT_STATUS_COLUMN_CANDIDATES = ("status", "permit_status")
PERMIT_NUMBER_COLUMN_CANDIDATES = ("permit_number", "local_permit_number")
PERMIT_AMOUNT_COLUMN_CANDIDATES = ("amount", "permit_amount")
SALE_DATE_COLUMN_CANDIDATES = ("sale_date", "date_of_sale")
SALE_YEAR_COLUMN_CANDIDATES = ("year", "sale_year")
SALE_PRICE_COLUMN_CANDIDATES = ("sale_price", "price", "amount")
SALE_DOC_COLUMN_CANDIDATES = ("doc_no", "document_number", "deed_no")
SALE_DEED_COLUMN_CANDIDATES = ("deed_type", "mydec_deed_type")
NEARBY_TEARDOWN_DISTANCE_FT = 500
NEARBY_TEARDOWN_LIMIT = 5


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


def build_permit_history(permits: pd.DataFrame) -> pd.DataFrame:
    pin_column = find_likely_column(permits.columns, PIN_COLUMN_CANDIDATES)
    date_column = find_likely_column(permits.columns, PERMIT_DATE_COLUMN_CANDIDATES)
    year_column = find_likely_column(permits.columns, PERMIT_YEAR_COLUMN_CANDIDATES)
    description_column = find_likely_column(permits.columns, PERMIT_DESCRIPTION_COLUMN_CANDIDATES)
    status_column = find_likely_column(permits.columns, PERMIT_STATUS_COLUMN_CANDIDATES)
    number_column = find_likely_column(permits.columns, PERMIT_NUMBER_COLUMN_CANDIDATES)
    amount_column = find_likely_column(permits.columns, PERMIT_AMOUNT_COLUMN_CANDIDATES)

    if not pin_column:
        raise ValueError(f"No likely PIN column found in permit columns: {list(permits.columns)}")
    if not date_column and not year_column:
        raise ValueError("Permit data needs either a date_issued or permit_year-style column.")

    normalized = add_normalized_pin_columns(permits.copy(), pin_column)
    records: list[dict[str, Any]] = []

    for pin, group in normalized.dropna(subset=["pin_normalized"]).groupby("pin_normalized"):
        events = [
            build_permit_event(row, date_column, year_column, description_column, status_column, number_column, amount_column)
            for row in group.to_dict(orient="records")
        ]
        events = sorted(events, key=timeline_sort_key)
        years = [event["year"] for event in events if event.get("year")]
        records.append(
            {
                "pin_normalized": pin,
                "permit_count": len(events),
                "latest_permit_year": max(years) if years else None,
                "permit_timeline": events,
            }
        )

    return pd.DataFrame(records)


def build_sale_history(sales: pd.DataFrame) -> pd.DataFrame:
    pin_column = find_likely_column(sales.columns, PIN_COLUMN_CANDIDATES)
    date_column = find_likely_column(sales.columns, SALE_DATE_COLUMN_CANDIDATES)
    year_column = find_likely_column(sales.columns, SALE_YEAR_COLUMN_CANDIDATES)
    price_column = find_likely_column(sales.columns, SALE_PRICE_COLUMN_CANDIDATES)
    doc_column = find_likely_column(sales.columns, SALE_DOC_COLUMN_CANDIDATES)
    deed_column = find_likely_column(sales.columns, SALE_DEED_COLUMN_CANDIDATES)

    if not pin_column:
        raise ValueError(f"No likely PIN column found in sale columns: {list(sales.columns)}")
    if not date_column and not year_column:
        raise ValueError("Sale data needs either a sale_date or sale_year-style column.")

    normalized = add_normalized_pin_columns(sales.copy(), pin_column)
    normalized = normalized[normalized.apply(is_market_sale_record, axis=1)]
    records: list[dict[str, Any]] = []

    for pin, group in normalized.dropna(subset=["pin_normalized"]).groupby("pin_normalized"):
        events = [
            build_sale_event(row, date_column, year_column, price_column, doc_column, deed_column)
            for row in group.to_dict(orient="records")
        ]
        events = sorted(events, key=timeline_sort_key)
        years = [event["year"] for event in events if event.get("year")]
        prices = [event.get("price") for event in events if event.get("price") is not None]
        latest = events[-1] if events else {}
        records.append(
            {
                "pin_normalized": pin,
                "sale_count": len(events),
                "latest_sale_year": max(years) if years else None,
                "latest_sale_price": latest.get("price") if latest else None,
                "max_sale_price": max(prices) if prices else None,
                "sale_timeline": events,
            }
        )

    return pd.DataFrame(records)


def is_market_sale_record(row: Any) -> bool:
    return not any(
        truthy(row.get(column))
        for column in [
            "sale_filter_same_sale_within_365",
            "sale_filter_less_than_10k",
            "sale_filter_deed_type",
        ]
    )


def build_sale_event(
    row: dict[str, Any],
    date_column: str | None,
    year_column: str | None,
    price_column: str | None,
    doc_column: str | None,
    deed_column: str | None,
) -> dict[str, Any]:
    date = clean_text(row.get(date_column)) if date_column else None
    price = numeric_or_none(row.get(price_column)) if price_column else None
    event = {
        "year": permit_year(date, row.get(year_column) if year_column else None),
        "date": date,
        "title": "Recorded sale",
        "description": sale_description(price, clean_text(row.get(deed_column)) if deed_column else None),
        "event_type": "sale",
        "source": "Cook County Assessor Parcel Sales",
    }
    document_number = clean_text(row.get(doc_column)) if doc_column else None
    if document_number:
        event["document_number"] = document_number
    if price is not None:
        event["price"] = price
    return event


def build_permit_event(
    row: dict[str, Any],
    date_column: str | None,
    year_column: str | None,
    description_column: str | None,
    status_column: str | None,
    number_column: str | None,
    amount_column: str | None,
) -> dict[str, Any]:
    description = clean_text(row.get(description_column)) if description_column else None
    date_issued = clean_text(row.get(date_column)) if date_column else None
    year = permit_year(date_issued, row.get(year_column) if year_column else None)
    amount = numeric_or_none(row.get(amount_column)) if amount_column else None
    event = {
        "year": year,
        "date": date_issued,
        "title": permit_title(description),
        "description": description,
        "event_type": "permit",
        "status": clean_text(row.get(status_column)) if status_column else None,
        "permit_number": clean_text(row.get(number_column)) if number_column else None,
        "source": "Cook County Assessor Permits",
    }
    if amount is not None:
        event["amount"] = amount
    return event


def attach_house_evolution_timelines(enriched: Any) -> Any:
    enriched = append_nearby_teardown_events(enriched)
    timelines: list[str] = []

    for _, row in enriched.iterrows():
        events: list[dict[str, Any]] = []
        year_built = parse_year(row.get("year_built"))
        if year_built:
            events.append(
                {
                    "year": year_built,
                    "title": "Original build",
                    "description": "Assessor year built for the primary structure.",
                    "event_type": "original_build",
                    "source": "Cook County Assessor",
                }
            )
        events.extend(parse_timeline_value(row.get("sale_timeline")))
        events.extend(parse_timeline_value(row.get("permit_timeline")))
        events.extend(parse_timeline_value(row.get("nearby_teardown_timeline")))
        timelines.append(json.dumps(sorted(events, key=timeline_sort_key), separators=(",", ":")))

    enriched["house_evolution_timeline"] = timelines
    return enriched.drop(columns=["permit_timeline", "sale_timeline", "nearby_teardown_timeline"], errors="ignore")


def append_nearby_teardown_events(enriched: Any) -> Any:
    if "permit_timeline" not in enriched or not hasattr(enriched, "geometry"):
        enriched["nearby_teardown_count"] = 0
        enriched["nearby_teardown_timeline"] = [[] for _ in range(len(enriched))]
        return enriched

    teardown_rows: list[dict[str, Any]] = []
    for index, row in enriched.iterrows():
        pin = row.get("pin_normalized")
        for event in parse_timeline_value(row.get("permit_timeline")):
            if is_teardown_event(event):
                teardown_rows.append({"source_index": index, "pin": pin, "address": row.get("address"), "event": event})

    if not teardown_rows:
        enriched["nearby_teardown_count"] = 0
        enriched["nearby_teardown_timeline"] = [[] for _ in range(len(enriched))]
        return enriched

    import geopandas as gpd

    projected = enriched.to_crs("EPSG:3435")
    teardown_geometries = [projected.loc[row["source_index"]].geometry.centroid for row in teardown_rows]
    teardown_gdf = gpd.GeoDataFrame(teardown_rows, geometry=teardown_geometries, crs=projected.crs)
    spatial_index = teardown_gdf.sindex
    nearby_counts: list[int] = []
    nearby_timelines: list[list[dict[str, Any]]] = []

    for index, parcel in projected.iterrows():
        geometry = parcel.geometry
        if geometry is None or geometry.is_empty:
            nearby_counts.append(0)
            nearby_timelines.append([])
            continue

        search_area = geometry.centroid.buffer(NEARBY_TEARDOWN_DISTANCE_FT)
        candidates = teardown_gdf.iloc[list(spatial_index.query(search_area, predicate="intersects"))]
        nearby_events: list[tuple[float, dict[str, Any]]] = []
        for _, candidate in candidates.iterrows():
            if candidate.get("pin") == parcel.get("pin_normalized"):
                continue
            distance = geometry.centroid.distance(candidate.geometry)
            if distance > NEARBY_TEARDOWN_DISTANCE_FT:
                continue
            event = dict(candidate["event"])
            source_label = clean_text(candidate.get("address")) or f"PIN {candidate.get('pin')}"
            event["title"] = "Nearby demolition or teardown permit"
            event["description"] = f"{source_label}: {event.get('description') or 'Demolition-like permit work description.'}"
            event["event_type"] = "nearby_teardown"
            event["pin"] = candidate.get("pin")
            event["is_nearby"] = True
            nearby_events.append((distance, event))

        nearby_events.sort(key=lambda item: (timeline_sort_key(item[1]), item[0]))
        capped = [event for _, event in nearby_events[:NEARBY_TEARDOWN_LIMIT]]
        nearby_counts.append(len(capped))
        nearby_timelines.append(capped)

    enriched["nearby_teardown_count"] = nearby_counts
    enriched["nearby_teardown_timeline"] = nearby_timelines
    return enriched


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


def enrich_with_addresses(primary: pd.DataFrame, addresses: pd.DataFrame) -> pd.DataFrame:
    pin_column = find_likely_column(addresses.columns, PIN_COLUMN_CANDIDATES)
    address_column = find_likely_column(addresses.columns, ADDRESS_COLUMN_CANDIDATES)
    if not pin_column or not address_column:
        print("Assessor address file found, but no likely PIN/address columns were detected.")
        return primary

    normalized = add_normalized_pin_columns(addresses.copy(), pin_column)
    normalized["address_source_rank"] = normalized[address_column].isna().astype(int)
    address_small = (
        normalized.dropna(subset=["pin_normalized"])
        .sort_values(["pin_normalized", "address_source_rank"])
        .drop_duplicates("pin_normalized")
        [["pin_normalized", address_column]]
        .rename(columns={address_column: "address_assessor"})
    )
    joined = primary.merge(address_small, on="pin_normalized", how="left")
    if "address" not in joined:
        joined["address"] = None
    joined["address"] = joined["address"].combine_first(joined["address_assessor"])
    return joined.drop(columns=["address_assessor"], errors="ignore")


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

    permits_path = optional_source("Cook County Assessor permits")
    permit_history = None
    if permits_path:
        permits = pd.DataFrame(read_table(permits_path).drop(columns="geometry", errors="ignore"))
        permit_history = build_permit_history(permits)

    universe_path = optional_source("Cook County parcel universe")
    if universe_path:
        universe = pd.DataFrame(read_table(universe_path).drop(columns="geometry", errors="ignore"))
        primary = enrich_with_universe(primary, universe)

    addresses_path = optional_source("Cook County Assessor parcel addresses")
    if addresses_path:
        addresses = pd.DataFrame(read_table(addresses_path).drop(columns="geometry", errors="ignore"))
        primary = enrich_with_addresses(primary, addresses)

    filtered_parcels, filter_method = filter_to_municipality(
        parcels,
        optional_source("Park Ridge municipal boundary"),
        primary,
    )
    enriched = filtered_parcels.merge(primary, on="pin_normalized", how="left", suffixes=("_parcel", ""))
    if permit_history is not None:
        enriched = enriched.merge(permit_history, on="pin_normalized", how="left")

    sales_path = optional_source("Cook County Assessor parcel sales")
    if sales_path:
        sales = pd.DataFrame(read_table(sales_path).drop(columns="geometry", errors="ignore"))
        sale_history = build_sale_history(sales)
        enriched = enriched.merge(sale_history, on="pin_normalized", how="left")

    for column in ["address", "municipality", "property_class", "year_built", "decade_built", "building_sqft", "land_sqft", "improvement_count", "permit_count", "latest_permit_year", "nearby_teardown_count", "sale_count", "latest_sale_year", "latest_sale_price", "max_sale_price", "primary_building_selection_method"]:
        if column not in enriched:
            enriched[column] = None

    enriched["decade_built"] = enriched["decade_built"].fillna("Unknown")
    enriched["permit_count"] = enriched["permit_count"].fillna(0).astype(int)
    enriched["sale_count"] = enriched["sale_count"].fillna(0).astype(int)
    enriched["data_quality_flags"] = enriched["data_quality_flags"].apply(normalize_flags)
    enriched["source_note"] = "Cook County parcel and assessor data. Owner names intentionally omitted."
    enriched = attach_house_evolution_timelines(enriched)

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
        "permit_count",
        "latest_permit_year",
        "nearby_teardown_count",
        "sale_count",
        "latest_sale_year",
        "latest_sale_price",
        "max_sale_price",
        "house_evolution_timeline",
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
            "Permit history reflects permits submitted to and known by the Cook County Assessor.",
            "Open, pending, and current-tax-year permits may change after publication.",
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


def truthy(value: Any) -> bool:
    if value is None or pd.isna(value):
        return False
    return str(value).strip().lower() in {"true", "1", "yes", "y"}


def sale_description(price: float | None, deed_type: str | None) -> str:
    parts: list[str] = []
    if price is not None:
        parts.append(f"Sale price ${price:,.0f}")
    if deed_type:
        parts.append(deed_type)
    return "; ".join(parts) if parts else "Recorded assessor sale."


def normalize_flags(value: Any) -> list[str]:
    if isinstance(value, list):
        return value
    if value is None or pd.isna(value):
        return ["missing_assessor_join"]
    return [str(value)]


def clean_text(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    return text if text and text.lower() not in {"nan", "none", "null"} else None


def permit_year(date_issued: str | None, fallback: Any) -> int | None:
    if date_issued:
        match = re.search(r"\b(18|19|20)\d{2}\b", date_issued)
        if match:
            return int(match.group(0))
    return parse_year(fallback)


def permit_title(description: str | None) -> str:
    text = (description or "").lower()
    if re.search(r"\b(demo|demolition|tear\s*down|teardown|wreck)", text):
        return "Demolition or teardown permit"
    if re.search(r"\b(addition|addn|add|expand|second story|2nd story)\b", text):
        return "Addition permit"
    if re.search(r"\b(garage|carport)\b", text):
        return "Garage permit"
    if re.search(r"\b(porch|deck|patio)\b", text):
        return "Porch, deck, or patio permit"
    if re.search(r"\b(kitchen|bath|remodel|renovation|alteration|interior)\b", text):
        return "Remodel or renovation permit"
    if re.search(r"\b(new construction|new single family|single family residence|new residence)\b", text):
        return "New construction permit"
    return "Building permit"


def is_teardown_event(event: dict[str, Any]) -> bool:
    return event.get("title") == "Demolition or teardown permit"


def parse_timeline_value(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [event for event in value if isinstance(event, dict)]
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return []
        return [event for event in parsed if isinstance(event, dict)] if isinstance(parsed, list) else []
    return []


def timeline_sort_key(event: dict[str, Any]) -> tuple[int, str]:
    year = parse_year(event.get("year")) or permit_year(clean_text(event.get("date")), None) or 9999
    return year, clean_text(event.get("date")) or ""


if __name__ == "__main__":
    build_dataset()
