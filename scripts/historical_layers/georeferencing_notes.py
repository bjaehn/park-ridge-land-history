from __future__ import annotations

from pathlib import Path

DEFAULT_OUTPUT = Path("docs/georeferencing_historical_imagery.md")

NOTES = """# Georeferencing Historical Imagery

Historical aerials and map sheets should not be enabled as map layers until they are georeferenced and checked.

Recommended workflow:

1. Identify imagery frames or sheets covering Park Ridge.
2. Record source, year, frame or sheet id, license, and download date.
3. Georeference against stable road intersections, rail corridors, and section lines.
4. Save control-point notes with residual error.
5. Tile the georeferenced raster for web display.
6. Register the tile URL and attribution in `data/historical_layers.registry.json`.

ILHAP 1938/1939 imagery is especially useful for prewar development evidence, but it needs this georeferencing pass before it should be used in the app.
"""


def write_notes(output_path: Path = DEFAULT_OUTPUT) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(NOTES, encoding="utf-8")


if __name__ == "__main__":
    write_notes()
    print(f"Wrote {DEFAULT_OUTPUT}")
