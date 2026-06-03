from __future__ import annotations

import argparse
from pathlib import Path

from scripts.historical_layers.registry import load_registry

RAW_DIR = Path("data/raw/historical")
DEFAULT_OUTPUT = Path("docs/historical_layer_inventory.md")


def inspect_sources(output_path: Path = DEFAULT_OUTPUT) -> str:
    lines = [
        "# Historical Layer Inventory",
        "",
        "This inventory is generated from the registry and local raw files.",
        "",
        "| Layer | Status | Raw file | Notes |",
        "| --- | --- | --- | --- |",
    ]
    for layer in load_registry():
        raw_matches = sorted(RAW_DIR.glob(f"{layer['id']}.*"))
        raw_label = raw_matches[0].as_posix() if raw_matches else "not present"
        notes = str(layer.get("notes", ""))
        lines.append(f"| {layer['name']} | {layer['status']} | {raw_label} | {notes} |")

    content = "\n".join(lines) + "\n"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")
    return content


def main() -> None:
    parser = argparse.ArgumentParser(description="Write a registry-based historical source inventory.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    inspect_sources(args.output)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
