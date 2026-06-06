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
ASSESSED_VALUE_TOTAL_COLUMNS = ("board_tot", "certified_tot", "mailed_tot")
NEARBY_TEARDOWN_DISTANCE_FT = 500
NEARBY_TEARDOWN_LIMIT = 5
HARGIS_MATCH_DISTANCE_FT = 120
HARGIS_OUTPUT_COLUMNS = [
    "hargis_record_count",
    "hargis_refnum",
    "hargis_refnums",
    "hargis_name",
    "hargis_location",
    "hargis_nr_eval",
    "hargis_category",
    "hargis_arch_class",
    "hargis_current_function",
    "hargis_historic_function",
    "hargis_wall_materials",
    "hargis_architect",
    "hargis_builder",
    "hargis_begin_year",
    "hargis_end_year",
    "hargis_survey_date",
    "hargis_survey_year",
    "hargis_opinion_significance",
    "hargis_photo_count",
    "hargis_pdf_count",
    "hargis_photo_url",
    "hargis_pdf_url",
    "hargis_photos_json",
    "hargis_pdfs_json",
    "hargis_match_method",
    "hargis_records_json",
]


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


def build_assessed_value_history(values: pd.DataFrame) -> pd.DataFrame:
    pin_column = find_likely_column(values.columns, PIN_COLUMN_CANDIDATES)
    if not pin_column or "year" not in values:
        print("Assessed value file found, but no likely PIN/year columns were detected.")
        return pd.DataFrame()

    normalized = add_normalized_pin_columns(values.copy(), pin_column)
    normalized["assessment_year"] = normalized["year"].map(parse_year)
    normalized["assessed_total"] = first_numeric_value(normalized, ASSESSED_VALUE_TOTAL_COLUMNS)
    normalized = normalized.dropna(subset=["pin_normalized", "assessment_year", "assessed_total"])
    records: list[dict[str, Any]] = []

    for pin, group in normalized.groupby("pin_normalized"):
        ordered = group.sort_values("assessment_year")
        first = ordered.iloc[0]
        latest = ordered.iloc[-1]
        first_total = numeric_or_none(first.get("assessed_total"))
        latest_total = numeric_or_none(latest.get("assessed_total"))
        change_pct = None
        if first_total and latest_total and first_total > 0 and first.get("assessment_year") != latest.get("assessment_year"):
            change_pct = ((latest_total - first_total) / first_total) * 100
        records.append(
            {
                "pin_normalized": pin,
                "assessed_year_count": int(ordered["assessment_year"].nunique()),
                "first_assessed_year": parse_year(first.get("assessment_year")),
                "first_assessed_total": first_total,
                "latest_assessed_year": parse_year(latest.get("assessment_year")),
                "latest_assessed_total": latest_total,
                "assessed_value_change_pct": round(change_pct, 1) if change_pct is not None else None,
            }
        )

    return pd.DataFrame(records)


def build_appeal_history(appeals: pd.DataFrame) -> pd.DataFrame:
    pin_column = find_likely_column(appeals.columns, PIN_COLUMN_CANDIDATES)
    if not pin_column or "year" not in appeals:
        print("Appeal file found, but no likely PIN/year columns were detected.")
        return pd.DataFrame()

    normalized = add_normalized_pin_columns(appeals.copy(), pin_column)
    normalized["appeal_year"] = normalized["year"].map(parse_year)
    normalized["mailed_total_numeric"] = normalized.get("mailed_tot", pd.Series(dtype="object")).map(numeric_or_none)
    normalized["certified_total_numeric"] = normalized.get("certified_tot", pd.Series(dtype="object")).map(numeric_or_none)
    normalized["assessment_reduction"] = (
        normalized["mailed_total_numeric"] - normalized["certified_total_numeric"]
    ).clip(lower=0)
    normalized = normalized.dropna(subset=["pin_normalized", "appeal_year"])
    records: list[dict[str, Any]] = []

    for pin, group in normalized.groupby("pin_normalized"):
        statuses = group.get("status", pd.Series(dtype="object")).astype(str).str.lower()
        records.append(
            {
                "pin_normalized": pin,
                "appeal_count": int(len(group)),
                "latest_appeal_year": int(group["appeal_year"].max()),
                "open_appeal_count": int(statuses.isin(["open", "pending"]).sum()),
                "total_assessment_reduction": float(group["assessment_reduction"].fillna(0).sum()),
            }
        )

    return pd.DataFrame(records)


