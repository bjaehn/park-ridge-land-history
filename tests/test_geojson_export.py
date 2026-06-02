import json

from scripts.export_geojson import validate_geojson


def test_validate_geojson_accepts_feature_collection(tmp_path):
    path = tmp_path / "valid.geojson"
    path.write_text(json.dumps({"type": "FeatureCollection", "features": []}), encoding="utf-8")
    payload = validate_geojson(path)
    assert payload["features"] == []


def test_validate_geojson_rejects_non_feature_collection(tmp_path):
    path = tmp_path / "invalid.geojson"
    path.write_text(json.dumps({"type": "Feature", "geometry": None, "properties": {}}), encoding="utf-8")
    try:
        validate_geojson(path)
    except ValueError as exc:
        assert "not a FeatureCollection" in str(exc)
    else:
        raise AssertionError("Expected ValueError")
