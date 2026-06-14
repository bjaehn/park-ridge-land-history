"""Script 05: Load subdivision records into Supabase.

Reads:
  data/interim/subdivisions/subdivision_records.json     (from script 04)
  data/interim/subdivisions/parcel_subdivision_links.json (from script 04)

Loads to Supabase:
  subdivisions table           – one row per unique subdivision
  property_subdivision_links   – one row per parcel-to-subdivision match

Also updates:
  parcels.subdivision_name, parcels.subdivision_id, parcels.subdivision_confidence,
  parcels.subdivision_match_method

Idempotent: uses upsert with conflict handling so it can be run repeatedly.

Usage:
  python -m scripts.data.subdivisions.05_load_to_supabase
  python -m scripts.data.subdivisions.05_load_to_supabase --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from scripts.data_sources import PROJECT_ROOT

INTERIM_DIR = PROJECT_ROOT / "data/interim/subdivisions"
RECORDS_PATH = INTERIM_DIR / "subdivision_records.json"
LINKS_PATH = INTERIM_DIR / "parcel_subdivision_links.json"

BATCH_SIZE = 100


def main() -> None:
    parser = argparse.ArgumentParser(description="Load subdivision data into Supabase.")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without loading data.")
    args = parser.parse_args()

    load_dotenv(PROJECT_ROOT / ".env")

    supabase_url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: Supabase credentials not found.")
        print("Set SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) and VITE_SUPABASE_URL in .env")
        return

    if not RECORDS_PATH.exists():
        print(f"Subdivision records not found at {RECORDS_PATH.relative_to(PROJECT_ROOT)}.")
        print("Run script 04 first.")
        return

    if not LINKS_PATH.exists():
        print(f"Parcel links not found at {LINKS_PATH.relative_to(PROJECT_ROOT)}.")
        print("Run script 04 first.")
        return

    with RECORDS_PATH.open(encoding="utf-8") as f:
        records: list[dict[str, Any]] = json.load(f)

    with LINKS_PATH.open(encoding="utf-8") as f:
        links: list[dict[str, Any]] = json.load(f)

    print(f"=== Loading {len(records)} subdivision records and {len(links)} parcel links ===\n")

    if args.dry_run:
        print("[DRY RUN] Would load the following data:")
        print(f"  {len(records)} rows into subdivisions table")
        print(f"  {len(links)} rows into property_subdivision_links table")
        if records:
            print(f"\nSample subdivision record: {json.dumps(records[0], indent=2)}")
        if links:
            print(f"\nSample parcel link: {json.dumps(links[0], indent=2)}")
        return

    # Import supabase client (requires supabase-py or httpx)
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(supabase_url, supabase_key)
    except ImportError:
        print("supabase-py not installed. Install with: pip install supabase")
        print("Or use the REST API directly.")
        return

    # Load subdivisions
    load_count = 0
    error_count = 0
    print(f"Loading {len(records)} subdivisions...")
    for batch in batched(records, BATCH_SIZE):
        try:
            supabase.table("subdivisions").upsert(
                batch,
                on_conflict="id",
            ).execute()
            load_count += len(batch)
        except Exception as error:
            print(f"  ERROR loading batch: {error}")
            error_count += len(batch)
        time.sleep(0.05)

    print(f"  Loaded {load_count} subdivisions, {error_count} errors.")

    # Load property_subdivision_links
    link_count = 0
    link_error_count = 0
    print(f"\nLoading {len(links)} parcel-subdivision links...")
    for batch in batched(links, BATCH_SIZE):
        try:
            supabase.table("property_subdivision_links").upsert(
                batch,
                on_conflict="pin,subdivision_id",
            ).execute()
            link_count += len(batch)
        except Exception as error:
            print(f"  ERROR loading link batch: {error}")
            link_error_count += len(batch)
        time.sleep(0.05)

    print(f"  Loaded {link_count} links, {link_error_count} errors.")

    # Update parcels table with denormalized subdivision name
    print("\nUpdating parcels with denormalized subdivision data...")
    update_count = 0
    for link in links:
        pin = link.get("pin")
        if not pin:
            continue
        update_payload = {
            "subdivision_id": link.get("subdivision_id"),
            "subdivision_name": None,  # Will be set by joining to subdivisions below
            "subdivision_lot": link.get("lot_number"),
            "subdivision_block": link.get("block_number"),
            "subdivision_match_method": link.get("match_method"),
            "subdivision_confidence": link.get("confidence_level"),
            "subdivision_source": link.get("source_name"),
        }
        # Remove None values to avoid overwriting with nulls
        update_payload = {k: v for k, v in update_payload.items() if v is not None}
        if not update_payload:
            continue
        try:
            supabase.table("parcels").update(update_payload).eq("pin_normalized", pin).execute()
            update_count += 1
        except Exception as error:
            print(f"  ERROR updating parcel {pin}: {error}")

        if update_count % 100 == 0:
            print(f"  Updated {update_count} parcels...")
        time.sleep(0.01)

    print(f"  Updated {update_count} parcel records.")
    print("\nDone. Run script 06 to generate QA report.")


def batched(items: list[Any], size: int):
    for i in range(0, len(items), size):
        yield items[i: i + size]


if __name__ == "__main__":
    main()