def build_proximity_context(proximity: pd.DataFrame) -> pd.DataFrame:
    if "pin10" not in proximity or "year" not in proximity:
        print("Proximity file found, but no pin10/year columns were detected.")
        return pd.DataFrame()

    normalized = proximity.copy()
    normalized["pin10_normalized"] = normalized["pin10"].map(normalize_pin10)
    normalized["proximity_year"] = normalized["year"].map(parse_year)
    normalized = normalized.dropna(subset=["pin10_normalized", "proximity_year"])
    latest = normalized.sort_values(["pin10_normalized", "proximity_year"]).drop_duplicates("pin10_normalized", keep="last")

    records = []
    for _, row in latest.iterrows():
        records.append(
            {
                "pin10_normalized": row.get("pin10_normalized"),
                "proximity_year": parse_year(row.get("proximity_year")),
                "nearest_park_name": clean_text(row.get("nearest_park_name")),
                "nearest_park_dist_ft": numeric_or_none(row.get("nearest_park_dist_ft")),
                "nearest_metra_stop_name": clean_text(row.get("nearest_metra_stop_name")),
                "nearest_metra_stop_dist_ft": numeric_or_none(row.get("nearest_metra_stop_dist_ft")),
                "nearest_bike_trail_name": clean_text(row.get("nearest_bike_trail_name")),
                "nearest_bike_trail_dist_ft": numeric_or_none(row.get("nearest_bike_trail_dist_ft")),
                "foreclosure_count_half_mile_5yr": numeric_or_none(row.get("num_foreclosure_in_half_mile_past_5_years")),
                "foreclosure_per_1000_half_mile_5yr": numeric_or_none(row.get("num_foreclosure_per_1000_pin_past_5_years")),
                "nearest_major_road_name": clean_text(row.get("nearest_major_road_name")),
                "nearest_major_road_dist_ft": numeric_or_none(row.get("nearest_major_road_dist_ft")),
            }
        )
    return pd.DataFrame(records)


def build_hargis_history(
    properties: pd.DataFrame,
    photos: pd.DataFrame | None,
    pdfs: pd.DataFrame | None,
    parcels: Any,
) -> pd.DataFrame:
    if properties.empty:
        return pd.DataFrame()

    hargis = properties.copy()
    hargis["hargis_refnum_norm"] = hargis.get("REFNUM", pd.Series(dtype="object")).map(normalize_hargis_refnum)
    hargis = hargis.dropna(subset=["hargis_refnum_norm"])
    if hargis.empty:
        return pd.DataFrame()

    media = build_hargis_media_summary(photos, pdfs)
    hargis = hargis.merge(media, on="hargis_refnum_norm", how="left") if not media.empty else hargis
    matched = match_hargis_to_parcels(hargis, parcels)
    matched = matched.dropna(subset=["pin_normalized"])
    if matched.empty:
        return pd.DataFrame()

    records: list[dict[str, Any]] = []
    for pin, group in matched.groupby("pin_normalized"):
        ordered = sorted(group.to_dict(orient="records"), key=hargis_primary_sort_key)
        primary = ordered[0]
        record_summaries = [hargis_record_summary(row) for row in ordered]
        photo_count = sum(int(numeric_or_none(row.get("hargis_photo_count")) or 0) for row in ordered)
        pdf_count = sum(int(numeric_or_none(row.get("hargis_pdf_count")) or 0) for row in ordered)
        photos_json = combine_hargis_media(ordered, "hargis_photos_json")
        pdfs_json = combine_hargis_media(ordered, "hargis_pdfs_json")
        records.append(
            {
                "pin_normalized": pin,
                "hargis_record_count": len(ordered),
                "hargis_refnum": clean_text(primary.get("REFNUM")),
                "hargis_refnums": ", ".join(filter(None, [clean_text(row.get("REFNUM")) for row in ordered])),
                "hargis_name": first_clean_value(primary, ["SignificantName", "OtherName"]),
                "hargis_location": clean_text(primary.get("Location")),
                "hargis_nr_eval": first_clean_value(primary, ["NREVAL", "NREval_1", "StaffEval"]),
                "hargis_category": clean_text(primary.get("Category")),
                "hargis_arch_class": clean_text(primary.get("ArchClass")),
                "hargis_current_function": clean_text(primary.get("CurrentFunction")),
                "hargis_historic_function": clean_text(primary.get("HistoricFunction")),
                "hargis_wall_materials": clean_text(primary.get("WallMaterials")),
                "hargis_architect": clean_text(primary.get("Architect")),
                "hargis_builder": clean_text(primary.get("Builder")),
                "hargis_begin_year": parse_year(primary.get("BeginYear")),
                "hargis_end_year": parse_year(primary.get("EndYear")),
                "hargis_survey_date": clean_text(primary.get("SurveyDate")),
                "hargis_survey_year": hargis_survey_year(primary),
                "hargis_opinion_significance": clean_text(primary.get("OpinionOfSignificance")),
                "hargis_photo_count": photo_count,
                "hargis_pdf_count": pdf_count,
                "hargis_photo_url": first_clean_value(primary, ["hargis_photo_url"]),
                "hargis_pdf_url": first_clean_value(primary, ["hargis_pdf_url"]),
                "hargis_photos_json": json.dumps(photos_json, separators=(",", ":")) if photos_json else None,
                "hargis_pdfs_json": json.dumps(pdfs_json, separators=(",", ":")) if pdfs_json else None,
                "hargis_match_method": clean_text(primary.get("hargis_match_method")),
                "hargis_records_json": json.dumps(record_summaries, separators=(",", ":")),
            }
        )
    return pd.DataFrame(records)


