from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from shapely.geometry import mapping, shape


def compare_parcel_years(
    old_collection: dict[str, Any],
    new_collection: dict[str, Any],
    old_year: int,
    new_year: int,
    area_threshold_pct: float = 10,
    overlap_threshold_pct: float = 10,
) -> dict[str, Any]:
    old_features = prepare_features(old_collection)
    new_features = prepare_features(new_collection)
    old_by_pin = {feature["pin"]: feature for feature in old_features if feature["pin"]}
    new_by_pin = {feature["pin"]: feature for feature in new_features if feature["pin"]}
    used_old: set[int] = set()
    used_new: set[int] = set()
    changes: list[dict[str, Any]] = []

    for old_index, old_feature in enumerate(old_features):
        pin = old_feature["pin"]
        if not pin or pin not in new_by_pin:
            continue
        new_index = new_features.index(new_by_pin[pin])
        new_feature = new_by_pin[pin]
        area_delta = area_change_pct(old_feature["geometry"].area, new_feature["geometry"].area)
        change_type = "geometry_or_area_changed" if area_delta > area_threshold_pct else "unchanged"
        changes.append(change_feature(change_type, old_feature, new_feature, old_year, new_year, area_delta))
        used_old.add(old_index)
        used_new.add(new_index)

    overlaps = build_overlap_index(old_features, new_features, overlap_threshold_pct)

    for old_index, new_indexes in overlaps["old_to_new"].items():
        if old_index in used_old:
            continue
        candidates = [new_index for new_index in new_indexes if new_index not in used_new]
        if len(candidates) >= 2:
            old_feature = old_features[old_index]
            child_pins = [new_features[new_index]["pin"] for new_index in candidates]
            changes.append(change_feature(
                "likely_split",
                old_feature,
                None,
                old_year,
                new_year,
                None,
                new_pin=";".join(pin for pin in child_pins if pin),
            ))
            used_old.add(old_index)
            used_new.update(candidates)

    for new_index, old_indexes in overlaps["new_to_old"].items():
        if new_index in used_new:
            continue
        candidates = [old_index for old_index in old_indexes if old_index not in used_old]
        if len(candidates) >= 2:
            new_feature = new_features[new_index]
            parent_pins = [old_features[old_index]["pin"] for old_index in candidates]
            changes.append(change_feature(
                "likely_merge",
                None,
                new_feature,
                old_year,
                new_year,
                None,
                old_pin=";".join(pin for pin in parent_pins if pin),
            ))
            used_old.update(candidates)
            used_new.add(new_index)

    for old_index, old_feature in enumerate(old_features):
        if old_index not in used_old:
            changes.append(change_feature("retired_pin", old_feature, None, old_year, new_year, None))

    for new_index, new_feature in enumerate(new_features):
        if new_index not in used_new:
            changes.append(change_feature("new_pin", None, new_feature, old_year, new_year, None))

    return {
        "type": "FeatureCollection",
        "features": changes,
    }


def prepare_features(collection: dict[str, Any]) -> list[dict[str, Any]]:
    prepared = []
    for feature in collection.get("features", []):
        properties = feature.get("properties", {})
        prepared.append({
            "feature": feature,
            "geometry": shape(feature["geometry"]),
            "pin": properties.get("pin_normalized") or properties.get("pin") or properties.get("pin_original"),
        })
    return prepared


def build_overlap_index(
    old_features: list[dict[str, Any]],
    new_features: list[dict[str, Any]],
    overlap_threshold_pct: float,
) -> dict[str, dict[int, list[int]]]:
    old_to_new: dict[int, list[int]] = {}
    new_to_old: dict[int, list[int]] = {}
    for old_index, old_feature in enumerate(old_features):
        for new_index, new_feature in enumerate(new_features):
            intersection_area = old_feature["geometry"].intersection(new_feature["geometry"]).area
            if intersection_area <= 0:
                continue
            old_overlap = (intersection_area / old_feature["geometry"].area) * 100
            new_overlap = (intersection_area / new_feature["geometry"].area) * 100
            if old_overlap >= overlap_threshold_pct or new_overlap >= overlap_threshold_pct:
                old_to_new.setdefault(old_index, []).append(new_index)
                new_to_old.setdefault(new_index, []).append(old_index)
    return {"old_to_new": old_to_new, "new_to_old": new_to_old}


def area_change_pct(old_area: float, new_area: float) -> float:
    if old_area <= 0:
        return 0
    return abs(new_area - old_area) / old_area * 100


def change_feature(
    change_type: str,
    old_feature: dict[str, Any] | None,
    new_feature: dict[str, Any] | None,
    old_year: int,
    new_year: int,
    area_delta: float | None,
    old_pin: str | None = None,
    new_pin: str | None = None,
) -> dict[str, Any]:
    geometry_owner = new_feature or old_feature
    assert geometry_owner is not None
    return {
        "type": "Feature",
        "properties": {
            "change_type": change_type,
            "old_pin": old_pin if old_pin is not None else old_feature["pin"] if old_feature else None,
            "new_pin": new_pin if new_pin is not None else new_feature["pin"] if new_feature else None,
            "old_year": old_year,
            "new_year": new_year,
            "area_change_pct": round(area_delta, 2) if area_delta is not None else None,
            "confidence": confidence_for_change(change_type),
        },
        "geometry": mapping(geometry_owner["geometry"]),
    }


def confidence_for_change(change_type: str) -> str:
    if change_type == "unchanged":
        return "high"
    if change_type in {"likely_split", "likely_merge", "geometry_or_area_changed"}:
        return "medium"
    return "low"


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare two historical parcel GeoJSON years.")
    parser.add_argument("old_geojson", type=Path)
    parser.add_argument("new_geojson", type=Path)
    parser.add_argument("output_geojson", type=Path)
    parser.add_argument("--old-year", type=int, required=True)
    parser.add_argument("--new-year", type=int, required=True)
    args = parser.parse_args()

    old_collection = json.loads(args.old_geojson.read_text(encoding="utf-8"))
    new_collection = json.loads(args.new_geojson.read_text(encoding="utf-8"))
    result = compare_parcel_years(old_collection, new_collection, args.old_year, args.new_year)
    args.output_geojson.parent.mkdir(parents=True, exist_ok=True)
    args.output_geojson.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(result['features'])} parcel change candidates to {args.output_geojson}")


if __name__ == "__main__":
    main()
