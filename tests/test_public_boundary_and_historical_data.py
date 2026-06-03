import json
from pathlib import Path


def test_public_boundary_is_not_placeholder_box():
    payload = json.loads(Path("public/data/park_ridge_boundary.geojson").read_text())
    feature = payload["features"][0]

    assert payload["name"] != "park_ridge_boundary_placeholder"
    assert feature["properties"]["name"] == "Park Ridge"
    assert "TIGER/Line" in feature["properties"]["source_name"]
    assert "placeholder" not in feature["properties"].get("source_note", "").lower()


def test_real_2021_historical_layer_has_park_ridge_parcels():
    payload = json.loads(Path("public/data/historical/cook_parcels_2021.geojson").read_text())

    assert len(payload["features"]) > 10000
    first = payload["features"][0]["properties"]
    assert first["source_year"] == 2021
    assert first["municipality"] == "Park Ridge"
    assert first["synthetic_sample"] is False


def test_real_2000_historical_layer_has_park_ridge_parcels():
    payload = json.loads(Path("public/data/historical/cook_parcels_2000.geojson").read_text())

    assert len(payload["features"]) > 10000
    first = payload["features"][0]["properties"]
    assert first["source_year"] == 2000
    assert first["park_ridge_filter_method"] == "centroid_within_2024_tiger_boundary"
    assert first["synthetic_sample"] is False


def test_real_2000_to_2021_change_layer_has_expected_candidate_types():
    payload = json.loads(Path("public/data/historical/parcel_changes_2000_2021.geojson").read_text())
    change_types = {feature["properties"]["change_type"] for feature in payload["features"]}

    assert len(payload["features"]) > 10000
    assert {
        "unchanged",
        "likely_split",
        "likely_merge",
        "new_pin",
        "retired_pin",
        "geometry_or_area_changed",
    }.issubset(change_types)
