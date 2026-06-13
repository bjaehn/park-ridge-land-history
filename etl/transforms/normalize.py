"""
Normalization transforms for Park Ridge Land History ETL.
"""

import re


def normalize_pin(raw: str | None) -> str:
    """Normalize a Cook County PIN to 14 digits (no dashes)."""
    if not raw:
        return ""
    digits = re.sub(r"\D", "", str(raw))
    if len(digits) < 14:
        digits = digits.zfill(14)
    return digits[:14]


def format_pin(pin: str) -> str | None:
    """Format a 14-digit PIN as XX-XX-XXX-XXX-XXXX."""
    digits = re.sub(r"\D", "", pin)
    if len(digits) != 14:
        return None
    return f"{digits[0:2]}-{digits[2:4]}-{digits[4:7]}-{digits[7:10]}-{digits[10:14]}"


def normalize_address(address: str | None) -> str | None:
    """Normalize an address to title case."""
    if not address:
        return None
    # Remove extra whitespace
    cleaned = " ".join(address.split())
    # Title case
    return cleaned.title()


def normalize_municipality(municipality: str | None, target: str = "CITY OF PARK RIDGE") -> bool:
    """Check if a municipality string matches our target."""
    if not municipality:
        return False
    return target.upper() in municipality.upper()


def parse_year(value: str | int | float | None) -> int | None:
    """Parse a year value from various formats."""
    if value is None:
        return None
    try:
        year = int(float(str(value)))
        if 1800 <= year <= 2100:
            return year
        return None
    except (ValueError, TypeError):
        return None


def parse_price(value: str | int | float | None) -> float | None:
    """Parse a price value, returning None for zero/invalid prices."""
    if value is None:
        return None
    try:
        price = float(str(value).replace(",", "").replace("$", ""))
        if price > 0:
            return price
        return None
    except (ValueError, TypeError):
        return None
