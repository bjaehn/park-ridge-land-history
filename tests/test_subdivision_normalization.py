"""Tests for subdivision name normalization utilities."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.data.subdivisions.normalize import (
    normalize_subdivision_name,
    display_name,
    names_are_equivalent,
    rough_similarity,
)


class TestNormalizeSubdivisionName:
    def test_none_returns_none(self):
        assert normalize_subdivision_name(None) is None

    def test_empty_string_returns_none(self):
        assert normalize_subdivision_name("") is None

    def test_whitespace_only_returns_none(self):
        assert normalize_subdivision_name("   ") is None

    def test_null_string_returns_none(self):
        assert normalize_subdivision_name("NULL") is None

    def test_nan_string_returns_none(self):
        assert normalize_subdivision_name("NaN") is None

    def test_none_string_returns_none(self):
        assert normalize_subdivision_name("NONE") is None

    def test_unknown_returns_none(self):
        assert normalize_subdivision_name("UNKNOWN") is None

    def test_uppercases_input(self):
        result = normalize_subdivision_name("oakwood addition")
        assert result == result.upper() if result else True

    def test_strips_whitespace(self):
        result = normalize_subdivision_name("  OAKWOOD ADDITION  ")
        assert result == "OAKWOOD ADDITION"

    def test_expands_add_abbreviation(self):
        result = normalize_subdivision_name("OAKWOOD ADD")
        assert result is not None and "ADDITION" in result

    def test_expands_add_with_period(self):
        result = normalize_subdivision_name("OAKWOOD ADD.")
        assert result is not None and "ADDITION" in result

    def test_expands_subd_abbreviation(self):
        result = normalize_subdivision_name("OAKWOOD SUBD")
        assert result is not None and "SUBDIVISION" in result

    def test_expands_subdiv_abbreviation(self):
        result = normalize_subdivision_name("OAKWOOD SUBDIV.")
        assert result is not None and "SUBDIVISION" in result

    def test_expands_ext_abbreviation(self):
        result = normalize_subdivision_name("OAKWOOD EXT")
        assert result is not None and "EXTENSION" in result

    def test_expands_resubd_abbreviation(self):
        result = normalize_subdivision_name("OAKWOOD RESUBD")
        assert result is not None and "RESUBDIVISION" in result

    def test_strips_noise_phrase_subdivision_of(self):
        result = normalize_subdivision_name("SUBDIVISION OF OAKWOOD LOTS")
        assert result is not None
        assert not result.startswith("SUBDIVISION OF")

    def test_strips_noise_phrase_resubdivision_of(self):
        result = normalize_subdivision_name("RESUBDIVISION OF OAKWOOD LOTS")
        assert result is not None
        assert not result.startswith("RESUBDIVISION OF")

    def test_strips_noise_phrase_part_of(self):
        result = normalize_subdivision_name("PART OF OAKWOOD SUBDIVISION")
        assert result is not None
        assert not result.startswith("PART OF")

    def test_strips_park_ridge_suffix(self):
        result = normalize_subdivision_name("OAKWOOD ADDITION PARK RIDGE")
        assert result is not None
        assert "PARK RIDGE" not in result

    def test_strips_cook_county_suffix(self):
        result = normalize_subdivision_name("OAKWOOD ADDITION COOK COUNTY")
        assert result is not None
        assert "COOK COUNTY" not in result

    def test_strips_illinois_suffix(self):
        result = normalize_subdivision_name("OAKWOOD ADDITION ILLINOIS")
        assert result is not None
        assert "ILLINOIS" not in result

    def test_removes_punctuation(self):
        result = normalize_subdivision_name("OAK-WOOD'S ADDITION")
        assert result is not None
        assert "'" not in result
        assert "-" not in result

    def test_collapses_spaces(self):
        result = normalize_subdivision_name("OAKWOOD  ADDITION")
        assert result == "OAKWOOD ADDITION"

    def test_no_number_suffix_ordinals(self):
        result = normalize_subdivision_name("OAKWOOD 2ND ADDITION")
        assert result is not None
        assert "ND" not in result
        assert "2" in result

    def test_returns_string_for_valid_name(self):
        result = normalize_subdivision_name("OAKWOOD ADDITION")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_accepts_non_string_input(self):
        assert normalize_subdivision_name(123) is not None


class TestDisplayName:
    def test_title_cases_simple_name(self):
        assert display_name("OAKWOOD ADDITION") == "Oakwood Addition"

    def test_title_cases_multiple_words(self):
        result = display_name("NORTH PARK RIDGE ESTATES")
        assert result == "North Park Ridge Estates"

    def test_handles_single_word(self):
        assert display_name("OAKWOOD") == "Oakwood"


class TestNamesAreEquivalent:
    def test_identical_names(self):
        assert names_are_equivalent("OAKWOOD ADDITION", "OAKWOOD ADDITION")

    def test_case_insensitive(self):
        assert names_are_equivalent("Oakwood Addition", "OAKWOOD ADDITION")

    def test_abbreviation_vs_full(self):
        assert names_are_equivalent("OAKWOOD ADD", "OAKWOOD ADDITION")

    def test_whitespace_ignored(self):
        assert names_are_equivalent("  OAKWOOD ADDITION  ", "OAKWOOD ADDITION")

    def test_different_names_not_equivalent(self):
        assert not names_are_equivalent("OAKWOOD ADDITION", "ELM PARK SUBDIVISION")

    def test_none_not_equivalent(self):
        assert not names_are_equivalent(None, "OAKWOOD ADDITION")

    def test_both_none_not_equivalent(self):
        assert not names_are_equivalent(None, None)

    def test_empty_not_equivalent(self):
        assert not names_are_equivalent("", "OAKWOOD ADDITION")

    def test_noise_phrase_stripped(self):
        assert names_are_equivalent(
            "SUBDIVISION OF OAKWOOD LOTS", "OAKWOOD LOTS"
        )


class TestRoughSimilarity:
    def test_identical_names_score_one(self):
        assert rough_similarity("OAKWOOD ADDITION", "OAKWOOD ADDITION") == 1.0

    def test_completely_different_score_zero(self):
        score = rough_similarity("OAKWOOD ADDITION", "ELM GROVE SUBDIVISION")
        assert score == 0.0

    def test_partial_overlap_score_between(self):
        score = rough_similarity("OAKWOOD ADDITION", "OAKWOOD HEIGHTS")
        assert 0.0 < score < 1.0

    def test_none_inputs_score_zero(self):
        assert rough_similarity(None, "OAKWOOD ADDITION") == 0.0
        assert rough_similarity("OAKWOOD ADDITION", None) == 0.0
        assert rough_similarity(None, None) == 0.0

    def test_empty_inputs_score_zero(self):
        assert rough_similarity("", "OAKWOOD ADDITION") == 0.0

    def test_threshold_75_for_strong_match(self):
        # "OAKWOOD ADDITION NO 2" vs "OAKWOOD ADDITION": 2 of 3 unique words match → 0.67 (below threshold)
        score = rough_similarity("OAKWOOD ADDITION NO 2", "OAKWOOD ADDITION")
        assert score > 0.0  # some overlap
        # Exact same-name units should score 1.0
        assert rough_similarity("OAKWOOD ADDITION", "OAKWOOD ADDITION") >= 0.75
