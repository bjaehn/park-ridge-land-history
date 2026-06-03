from scripts.historical_layers.registry import load_registry


def test_registry_has_required_historical_layer_families():
    layers = load_registry()
    layer_ids = {layer["id"] for layer in layers}

    assert "cook_parcels_2000" in layer_ids
    assert "cook_parcels_2021" in layer_ids
    assert "sample_parcel_changes_2000_2021" in layer_ids
    assert "ilhap_cook_1938_1939" in layer_ids
    assert "cook_recorded_subdivision_plats" in layer_ids
    assert "sanborn_park_ridge_placeholder" in layer_ids


def test_ready_layers_have_public_data_or_tiles():
    for layer in load_registry():
        if layer["status"] in {"ready", "available"}:
            assert layer.get("dataPath") or layer.get("tileUrl")


def test_registry_separates_year_built_from_subdivision_evidence():
    notes = " ".join(str(layer.get("notes", "")) for layer in load_registry()).lower()
    assert "year built is not subdivision date" in notes or "assessor year-built is not sufficient" in notes


def test_2021_layer_uses_real_cook_county_data_path():
    layer = next(layer for layer in load_registry() if layer["id"] == "cook_parcels_2021")
    assert layer["dataPath"] == "/data/historical/cook_parcels_2021.geojson"
    assert layer.get("syntheticSample") is not True
