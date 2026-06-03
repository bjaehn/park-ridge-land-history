from __future__ import annotations

import argparse
import shutil
from pathlib import Path

SAMPLE_FILES = [
    "sample_historical_parcels_2000.geojson",
    "sample_historical_parcels_2021.geojson",
    "sample_parcel_changes_2000_2021.geojson",
]


def copy_sample_layers(output_dir: Path = Path("data/processed/historical")) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for filename in SAMPLE_FILES:
        source = Path("public/data/historical") / filename
        target = output_dir / filename
        shutil.copyfile(source, target)
        written.append(target)
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Build historical parcel layer outputs.")
    parser.add_argument("--samples-only", action="store_true", help="Copy current sample layers into processed data.")
    parser.add_argument("--output-dir", type=Path, default=Path("data/processed/historical"))
    args = parser.parse_args()

    if not args.samples_only:
        print("No real historical parcel source is configured yet; copying sample layers.")
    for path in copy_sample_layers(args.output_dir):
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