def build_hargis_media_summary(photos: pd.DataFrame | None, pdfs: pd.DataFrame | None) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    if photos is not None and not photos.empty:
        photo_ref_column = "RefNum" if "RefNum" in photos else "REFNUM"
        photo_url_column = "Url" if "Url" in photos else "URL"
        photo_rows = photos.copy()
        photo_rows["hargis_refnum_norm"] = photo_rows[photo_ref_column].map(normalize_hargis_refnum)
        photo_grouped = photo_rows.dropna(subset=["hargis_refnum_norm"]).groupby("hargis_refnum_norm")
        frames.append(
            photo_grouped.agg(
                hargis_photo_count=(photo_ref_column, "size"),
                hargis_photo_url=(photo_url_column, first_non_empty),
                hargis_photos_json=(photo_url_column, lambda values: hargis_media_json(photo_rows.loc[values.index], "photo")),
            ).reset_index()
        )
    if pdfs is not None and not pdfs.empty:
        pdf_ref_column = "REFNUM" if "REFNUM" in pdfs else "RefNum"
        pdf_url_column = "URL" if "URL" in pdfs else "Url"
        pdf_rows = pdfs.copy()
        pdf_rows["hargis_refnum_norm"] = pdf_rows[pdf_ref_column].map(normalize_hargis_refnum)
        pdf_grouped = pdf_rows.dropna(subset=["hargis_refnum_norm"]).groupby("hargis_refnum_norm")
        frames.append(
            pdf_grouped.agg(
                hargis_pdf_count=(pdf_ref_column, "size"),
                hargis_pdf_url=(pdf_url_column, first_non_empty),
                hargis_pdfs_json=(pdf_url_column, lambda values: hargis_media_json(pdf_rows.loc[values.index], "pdf")),
            ).reset_index()
        )
    if not frames:
        return pd.DataFrame()
    summary = frames[0]
    for frame in frames[1:]:
        summary = summary.merge(frame, on="hargis_refnum_norm", how="outer")
    return summary


