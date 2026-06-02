from scripts.pipeline_utils import decade_bucket, year_quality_flags


def test_missing_year_is_unknown():
    assert decade_bucket(None, current_year=2026) == "Unknown"


def test_pre_1900_bucket():
    assert decade_bucket(1888, current_year=2026) == "Pre-1900"


def test_regular_decade_bucket():
    assert decade_bucket(1928, current_year=2026) == "1920s"
    assert decade_bucket("2018", current_year=2026) == "2010s"


def test_suspicious_years_are_flagged():
    assert decade_bucket(1799, current_year=2026) == "Suspicious"
    assert decade_bucket(2027, current_year=2026) == "Suspicious"
    assert year_quality_flags(2027, current_year=2026) == ["year_built_after_current_year"]
