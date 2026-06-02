from scripts.pipeline_utils import choose_primary_record


def test_primary_prefers_largest_building_with_year_built():
    records = [
        {"pin": "1", "year_built": None, "building_sqft": 5000},
        {"pin": "1", "year_built": 1910, "building_sqft": 1200},
        {"pin": "1", "year_built": 1930, "building_sqft": 2200},
    ]
    primary, method = choose_primary_record(records)
    assert primary["year_built"] == 1930
    assert method == "largest_sqft_with_year_built"


def test_primary_keeps_first_record_without_years():
    records = [
        {"pin": "1", "year_built": None, "building_sqft": 5000},
        {"pin": "1", "year_built": None, "building_sqft": 1200},
    ]
    primary, method = choose_primary_record(records)
    assert primary["building_sqft"] == 5000
    assert method == "first_record_no_year_built"