def hargis_media_json(rows: pd.DataFrame, media_type: str) -> str | None:
    items: list[dict[str, Any]] = []
    for _, row in rows.iterrows():
        if media_type == "photo":
            url = clean_text(row.get("Url")) or clean_text(row.get("URL"))
            if not url:
                continue
            items.append(
                {
                    "type": "photo",
                    "refnum": clean_text(row.get("RefNum")) or clean_text(row.get("REFNUM")),
                    "label": clean_text(row.get("FileName")) or clean_text(row.get("PhotoID")) or "Historic survey photo",
                    "url": url,
                    "item_id": clean_text(row.get("ItemId")) or clean_text(row.get("Item_ID")),
                    "photo_id": clean_text(row.get("PhotoID")),
                }
            )
        else:
            url = clean_text(row.get("URL")) or clean_text(row.get("Url"))
            if not url:
                continue
            items.append(
                {
                    "type": "pdf",
                    "refnum": clean_text(row.get("REFNUM")) or clean_text(row.get("RefNum")),
                    "label": clean_text(row.get("Item_ID")) or "Historic survey PDF",
                    "url": url,
                    "item_id": clean_text(row.get("Item_ID")) or clean_text(row.get("ItemId")),
                }
            )
    return json.dumps(items, separators=(",", ":")) if items else None


