from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from scripts.historical_layers.registry import load_registry

DEFAULT_OUTPUT = Path("public/data/historical/layer_manifest.json")


def build_manifest(output_path: Path = DEFAULT_OUTPUT) -> dict[str, object]:
    manifest = {
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "layers": load_registry(),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the public historical layer manifest.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    manifest = build_manifest(args.output)
    print(f"Wrote {len(manifest['layers'])} historical layers to {args.output}")


if __name__ == "__main__":
    main()
