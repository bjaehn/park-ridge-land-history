from __future__ import annotations

import argparse
import urllib.request
from pathlib import Path

from scripts.historical_layers.registry import load_registry

RAW_DIR = Path("data/raw/historical")
MANUAL_STATUSES = {"manual_research_required", "future", "needs_georeferencing"}


def download_layer(layer: dict[str, object], force: bool = False) -> str:
    layer_id = str(layer["id"])
    source_url = layer.get("sourceUrl")
    status = str(layer["status"])

    if status in MANUAL_STATUSES or not source_url:
        return f"Skipped {layer_id}: {status} requires manual source work."

    output_path = RAW_DIR / f"{layer_id}.download"
    if output_path.exists() and not force:
        return f"Skipped {layer_id}: raw file already exists."

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(str(source_url), timeout=30) as response:
        output_path.write_bytes(response.read())
    return f"Downloaded {layer_id} to {output_path}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Download registered historical sources when a direct URL is available.")
    parser.add_argument("--layer-id")
    parser.add_argument("--all", action="store_true", help="Attempt every downloadable registered layer.")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    layers = load_registry()
    if args.layer_id:
        layers = [layer for layer in layers if layer["id"] == args.layer_id]
    elif not args.all:
        raise SystemExit("Pass --layer-id LAYER_ID or --all.")

    for layer in layers:
        print(download_layer(layer, force=args.force))


if __name__ == "__main__":
    main()