def combine_hargis_media(rows: list[dict[str, Any]], column: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in rows:
        payload = clean_text(row.get(column))
        if not payload:
            continue
        try:
            parsed = json.loads(payload)
        except (TypeError, json.JSONDecodeError):
            continue
        if not isinstance(parsed, list):
            continue
        for item in parsed:
            if not isinstance(item, dict):
                continue
            key = clean_text(item.get("url")) or clean_text(item.get("item_id")) or json.dumps(item, sort_keys=True)
            if not key or key in seen:
                continue
            seen.add(key)
            items.append(item)
    return items


def match_hargis_to_parcels(hargis: pd.DataFrame, parcels: Any) -> pd.DataFrame:
    matched = hargis.copy()
    matched["pin_normalized"] = None
    matched["hargis_match_method"] = None
    matched["hargis_match_distance_ft"] = None

    if hasattr(parcels, "geometry") and {"longitude", "latitude"}.issubset(matched.columns):
        try:
            import geopandas as gpd

            point_rows = matched.dropna(subset=["longitude", "latitude"]).copy()
            point_rows["hargis_index"] = point_rows.index
            points = gpd.GeoDataFrame(
                point_rows,
                geometry=gpd.points_from_xy(point_rows["longitude"], point_rows["latitude"]),
                crs="EPSG:4326",
            )
            parcel_columns = ["pin_normalized", "address", "geometry"] if "address" in parcels else ["pin_normalized", "geometry"]
            parcel_geometries = parcels.dropna(subset=["pin_normalized"])[parcel_columns].copy()
            if parcel_geometries.crs is None:
                parcel_geometries = parcel_geometries.set_crs("EPSG:4326")
            joined = gpd.sjoin_nearest(
                points.to_crs("EPSG:3435"),
                parcel_geometries.to_crs("EPSG:3435"),
                how="left",
                max_distance=HARGIS_MATCH_DISTANCE_FT,
                distance_col="hargis_match_distance_ft",
            )
            joined = (
                joined.dropna(subset=["pin_normalized_right"] if "pin_normalized_right" in joined else ["pin_normalized"])
                .sort_values(["hargis_index", "hargis_match_distance_ft"])
                .drop_duplicates("hargis_index")
            )
            pin_column = "pin_normalized_right" if "pin_normalized_right" in joined else "pin_normalized"
            for _, row in joined.iterrows():
                index = row["hargis_index"]
                distance = numeric_or_none(row.get("hargis_match_distance_ft"))
                matched.at[index, "pin_normalized"] = row.get(pin_column)
                matched.at[index, "hargis_match_method"] = "map point"
                matched.at[index, "hargis_match_distance_ft"] = round(distance, 1) if distance is not None else None
        except Exception as error:
            print(f"HARGIS spatial match failed; falling back to addresses. {error}")

    address_lookup: dict[str, str] = {}
    if "address" in parcels:
        for _, parcel in parcels.dropna(subset=["pin_normalized"]).iterrows():
            key = normalized_address_key(parcel.get("address"))
            if key and key not in address_lookup:
                address_lookup[key] = parcel.get("pin_normalized")

    for index, row in matched[matched["pin_normalized"].isna()].iterrows():
        key = normalized_address_key(row.get("Location"))
        pin = address_lookup.get(key) if key else None
        if pin:
            matched.at[index, "pin_normalized"] = pin
            matched.at[index, "hargis_match_method"] = "address"

    return matched


def hargis_record_summary(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "refnum": clean_text(row.get("REFNUM")),
        "name": first_clean_value(row, ["SignificantName", "OtherName"]),
        "location": clean_text(row.get("Location")),
        "style": clean_text(row.get("ArchClass")),
        "architect": clean_text(row.get("Architect")),
        "builder": clean_text(row.get("Builder")),
        "begin_year": parse_year(row.get("BeginYear")),
        "survey_date": clean_text(row.get("SurveyDate")),
        "nr_eval": first_clean_value(row, ["NREVAL", "NREval_1", "StaffEval"]),
        "photo_count": int(numeric_or_none(row.get("hargis_photo_count")) or 0),
        "pdf_count": int(numeric_or_none(row.get("hargis_pdf_count")) or 0),
        "match_method": clean_text(row.get("hargis_match_method")),
    }


def hargis_primary_sort_key(row: dict[str, Any]) -> tuple[int, str]:
    score = 0
    nr_eval = (first_clean_value(row, ["NREVAL", "NREval_1", "StaffEval"]) or "").lower()
    if "entered" in nr_eval or "national register" in nr_eval:
        score += 80
    if "contributing" in nr_eval or "eligible" in nr_eval:
        score += 50
    if first_clean_value(row, ["SignificantName", "OtherName"]):
        score += 20
    if clean_text(row.get("Architect")):
        score += 12
    if parse_year(row.get("BeginYear")):
        score += 8
    return -score, str(row.get("REFNUM") or "")


def build_hargis_event(row: Any) -> dict[str, Any] | None:
    if not clean_text(row.get("hargis_refnum")):
        return None
    parts = []
    if clean_text(row.get("hargis_arch_class")):
        parts.append(f"Style: {clean_text(row.get('hargis_arch_class'))}")
    if clean_text(row.get("hargis_architect")):
        parts.append(f"Architect: {clean_text(row.get('hargis_architect'))}")
    if clean_text(row.get("hargis_builder")):
        parts.append(f"Builder: {clean_text(row.get('hargis_builder'))}")
    if clean_text(row.get("hargis_nr_eval")):
        parts.append(clean_text(row.get("hargis_nr_eval")))
    photo_count = numeric_or_none(row.get("hargis_photo_count")) or 0
    if photo_count:
        parts.append(f"{int(photo_count)} linked photo records")
    return {
        "year": parse_year(row.get("hargis_survey_year")) or parse_year(row.get("hargis_begin_year")),
        "date": clean_text(row.get("hargis_survey_date")),
        "title": "Historic survey record",
        "description": "; ".join(parts) if parts else "Illinois historic architecture survey record.",
        "event_type": "historic_survey",
        "source": "Illinois HARGIS",
        "reference_number": clean_text(row.get("hargis_refnum")),
    }


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
        hargis_event = build_hargis_event(row)
        if hargis_event:
            events.append(hargis_event)
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

    assessed_values_path = optional_source("Cook County Assessor assessed values")
    if assessed_values_path:
        assessed_values = pd.DataFrame(read_table(assessed_values_path).drop(columns="geometry", errors="ignore"))
        assessed_value_history = build_assessed_value_history(assessed_values)
        if not assessed_value_history.empty:
            enriched = enriched.merge(assessed_value_history, on="pin_normalized", how="left")

    appeals_path = optional_source("Cook County Assessor appeals")
    if appeals_path:
        appeals = pd.DataFrame(read_table(appeals_path).drop(columns="geometry", errors="ignore"))
        appeal_history = build_appeal_history(appeals)
        if not appeal_history.empty:
            enriched = enriched.merge(appeal_history, on="pin_normalized", how="left")

    proximity_path = optional_source("Cook County Assessor parcel proximity")
    if proximity_path:
        proximity = pd.DataFrame(read_table(proximity_path).drop(columns="geometry", errors="ignore"))
        proximity_context = build_proximity_context(proximity)
        if not proximity_context.empty:
            enriched["pin10_normalized"] = enriched["pin_normalized"].map(normalize_pin10)
            enriched = enriched.merge(proximity_context, on="pin10_normalized", how="left")

    hargis_properties_path = optional_source("Illinois HARGIS Park Ridge properties")
    if hargis_properties_path:
        hargis_properties = pd.DataFrame(read_table(hargis_properties_path).drop(columns="geometry", errors="ignore"))
        hargis_photos_path = optional_source("Illinois HARGIS Park Ridge photos")
        hargis_pdfs_path = optional_source("Illinois HARGIS Park Ridge PDFs")
        hargis_photos = (
            pd.DataFrame(read_table(hargis_photos_path).drop(columns="geometry", errors="ignore"))
            if hargis_photos_path
            else None
        )
        hargis_pdfs = (
            pd.DataFrame(read_table(hargis_pdfs_path).drop(columns="geometry", errors="ignore"))
            if hargis_pdfs_path
            else None
        )
        hargis_history = build_hargis_history(hargis_properties, hargis_photos, hargis_pdfs, enriched)
        if not hargis_history.empty:
            enriched = enriched.merge(hargis_history, on="pin_normalized", how="left")

    for column in ["address", "municipality", "property_class", "year_built", "decade_built", "building_sqft", "land_sqft", "improvement_count", "permit_count", "latest_permit_year", "nearby_teardown_count", "sale_count", "latest_sale_year", "latest_sale_price", "max_sale_price", "assessed_year_count", "first_assessed_year", "first_assessed_total", "latest_assessed_year", "latest_assessed_total", "assessed_value_change_pct", "appeal_count", "latest_appeal_year", "open_appeal_count", "total_assessment_reduction", "proximity_year", "nearest_park_name", "nearest_park_dist_ft", "nearest_metra_stop_name", "nearest_metra_stop_dist_ft", "nearest_bike_trail_name", "nearest_bike_trail_dist_ft", "foreclosure_count_half_mile_5yr", "foreclosure_per_1000_half_mile_5yr", "nearest_major_road_name", "nearest_major_road_dist_ft", "primary_building_selection_method", *HARGIS_OUTPUT_COLUMNS]:
        if column not in enriched:
            enriched[column] = None

    enriched["decade_built"] = enriched["decade_built"].fillna("Unknown")
    enriched["permit_count"] = enriched["permit_count"].fillna(0).astype(int)
    enriched["sale_count"] = enriched["sale_count"].fillna(0).astype(int)
    enriched["hargis_record_count"] = enriched["hargis_record_count"].fillna(0).astype(int)
    enriched["hargis_photo_count"] = enriched["hargis_photo_count"].fillna(0).astype(int)
    enriched["hargis_pdf_count"] = enriched["hargis_pdf_count"].fillna(0).astype(int)
    enriched["appeal_count"] = enriched["appeal_count"].fillna(0).astype(int)
    enriched["open_appeal_count"] = enriched["open_appeal_count"].fillna(0).astype(int)
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
        "assessed_year_count",
        "first_assessed_year",
        "first_assessed_total",
        "latest_assessed_year",
        "latest_assessed_total",
        "assessed_value_change_pct",
        "appeal_count",
        "latest_appeal_year",
        "open_appeal_count",
        "total_assessment_reduction",
        "proximity_year",
        "nearest_park_name",
        "nearest_park_dist_ft",
        "nearest_metra_stop_name",
        "nearest_metra_stop_dist_ft",
        "nearest_bike_trail_name",
        "nearest_bike_trail_dist_ft",
        "foreclosure_count_half_mile_5yr",
        "foreclosure_per_1000_half_mile_5yr",
        "nearest_major_road_name",
        "nearest_major_road_dist_ft",
        *HARGIS_OUTPUT_COLUMNS,
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
    write_hargis_historical_layer(enriched)

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
        "parcels_with_hargis_records": int((enriched.get("hargis_record_count", pd.Series(dtype="int")) > 0).sum()),
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
            "HARGIS is sparse historic survey evidence and is matched by map point or address because Park Ridge HARGIS PINs are not populated.",
            "Current parcel polygons do not reconstruct historical parcel splits or consolidations.",
            "Primary building selection is a transparent v1 heuristic."
        ],
    }
    output = PROJECT_ROOT / "data/processed/parcel_summary.json"
    output.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Wrote {output.relative_to(PROJECT_ROOT)}")


