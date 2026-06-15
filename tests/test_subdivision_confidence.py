"""Tests for subdivision confidence model."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.data.subdivisions.confidence import (
    CONFIDENCE_LEVELS,
    MATCH_CONFIDENCE,
    confidence_for_method,
    reason_for_method,
    confidence_label,
    confidence_description,
    rank_confidence,
)


class TestConfidenceLevels:
    def test_all_four_levels_defined(self):
        assert set(CONFIDENCE_LEVELS) == {"high", "medium", "low", "unknown"}

    def test_all_match_methods_have_confidence(self):
        for method in MATCH_CONFIDENCE:
            assert MATCH_CONFIDENCE[method] in CONFIDENCE_LEVELS


class TestConfidenceForMethod:
    def test_exact_legal_description_is_high(self):
        assert confidence_for_method("exact_legal_description") == "high"

    def test_official_gis_lot_layer_is_high(self):
        assert confidence_for_method("official_gis_lot_layer") == "high"

    def test_manual_review_is_high(self):
        assert confidence_for_method("manual_review") == "high"

    def test_parcel_gis_attribute_is_medium(self):
        assert confidence_for_method("parcel_gis_attribute") == "medium"

    def test_parcel_within_geometry_is_medium(self):
        assert confidence_for_method("parcel_within_geometry") == "medium"

    def test_parcel_centroid_in_geometry_is_medium(self):
        assert confidence_for_method("parcel_centroid_in_geometry") == "medium"

    def test_land_family_research_is_medium(self):
        assert confidence_for_method("land_family_research") == "medium"

    def test_assessor_subdivision_id_is_low(self):
        assert confidence_for_method("assessor_subdivision_id") == "low"

    def test_address_street_match_is_low(self):
        assert confidence_for_method("address_street_match") == "low"

    def test_fuzzy_name_match_is_low(self):
        assert confidence_for_method("fuzzy_name_match") == "low"

    def test_no_match_is_unknown(self):
        assert confidence_for_method("no_match") == "unknown"

    def test_unknown_method_returns_unknown(self):
        assert confidence_for_method("does_not_exist") == "unknown"


class TestReasonForMethod:
    def test_returns_string_for_known_methods(self):
        for method in MATCH_CONFIDENCE:
            reason = reason_for_method(method)
            assert isinstance(reason, str)
            assert len(reason) > 0

    def test_returns_fallback_for_unknown_method(self):
        reason = reason_for_method("nonexistent_method")
        assert isinstance(reason, str)
        assert len(reason) > 0

    def test_exact_legal_description_reason_mentions_legal(self):
        reason = reason_for_method("exact_legal_description")
        assert "legal" in reason.lower() or "plat" in reason.lower()

    def test_fuzzy_name_match_reason_mentions_manual_review(self):
        reason = reason_for_method("fuzzy_name_match")
        assert "manual" in reason.lower() or "fuzzy" in reason.lower()

    def test_assessor_subdivision_id_reason_mentions_not_recorded_plat(self):
        reason = reason_for_method("assessor_subdivision_id")
        assert "not a recorded plat" in reason.lower()


class TestConfidenceLabel:
    def test_high_label(self):
        assert confidence_label("high") == "High"

    def test_medium_label(self):
        assert confidence_label("medium") == "Medium"

    def test_low_label(self):
        assert confidence_label("low") == "Low"

    def test_unknown_label(self):
        assert confidence_label("unknown") == "Unknown"

    def test_invalid_level_returns_unknown(self):
        assert confidence_label("bogus") == "Unknown"


class TestConfidenceDescription:
    def test_returns_string_for_all_levels(self):
        for level in CONFIDENCE_LEVELS:
            desc = confidence_description(level)
            assert isinstance(desc, str)
            assert len(desc) > 0

    def test_high_description_mentions_official_source(self):
        desc = confidence_description("high")
        assert "official" in desc.lower() or "plat" in desc.lower() or "verified" in desc.lower()

    def test_unknown_description_mentions_research_queue(self):
        desc = confidence_description("unknown")
        assert "research" in desc.lower() or "found" in desc.lower()

    def test_invalid_level_returns_string(self):
        desc = confidence_description("bogus")
        assert isinstance(desc, str)
        assert len(desc) > 0


class TestRankConfidence:
    def test_high_ranks_highest(self):
        assert rank_confidence("high") > rank_confidence("medium")

    def test_medium_ranks_above_low(self):
        assert rank_confidence("medium") > rank_confidence("low")

    def test_low_ranks_above_unknown(self):
        assert rank_confidence("low") > rank_confidence("unknown")

    def test_unknown_ranks_zero(self):
        assert rank_confidence("unknown") == 0

    def test_invalid_level_ranks_zero(self):
        assert rank_confidence("bogus") == 0

    def test_all_levels_have_unique_ranks(self):
        ranks = [rank_confidence(lvl) for lvl in CONFIDENCE_LEVELS]
        assert len(ranks) == len(set(ranks)), "Each confidence level must have a unique rank"

    def test_rank_ordering_matches_confidence_ordering(self):
        ordered = sorted(CONFIDENCE_LEVELS, key=rank_confidence, reverse=True)
        assert ordered == ["high", "medium", "low", "unknown"]
