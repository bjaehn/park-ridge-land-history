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


def test_public_parcels_are_real_full_dataset_not_synthetic_sample():
    payload = json.loads(Path("public/data/park_ridge_parcels_enriched.geojson").read_text())
    properties = [feature["properties"] for feature in payload["features"]]

    assert len(properties) > 10000
    assert not Path("public/data/sample_parcels.geojson").exists()
    assert all(property_.get("synthetic_sample") is not True for property_ in properties)
    assert all(property_.get("primary_building_selection_method") != "synthetic_sample" for property_ in properties)


def test_public_parcels_include_real_permit_history():
    payload = json.loads(Path("public/data/park_ridge_parcels_enriched.geojson").read_text())
    events = [
        event
        for feature in payload["features"]
        for event in feature["properties"].get("house_evolution_timeline", [])
        if event.get("event_type") == "permit"
    ]

    assert len(events) > 8000
    assert min(event["year"] for event in events if event.get("year")) >= 2018
    assert max(event["year"] for event in events if event.get("year")) >= 2026
    assert all(event.get("source") == "Cook County Assessor Permits" for event in events)
    assert not any(str(event.get("permit_number", "")).startswith("PR-") for event in events)


def test_public_parcels_include_sale_history():
    payload = json.loads(Path("public/data/park_ridge_parcels_enriched.geojson").read_text())
    sale_parcels = [
        feature["properties"]
        for feature in payload["features"]
        if feature["properties"].get("sale_count", 0) > 0
    ]

    assert len(sale_parcels) > 5000
    assert any(property_.get("latest_sale_price") for property_ in sale_parcels)
    assert any(
        event.get("event_type") == "sale"
        for property_ in sale_parcels
        for event in property_.get("house_evolution_timeline", [])
    )


def test_public_parcels_include_assessment_appeal_and_proximity_context():
    payload = json.loads(Path("public/data/park_ridge_parcels_enriched.geojson").read_text())
    properties = [feature["properties"] for feature in payload["features"]]

    assert sum(1 for property_ in properties if property_.get("latest_assessed_total")) > 10000
    assert sum(1 for property_ in properties if property_.get("assessed_value_change_pct") is not None) > 10000
    assert sum(1 for property_ in properties if property_.get("appeal_count", 0) > 0) > 5000
    assert sum(1 for property_ in properties if property_.get("nearest_park_dist_ft") is not None) > 10000
    assert sum(1 for property_ in properties if property_.get("nearest_metra_stop_dist_ft") is not None) > 10000
    assert sum(1 for property_ in properties if property_.get("foreclosure_per_1000_half_mile_5yr") is not None) > 10000


def test_historic_character_layer_has_century_home_candidates():
    payload = json.loads(Path("public/data/historical/park_ridge_historic_character.geojson").read_text())
    properties = [feature["properties"] for feature in payload["features"]]

    assert len(properties) > 500
    assert all(property_["layer_kind"] == "historic_character" for property_ in properties)
    assert max(property_["year_built"] for property_ in properties if property_["year_built"]) <= 1926


def test_public_parcels_include_hargis_historic_survey_matches():
    payload = json.loads(Path("public/data/park_ridge_parcels_enriched.geojson").read_text())
    properties = [feature["properties"] for feature in payload["features"]]
    matches = [property_ for property_ in properties if property_.get("hargis_record_count", 0) > 0]

    assert len(matches) > 100
    assert sum(property_.get("hargis_record_count", 0) for property_ in matches) >= 164
    assert sum(property_.get("hargis_photo_count", 0) for property_ in matches) >= 190
    assert any(property_.get("hargis_architect") == "Zook & McCaughey" for property_ in matches)
    assert any(
        event.get("event_type") == "historic_survey"
        for property_ in matches
        for event in property_.get("house_evolution_timeline", [])
    )


def test_hargis_historical_layer_has_survey_matches():
    payload = json.loads(Path("public/data/historical/park_ridge_hargis_historic_survey.geojson").read_text())
    properties = [feature["properties"] for feature in payload["features"]]

    assert len(properties) > 100
    assert all(property_["layer_kind"] == "hargis_historic_survey" for property_ in properties)
    assert any(property_.get("hargis_arch_class") == "Tudor Revival" for property_ in properties)


def test_building_footprints_and_lot_coverage_layers_are_populated():
    footprints = json.loads(Path("public/data/historical/cook_county_building_footprints_2017.geojson").read_text())
    coverage = json.loads(Path("public/data/historical/park_ridge_lot_coverage.geojson").read_text())
    coverage_properties = [feature["properties"] for feature in coverage["features"]]

    assert len(footprints["features"]) > 10000
    assert len(coverage["features"]) > 10000
    assert any(property_["lot_coverage_pct"] > 0.35 for property_ in coverage_properties)
    assert all("lot_coverage_class" in property_ for property_ in coverage_properties)