def write_hargis_historical_layer(enriched: Any) -> None:
    if "hargis_refnum" not in enriched:
        return
    layer = enriched[enriched["hargis_refnum"].map(clean_text).notna()].copy()
    if layer.empty:
        return
    layer["layer_kind"] = "hargis_historic_survey"
    layer["layer_label"] = layer.apply(hargis_layer_label, axis=1)
    layer_columns = [
        "pin_normalized",
        "address",
        "year_built",
        "hargis_refnum",
        "hargis_name",
        "hargis_location",
        "hargis_nr_eval",
        "hargis_arch_class",
        "hargis_architect",
        "hargis_builder",
        "hargis_begin_year",
        "hargis_survey_date",
        "hargis_photo_count",
        "hargis_pdf_count",
        "hargis_match_method",
        "layer_kind",
        "layer_label",
        "geometry",
    ]
    layer = layer[[column for column in layer_columns if column in layer]]
    processed_path = PROJECT_ROOT / "data/processed/historical/park_ridge_hargis_historic_survey.geojson"
    public_path = PROJECT_ROOT / "public/data/historical/park_ridge_hargis_historic_survey.geojson"
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    public_path.parent.mkdir(parents=True, exist_ok=True)
    layer.to_file(processed_path, driver="GeoJSON")
    layer.to_file(public_path, driver="GeoJSON")
    print(f"Wrote {public_path.relative_to(PROJECT_ROOT)}")


