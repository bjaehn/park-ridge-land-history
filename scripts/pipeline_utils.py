from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from datetime import date
from typing import Any

PIN_DIGIT_COUNT = 14

PIN_COLUMN_CANDIDATES = (
    "pin",
    "pin14",
    "pin_normalized",
    "parcel_pin",
    "parcel_id",
    "parcelid",
    "property_index_number",
)

YEAR_BUILT_COLUMN_CANDIDATES = (
    "year_built",
    "yr_built",
    "yearbuilt",
    "age",
    "building_year_built",
    "bldg_year_built",
)

BUILDING_SQFT_COLUMN_CANDIDATES = (
    "building_sqft",
    "bldg_sqft",
    "building_square_feet",
    "sqft",
    "total_building_sqft",
)


def normalize_pin(value: Any) -> dict[str, Any]:
    """Normalize a Cook County PIN to a zero-padded 14 digit string."""
    original = None if value is None else str(value).strip()
    if original in (None, "", "nan", "None"):
        return {
            "pin_original": original,
            "pin_normalized": None,
            "pin_valid": False,
            "pin_quality_flag": "missing_pin"
        }

    digits = re.sub(r"\D", "", original)
    if not digits:
        return {
            "pin_original": original,
            "pin_normalized": None,
            "pin_valid": False,
            "pin_quality_flag": "pin_has_no_digits"
        }

    if len(digits) > PIN_DIGIT_COUNT:
        return {
            "pin_original": original,
            "pin_normalized": digits,
            "pin_valid": False,
            "pin_quality_flag": "pin_too_long"
        }

    normalized = digits.zfill(PIN_DIGIT_COUNT)
    return {
        "pin_original": original,
        "pin_normalized": normalized,
        "pin_valid": len(normalized) == PIN_DIGIT_COUNT,
        "pin_quality_flag": None if len(normalized) == PIN_DIGIT_COUNT else "pin_invalid_length"
    }


def decade_bucket(year: Any, current_year: int | None = None) -> str:
    """Return the visualization bucket for a year-built value."""
    parsed = parse_year(year)
    if parsed is None:
        return "Unknown"
    current = current_year or date.today().year
    if parsed < 1800 or parsed > current:
        return "Suspicious"
    if parsed < 1900:
        return "Pre-1900"
    return f"{(parsed // 10) * 10}s"


def year_quality_flags(year: Any, current_year: int | None = None) -> list[str]:
    parsed = parse_year(year)
    if parsed is None:
        return ["missing_year_built"]
    current = current_year or date.today().year
    if parsed < 1800:
        return ["year_built_before_1800"]
    if parsed > current:
        return ["year_built_after_current_year"]
    return []


def parse_year(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    try:
        year = int(float(value))
    except (TypeError, ValueError):
        return None
    return year if year != 0 else None


def find_likely_column(columns: Iterable[str], candidates: Iterable[str]) -> str | None:
    normalized = {normalize_column_name(column): column for column in columns}
    for candidate in candidates:
        if candidate in normalized:
            return normalized[candidate]
    for normalized_name, original in normalized.items():
        if any(candidate in normalized_name for candidate in candidates):
            return original
    return None


def choose_primary_record(
    records: Iterable[Mapping[str, Any]],
    year_column: str = "year_built",
    sqft_column: str = "building_sqft"
) -> tuple[Mapping[str, Any] | None, str]:
    """Pick the primary improvement record for one parcel using transparent rules."""
    rows = list(records)
    if not rows:
        return None, "no_improvement_rows"

    with_year = [row for row in rows if parse_year(row.get(year_column)) is not None]
    candidates = with_year or rows
    method_prefix = "largest_sqft_with_year_built" if with_year else "first_record_no_year_built"

    def sqft_value(row: Mapping[str, Any]) -> float:
        try:
            return float(row.get(sqft_column) or 0)
        except (TypeError, ValueError):
            return 0

    if with_year:
        return max(candidates, key=sqft_value), method_prefix
    return candidates[0], method_prefix


def normalize_column_name(column: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", column.strip().lower()).strip("_")
