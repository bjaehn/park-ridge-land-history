from scripts.pipeline_utils import normalize_pin


def test_hyphenated_pin_normalizes_to_14_digits():
    result = normalize_pin("09-25-101-001-0000")
    assert result["pin_normalized"] == "09251010010000"
    assert result["pin_valid"] is True


def test_short_pin_is_zero_padded():
    result = normalize_pin("9251010010000")
    assert result["pin_normalized"] == "09251010010000"
    assert result["pin_valid"] is True


def test_invalid_pin_preserves_original_and_flags():
    result = normalize_pin("not a pin")
    assert result["pin_original"] == "not a pin"
    assert result["pin_normalized"] is None
    assert result["pin_quality_flag"] == "pin_has_no_digits"
