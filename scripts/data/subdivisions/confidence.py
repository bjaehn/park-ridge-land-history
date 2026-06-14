"""Subdivision confidence model.

Confidence levels:
  high    – Name and/or date from an official recorded plat, official GIS lot
            layer, or verified legal description.
  medium  – Name from Cook County GIS parcel attribute or legal description
            field; date not confirmed.
  low     – Name inferred from spatial overlap, historical map, or aerial
            imagery without precise source confirmation.
  unknown – No reliable subdivision record found yet.

Match methods (in priority order):
  exact_legal_description   – Exact match from a verified legal description
  official_gis_lot_layer    – Match from Cook County official GIS lots layer
  parcel_gis_attribute      – Match from Cook County GIS parcel field
  parcel_within_geometry    – Current parcel falls within subdivision geometry
  parcel_centroid_in_geometry – Parcel centroid within subdivision geometry
  address_street_match      – Address/street segment match
  fuzzy_name_match          – Fuzzy normalized name match
  manual_review             – Manual researcher assignment
  no_match                  – No match found
"""

from __future__ import annotations

CONFIDENCE_LEVELS = ("high", "medium", "low", "unknown")

MATCH_CONFIDENCE: dict[str, str] = {
    "exact_legal_description":     "high",
    "official_gis_lot_layer":      "high",
    "parcel_gis_attribute":        "medium",
    "parcel_within_geometry":      "medium",
    "parcel_centroid_in_geometry": "medium",
    "address_street_match":        "low",
    "fuzzy_name_match":            "low",
    "manual_review":               "high",
    "no_match":                    "unknown",
}

MATCH_REASONS: dict[str, str] = {
    "exact_legal_description":     "Subdivision name matched exactly from a verified legal description or recorded plat reference.",
    "official_gis_lot_layer":      "Subdivision matched from Cook County official GIS lots layer derived from recorded plats.",
    "parcel_gis_attribute":        "Subdivision name taken from the Cook County GIS parcel subdivision attribute field.",
    "parcel_within_geometry":      "Current parcel polygon falls within a known subdivision boundary.",
    "parcel_centroid_in_geometry": "Parcel centroid falls within a known subdivision boundary.",
    "address_street_match":        "Subdivision inferred from address or street segment overlap with known subdivision.",
    "fuzzy_name_match":            "Subdivision name matched using normalized fuzzy comparison; manual review recommended.",
    "manual_review":               "Assigned by a researcher after manual review of plat records or other sources.",
    "no_match":                    "No subdivision match found. Parcel is in the manual research queue.",
}

SUBDIVISION_SOURCE_CONFIDENCE: dict[str, str] = {
    "Cook County GIS parcel attribute": "medium",
    "Cook County GIS lots layer": "high",
    "Recorded plat legal description": "high",
    "Park Ridge land family CSV": "medium",
    "Manual researcher review": "high",
    "Estimated from spatial overlap": "low",
    "Unknown": "unknown",
}


def confidence_for_method(match_method: str) -> str:
    return MATCH_CONFIDENCE.get(match_method, "unknown")


def reason_for_method(match_method: str) -> str:
    return MATCH_REASONS.get(match_method, "Match method not documented.")


def confidence_label(level: str) -> str:
    labels = {
        "high":    "High",
        "medium":  "Medium",
        "low":     "Low",
        "unknown": "Unknown",
    }
    return labels.get(level, "Unknown")


def confidence_description(level: str) -> str:
    descriptions = {
        "high":    "Subdivision name and source are from an official recorded plat, official Cook County GIS lot layer, or verified legal description.",
        "medium":  "Subdivision name is from a Cook County GIS attribute or field, but the original recording date has not been independently confirmed.",
        "low":     "Subdivision name is inferred from spatial overlap, a historical map, or an aerial image without precise source confirmation.",
        "unknown": "No reliable subdivision record has been found for this parcel yet. It may be in the manual research queue.",
    }
    return descriptions.get(level, "Confidence level not documented.")


def rank_confidence(level: str) -> int:
    """Higher rank = more trustworthy. Use for deduplication."""
    return {"high": 3, "medium": 2, "low": 1, "unknown": 0}.get(level, 0)
