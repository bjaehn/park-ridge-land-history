"""Script 02: Download subdivision IDs for Park Ridge parcels from Cook County Assessor Socrata.

Cook County GIS FeatureServer has no subdivision fields (confirmed by script 01).
The Cook County Assessor Parcel Universe (nj4t-kc8j) has:
  misc_subdivision_id       — text, internal Assessor neighborhood/grid code (e.g. '0915F_F')
  misc_subdivision_data_year — number, the tax year that assignment applies to

IMPORTANT: misc_subdivision_id is a Cook County internal assessment area code (not a legal
plat name). Format: <township><section><grid> e.g. '0915F_F' = Maine Twp, section 15, grid F_F.
Parcels sharing a code were assessed together and likely share a common plat origin.

The dataset has one row per PIN per tax year. This script deduplicates to the most recent
year with a non-null subdivision_id per PIN.

Querying by municipality name causes a full table scan and times out. We query by PIN
chunks instead, using our existing parcel_universe.csv as the PIN source.

Outputs:
  data/interim/subdivisions/socrata_parcel_subdivision_ids.json
  data/interim/subdivisions/download_report.json

Usage:
  python -m scripts.data.subdivisions.02_download_cook_gis_parcels_subdivisions
  python -m scripts.data.subdivisions.02_download_cook_gis_parcels_subdivisions --sample
  python -m scripts.data.subdivisions.02_download_cook_gis_parcels_subdivisions --force
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from scripts.data_sources import PROJECT_ROOT

SOCRATA_UNIVERSE = "https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json"
MUNICIPALITY_VALUE = "CITY OF PARK RIDGE"

INTERIM_DIR = PROJECT_ROOT / "data/interim/subdivisions"
RAW_DIR = PROJECT_ROOT / "data/raw"

FIELDS = ["pin", "misc_subdivision_id", "misc_subdivision_data_year"]
CHUNK_SIZE = 100  # PINs per Socrata IN-clause request


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download subdivision IDs for Park Ridge parcels from Socrata."
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Fetch data for the first 10 PINs and print results; do not write output files.",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite existing output.")
    args = parser.parse_args()

    load_dotenv(PROJECT_ROOT / ".env")
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)

    output_path = INTERIM_DIR / "socrata_parcel_subdivision_ids.json"
    report_path = INTERIM_DIR / "download_report.json"

    if not args.sample and output_path.exists() and not args.force:
        print(f"Skip existing {output_path.relative_to(PROJECT_ROOT)}; pass --force to overwrite.")
        return

    pins = load_park_ridge_pins()
    print(f"Loaded {len(pins)} Park Ridge PINs from parcel_universe.csv.")

    if args.sample:
        sample_pins = pins[:10]
        print(f"\n--- SAMPLE MODE: fetching data for {len(sample_pins)} PINs ---")
        rows = fetch_pins_chunk(sample_pins)
        print(f"Raw rows returned: {len(rows)}")
        deduped = deduplicate_by_pin(rows)
        print(f"After deduplication (most recent year per PIN): {len(deduped)} records\n")
        for pin, rec in sorted(deduped.items()):
            sub_id = rec.get("misc_subdivision_id", "<none>")
            sub_year = rec.get("misc_subdivision_data_year", "<none>")
            print(f"  pin={pin}  subdivision_id={sub_id!r}  year={sub_year}")
        print()
        print("Note: misc_subdivision_id is an internal Cook County Assessor area code,")
        print("not a legal plat name. Format: <township><section><grid> e.g. '0915F_F'.")
        return

    all_rows = fetch_all_pins(pins)
    deduped = deduplicate_by_pin(all_rows)

    with_value = {pin: rec for pin, rec in deduped.items() if rec.get("misc_subdivision_id")}
    unique_ids = sorted(set(rec["misc_subdivision_id"] for rec in with_value.values()))

    pct = round(len(with_value) / max(len(pins), 1) * 100, 1)
    print(f"\n{len(with_value)} of {len(pins)} PINs ({pct}%) have a misc_subdivision_id.")
    print(f"{len(unique_ids)} unique subdivision ID codes found.")

    print(f"\n--- Unique misc_subdivision_id values (up to 40) ---")
    for val in unique_ids[:40]:
        count = sum(1 for rec in with_value.values() if rec.get("misc_subdivision_id") == val)
        print(f"  {val!r:20s}  ({count} parcels)")
    if len(unique_ids) > 40:
        print(f"  ... and {len(unique_ids) - 40} more")

    output = list(deduped.values())
    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"\nWrote {output_path.relative_to(PROJECT_ROOT)} ({len(output)} records)")

    report: dict[str, Any] = {
        "source": SOCRATA_UNIVERSE,
        "municipality": MUNICIPALITY_VALUE,
        "query_method": "pin_chunks",
        "chunk_size": CHUNK_SIZE,
        "total_pins_queried": len(pins),
        "total_raw_rows": len(all_rows),
        "pins_with_subdivision_id": len(with_value),
        "pins_without_subdivision_id": len(deduped) - len(with_value),
        "unique_subdivision_ids": len(unique_ids),
        "sample_subdivision_ids": unique_ids[:50],
        "note": (
            "misc_subdivision_id is an internal Cook County Assessor area code "
            "(format: <township><section><grid>, e.g. '0915F_F'), not a legal plat name."
        ),
        "status": "complete",
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {report_path.relative_to(PROJECT_ROOT)}")
    print("\nNEXT STEP: Run 03_extract_subdivision_candidates.py")


def load_park_ridge_pins() -> list[str]:
    universe_path = RAW_DIR / "parcel_universe.csv"
    if not universe_path.exists():
        raise FileNotFoundError(
            f"parcel_universe.csv not found at {universe_path}. "
            "Run the main pipeline download first."
        )
    pins = []
    with universe_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            muni = row.get("cook_municipality_name", "").strip().upper()
            if MUNICIPALITY_VALUE in muni or "PARK RIDGE" in muni:
                pin = row.get("pin", "").strip()
                if pin:
                    pins.append(pin)
    return sorted(set(pins))


def fetch_pins_chunk(pins: list[str]) -> list[dict[str, Any]]:
    pin_list = ",".join(f"'{p}'" for p in pins)
    params = {
        "$select": ",".join(FIELDS),
        "$where": f"pin in ({pin_list})",
        "$limit": str(len(pins) * 20),  # up to 20 tax years per PIN
    }
    safe_chars = "',()="
    url = f"{SOCRATA_UNIVERSE}?{urllib.parse.urlencode(params, safe=safe_chars)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_all_pins(pins: list[str]) -> list[dict[str, Any]]:
    all_rows: list[dict[str, Any]] = []
    total_chunks = math.ceil(len(pins) / CHUNK_SIZE)
    for i, chunk in enumerate(chunks(pins, CHUNK_SIZE), start=1):
        rows = fetch_pins_chunk(chunk)
        all_rows.extend(rows)
        print(f"  chunk {i}/{total_chunks}: {len(all_rows)} rows total")
        time.sleep(0.1)
    return all_rows


def deduplicate_by_pin(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Keep the most recent row with a non-null misc_subdivision_id per PIN.
    Falls back to the most recent row overall if no row has a subdivision_id.
    """
    by_pin: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        pin = row.get("pin", "")
        by_pin.setdefault(pin, []).append(row)

    result: dict[str, dict[str, Any]] = {}
    for pin, pin_rows in by_pin.items():
        with_id = [r for r in pin_rows if r.get("misc_subdivision_id")]
        candidates = with_id if with_id else pin_rows
        best = max(candidates, key=lambda r: int(r.get("misc_subdivision_data_year") or 0))
        result[pin] = best
    return result


def chunks(values: list[str], size: int):
    for i in range(0, len(values), size):
        yield values[i: i + size]


if __name__ == "__main__":
    main()