def hargis_layer_label(row: Any) -> str:
    label = clean_text(row.get("hargis_name")) or clean_text(row.get("hargis_arch_class")) or "Historic survey record"
    address = clean_text(row.get("address")) or clean_text(row.get("hargis_location"))
    return f"{label} - {address}" if address else label


def numeric_or_none(value: Any) -> float | None:
    try:
        if value is None or value == "" or pd.isna(value):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def first_non_empty(values: pd.Series) -> str | None:
    for value in values:
        text = clean_text(value)
        if text:
            return text
    return None


def first_clean_value(row: Any, columns: list[str]) -> str | None:
    for column in columns:
        text = clean_text(row.get(column))
        if text:
            return text
    return None


def normalize_hargis_refnum(value: Any) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    digits = re.sub(r"\D", "", text)
    return digits or text


def hargis_survey_year(row: Any) -> int | None:
    survey_date = clean_text(row.get("SurveyDate"))
    if survey_date:
        match = re.search(r"\b(18|19|20)\d{2}\b", survey_date)
        if match:
            return int(match.group(0))
    return parse_year(row.get("BeginYear"))


def normalized_address_key(value: Any) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    text = text.upper()
    text = re.sub(r"\b(PARK RIDGE|ILLINOIS|IL|USA)\b", " ", text)
    text = re.sub(r"\b\d{5}(?:-\d{4})?\b", " ", text)
    text = re.sub(r"[^A-Z0-9 ]+", " ", text)
    tokens = [normalize_address_token(token) for token in text.split()]
    tokens = [token for token in tokens if token and token not in {"STREET", "AVENUE", "ROAD", "BOULEVARD", "PLACE", "DRIVE", "LANE", "COURT", "TERRACE", "PARKWAY"}]
    if not tokens:
        return None
    return " ".join(tokens[:4])


def normalize_address_token(token: str) -> str:
    replacements = {
        "NORTH": "N",
        "SOUTH": "S",
        "EAST": "E",
        "WEST": "W",
        "ST": "STREET",
        "AVE": "AVENUE",
        "AV": "AVENUE",
        "RD": "ROAD",
        "BLVD": "BOULEVARD",
        "PL": "PLACE",
        "DR": "DRIVE",
        "LN": "LANE",
        "CT": "COURT",
        "TER": "TERRACE",
        "PKWY": "PARKWAY",
    }
    return replacements.get(token, token)


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


def first_numeric_value(frame: pd.DataFrame, columns: tuple[str, ...]) -> pd.Series:
    values = pd.Series([None] * len(frame), index=frame.index, dtype="object")
    for column in columns:
        if column in frame:
            values = values.combine_first(frame[column].map(numeric_or_none))
    return values


def normalize_pin10(value: Any) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    digits = re.sub(r"\D", "", text)
    if not digits:
        return None
    if len(digits) >= 10:
        return digits[:10]
    return digits.zfill(10)


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
