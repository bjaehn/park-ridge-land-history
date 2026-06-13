"""
Validation rules for property records.
"""

from typing import Any


def validate_property_record(record: dict[str, Any]) -> list[str]:
    """
    Validate a property record before Supabase upsert.

    Returns:
        List of validation error strings. Empty list = valid.
    """
    errors = []

    pin = record.get("pin")
    if not pin:
        errors.append("Missing PIN")
    elif len(pin.replace("-", "")) != 14:
        errors.append(f"PIN has wrong length: {pin!r}")

    year_built = record.get("year_built")
    if year_built is not None:
        if not isinstance(year_built, (int, float)):
            errors.append(f"year_built must be numeric, got {type(year_built)}")
        elif not (1800 <= int(year_built) <= 2100):
            errors.append(f"year_built out of range: {year_built}")

    building_sqft = record.get("building_sqft")
    if building_sqft is not None and float(building_sqft) < 0:
        errors.append(f"building_sqft must be non-negative: {building_sqft}")

    return errors


def validate_permit_record(record: dict[str, Any]) -> list[str]:
    """Validate a permit record."""
    errors = []
    if not record.get("pin"):
        errors.append("Missing PIN")
    return errors


def validate_sale_record(record: dict[str, Any]) -> list[str]:
    """Validate a sale record."""
    errors = []
    if not record.get("pin"):
        errors.append("Missing PIN")
    price = record.get("sale_price")
    if price is not None and float(price) < 0:
        errors.append(f"sale_price must be non-negative: {price}")
    return errors


def validate_assessment_record(record: dict[str, Any]) -> list[str]:
    """Validate an assessment record."""
    errors = []
    if not record.get("pin"):
        errors.append("Missing PIN")
    if not record.get("assessment_year"):
        errors.append("Missing assessment_year")
    return errors
