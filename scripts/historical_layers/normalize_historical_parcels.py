from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import pandas as pd

from scripts.pipeline_utils import normalize_pin


def normalize_historical_parcel_frame(frame: pd.DataFrame, year: int, pin_column: str) -> pd.DataFrame:
    normalized = frame[pin_column].map(normalize_pin).apply(pd.Series)
    result = pd.concat([frame.copy(), normalized], axis=1)
    result["source_year"] = year
    result["synthetic_sample"] = False
    if "geometry" in result.columns:
        result["geometry_area_sqft"] = result["geometry"].map(geometry_area_sqft)
    return result


def geometry_area_sqft(geometry: Any) -> float | None:
    area = getattr(geometry, "area", None)
    if area is None:
        return None
    try:
        return float(area)
    except (TypeError, ValueError):
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize a historical parcel CSV into the interim historical area.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--pin-column", required=True)
    args = parser.parse_args()

    frame = pd.read_csv(args.input, dtype={args.pin_column: "string"})
    result = normalize_historical_parcel_frame(frame, args.year, args.pin_column)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False)
    print(f"Wrote normalized historical parcels to {args.output}")


if __name__ == "__main__":
    main()
