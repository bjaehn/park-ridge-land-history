from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
REGISTRY_PATH = REPO_ROOT / "data" / "historical_layers.registry.json"

REQUIRED_FIELDS = {
    "id",
    "name",
    "description",
    "type",
    "status",
    "sourceName",
    "attribution",
    "historicalQuestion",
    "layerGroup",
}


def load_registry(path: Path = REGISTRY_PATH) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
      payload = json.load(handle)
    layers = payload.get("layers", [])
    if not isinstance(layers, list):
        raise ValueError("Historical layer registry must contain a layers list.")
    for layer in layers:
        validate_layer(layer)
    return layers


def validate_layer(layer: dict[str, Any]) -> None:
    missing = sorted(REQUIRED_FIELDS - set(layer))
    if missing:
        raise ValueError(f"{layer.get('id', 'unknown layer')} is missing fields: {', '.join(missing)}")

    if layer["status"] in {"ready", "available"} and not (layer.get("dataPath") or layer.get("tileUrl")):
        raise ValueError(f"{layer['id']} is marked {layer['status']} but has no dataPath or tileUrl.")


def layer_by_id(layer_id: str, path: Path = REGISTRY_PATH) -> dict[str, Any]:
    for layer in load_registry(path):
        if layer["id"] == layer_id:
            return layer
    raise KeyError(f"No historical layer registered with id {layer_id!r}.")
