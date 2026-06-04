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


def test_public_parcels_include_searchable_addresses():
    payload = json.loads(Path("public/data/park_ridge_parcels_enriched.geojson").read_text())
    addresses = [feature["properties"].get("address") for feature in payload["features"]]

    assert sum(1 for address in addresses if address) > 10000
    assert any("VINE" in address for address in addresses if address)


def test_historic_character_layer_has_century_home_candidates():
    payload = json.loads(Path("public/data/historical/park_ridge_historic_character.geojson").read_text())
    properties = [feature["properties"] for feature in payload["features"]]

    assert len(properties) > 500
    assert all(property_["layer_kind"] == "historic_character" for property_ in properties)
    assert max(property_["year_built"] for property_ in properties if property_["year_built"]) <= 1926


def test_building_footprints_and_lot_coverage_layers_are_populated():
    footprints = json.loads(Path("public/data/historical/cook_county_building_footprints_2017.geojson").read_text())
    coverage = json.loads(Path("public/data/historical/park_ridge_lot_coverage.geojson").read_text())
    coverage_properties = [feature["properties"] for feature in coverage["features"]]

    assert len(footprints["features"]) > 10000
    assert len(coverage["features"]) > 10000
    assert any(property_["lot_coverage_pct"] > 0.35 for property_ in coverage_properties)
    assert all("lot_coverage_class" in property_ for property_ in coverage_properties)
