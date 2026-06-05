from __future__ import annotations

import argparse
import csv
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from scripts.data_sources import PROJECT_ROOT

HARGIS_SERVICE = (
    "https://services.arcgis.com/b9DHj1BjfdLLFv11/arcgis/rest/services/"
    "NEW_Properties_with_Photo_Relate_Public_View/FeatureServer"
)
PROPERTIES_QUERY = f"{HARGIS_SERVICE}/0/query"
PHOTOS_QUERY = f"{HARGIS_SERVICE}/1/query"
PDFS_QUERY = f"{HARGIS_SERVICE}/2/query"

PROPERTY_FIELDS = [
    "OBJECTID",
    "REFNUM",
    "NREVAL",
    "SignificantName",
    "OtherName",
    "Location",
    "StreetIndex",
    "County",
    "City",
    "ZipCode",
    "NREval_1",
    "CertCD",
    "StaffEval",
    "HistDistRefNum",
    "Category",
    "Condition",
    "Integrity",
    "ArchClass",
    "CurrentFunction",
    "HistoricFunction",
    "WallMaterials",
    "RoofMaterials",
    "FoundationMaterials",
    "OtherMaterials",
    "Architect",
    "Builder",
    "BeginYear",
    "EndYear",
    "SurveyDate",
    "OpinionOfSignificance",
    "PIN",
]
PHOTO_FIELDS = ["OBJECTID", "FileName", "ItemId", "CountyName", "PhotoID", "Url", "RefNum", "GlobalID"]
PDF_FIELDS = ["OBJECTID", "REFNUM", "Item_ID", "URL", "GlobalID"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Download Park Ridge HARGIS historic survey records.")
    parser.add_argument("--city", default="Park Ridge")
    parser.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "data/raw")
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    properties = download_properties(args.city)
    refnums = sorted({str(row.get("REFNUM")) for row in properties if row.get("REFNUM")})
    photos = download_related_rows(PHOTOS_QUERY, "RefNum", refnums)
    pdfs = download_related_rows(PDFS_QUERY, "REFNUM", refnums)

    write_csv(args.out_dir / "hargis_park_ridge_properties.csv", properties, PROPERTY_FIELDS + ["latitude", "longitude"])
    write_csv(args.out_dir / "hargis_park_ridge_photos.csv", photos, PHOTO_FIELDS)
    write_csv(args.out_dir / "hargis_park_ridge_pdfs.csv", pdfs, PDF_FIELDS)

    print(f"Wrote {len(properties):,} HARGIS properties")
    print(f"Wrote {len(photos):,} HARGIS linked photos")
    print(f"Wrote {len(pdfs):,} HARGIS linked PDFs")


def download_properties(city: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    page_size = 500
    city_value = city.replace("'", "''")
    while True:
        payload = arcgis_get(
            PROPERTIES_QUERY,
            {
                "f": "json",
                "where": f"City = '{city_value}'",
                "outFields": ",".join(PROPERTY_FIELDS),
                "returnGeometry": "true",
                "outSR": "4326",
                "orderByFields": "OBJECTID",
                "resultOffset": str(offset),
                "resultRecordCount": str(page_size),
            },
        )
        features = payload.get("features", [])
        if not features:
            break
        for feature in features:
            row = dict(feature.get("attributes") or {})
            geometry = feature.get("geometry") or {}
            row["longitude"] = geometry.get("x")
            row["latitude"] = geometry.get("y")
            rows.append(row)
        if not payload.get("exceededTransferLimit") and len(features) < page_size:
            break
        offset += page_size
    return rows


def download_related_rows(query_url: str, refnum_field: str, refnums: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for chunk in chunks(refnums, 80):
        quoted = ",".join(f"'{refnum}'" for refnum in chunk)
        payload = arcgis_get(
            query_url,
            {
                "f": "json",
                "where": f"{refnum_field} IN ({quoted})",
                "outFields": "*",
                "returnGeometry": "false",
                "resultRecordCount": "2000",
            },
        )
        rows.extend(dict(feature.get("attributes") or {}) for feature in payload.get("features", []))
        time.sleep(0.1)
    return rows


def arcgis_get(url: str, params: dict[str, str], retries: int = 3) -> dict[str, Any]:
    encoded = urllib.parse.urlencode(params, safe=",()*='")
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(f"{url}?{encoded}", timeout=90) as response:
                payload = json.load(response)
            if "error" in payload:
                raise RuntimeError(payload["error"])
            return payload
        except Exception:
            if attempt == retries:
                raise
            time.sleep(1.5 * attempt)
    raise RuntimeError("ArcGIS request failed.")


def write_csv(path: Path, rows: list[dict[str, Any]], default_fields: list[str]) -> None:
    fieldnames = sorted({*default_fields, *(key for row in rows for key in row)})
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def chunks(values: list[str], size: int) -> list[list[str]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


if __name__ == "__main__":
    main()
