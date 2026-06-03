import json
from pathlib import Path

from scripts.historical_layers.compare_parcel_years import compare_parcel_years


def test_compare_sample_years_detects_expected_change_types():
    old_collection = json.loads(Path("public/data/historical/sample_historical_parcels_2000.geojson").read_text())
    new_collection = json.loads(Path("public/data/historical/sample_historical_parcels_2021.geojson").read_text())

    result = compare_parcel_years(old_collection, new_collection, old_year=2000, new_year=2021)
    change_types = {feature["properties"]["change_type"] for feature in result["features"]}

    assert "unchanged" in change_types
    assert "likely_split" in change_types
    assert "likely_merge" in change_types
    assert "geometry_or_area_changed" in change_types
    assert "retired_pin" in change_types
    assert "new_pin" in change_types


def test_compare_features_include_years_and_confidence():
    old_collection = json.loads(Path("public/data/historical/sample_historical_parcels_2000.geojson").read_text())
    new_collection = json.loads(Path("public/data/historical/sample_historical_parcels_2021.geojson").read_text())

    result = compare_parcel_years(old_collection, new_collection, old_year=2000, new_year=2021)

    assert all(feature["properties"]["old_year"] == 2000 for feature in result["features"])
    assert all(feature["properties"]["new_year"] == 2021 for feature in result["features"])
    assert all(feature["properties"]["confidence"] for feature in result["features"])
