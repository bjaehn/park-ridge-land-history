from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from scripts.pipeline_utils import normalize_pin


def normalize_pin_file(input_path: Path, output_path: Path, pin_column: str) -> None:
    frame = pd.read_csv(input_path, dtype={pin_column: "string"})
    normalized = frame[pin_column].map(normalize_pin).apply(pd.Series)
    result = pd.concat([frame, normalized], axis=1)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(output_path, index=False)
    print(f"Wrote normalized PINs to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize Cook County PIN values in a CSV file.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--pin-column", required=True)
    args = parser.parse_args()
    normalize_pin_file(args.input, args.output, args.pin_column)


if __name__ == "__main__":
    main()
