"""
Generate subdivision polygon geometries by dissolving matched parcel geometries.

Prerequisites:
  - The generate_subdivision_polygon RPC function must exist in Supabase.
    Apply supabase/migrations/20260616130000_subdivision_polygon_rpc.sql first.
  - Parcels must have geometry loaded (via import_to_supabase.py).
  - Property_subdivision_links must be populated.

Usage:
    python scripts/generate_subdivision_polygons.py [--dry-run] [--slug SLUG]

Options:
  --dry-run     Show what would happen without calling the RPC.
  --slug SLUG   Process only the subdivision with this slug.

Requires SUPABASE_SERVICE_ROLE_KEY (preferred) or VITE_SUPABASE_ANON_KEY in
.env.local or .env, plus VITE_SUPABASE_URL.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Minimum parcel matches required to attempt polygon generation.
MIN_PARCELS_FOR_POLYGON = 3


def load_env() -> tuple[str, str]:
    load_dotenv(PROJECT_ROOT / ".env.local")
    load_dotenv(PROJECT_ROOT / ".env")
    url = os.environ.get("VITE_SUPABASE_URL", "").rstrip("/")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("VITE_SUPABASE_ANON_KEY", "")
    )
    if not url or not key:
        sys.exit(
            "ERROR: VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or "
            "VITE_SUPABASE_ANON_KEY must be set in .env.local"
        )
    return url, key


def base_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def api_get(base_url: str, key: str, path_and_query: str) -> list[dict]:
    endpoint = f"{base_url}/rest/v1/{path_and_query}"
    req = urllib.request.Request(endpoint, headers=base_headers(key))
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        print(f"  GET ERROR {path_and_query}: HTTP {exc.code}: {body[:300]}")
        return []


def call_rpc(base_url: str, key: str, fn_name: str, params: dict) -> dict | None:
    endpoint = f"{base_url}/rest/v1/rpc/{fn_name}"
    payload = json.dumps(params).encode()
    req = urllib.request.Request(
        endpoint, data=payload, headers=base_headers(key), method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode()
            if body:
                return json.loads(body)
            return {"success": True}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        print(f"  RPC ERROR {fn_name}: HTTP {exc.code}: {body[:400]}")
        return None


def fetch_all_subdivisions(base_url: str, key: str, slug_filter: str | None) -> list[dict]:
    """Fetch all subdivisions (or just one if slug_filter is set)."""
    query = "subdivisions?select=id,name,normalized_name,slug,alternate_names"
    if slug_filter:
        query += f"&slug=eq.{urllib.request.quote(slug_filter)}"
    return api_get(base_url, key, query)


def find_pins_by_subdivision_name(
    base_url: str, key: str, subdivision: dict
) -> list[str]:
    """
    Search parcels table for subdivision_name matches (canonical + alternates),
    and also check property_subdivision_links.
    Returns a deduplicated list of matched PINs.
    """
    names_to_try: list[str] = [subdivision["name"]]
    alternates = subdivision.get("alternate_names") or []
    if isinstance(alternates, list):
        names_to_try.extend(alternates)

    matched_pins: set[str] = set()

    # 1. Search parcels.subdivision_name column
    for name in names_to_try:
        encoded = urllib.request.quote(name)
        rows = api_get(
            base_url, key,
            f"parcels?subdivision_name=ilike.{encoded}&select=pin_normalized&limit=1000"
        )
        for row in rows:
            pin = row.get("pin_normalized")
            if pin:
                matched_pins.add(pin)

    # 2. Also check property_subdivision_links
    rows = api_get(
        base_url, key,
        f"property_subdivision_links?subdivision_id=eq.{urllib.request.quote(subdivision['id'])}"
        f"&select=pin&limit=1000"
    )
    for row in rows:
        pin = row.get("pin")
        if pin:
            matched_pins.add(pin)

    return sorted(matched_pins)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate subdivision polygon geometries.")
    parser.add_argument("--dry-run", action="store_true", help="Preview without calling RPC")
    parser.add_argument("--slug", type=str, default=None, help="Only process this subdivision slug")
    args = parser.parse_args()

    base_url, key = load_env()

    subdivisions = fetch_all_subdivisions(base_url, key, args.slug)
    if not subdivisions:
        print("No subdivisions found.")
        sys.exit(0)

    print(f"Processing {len(subdivisions)} subdivision(s)...\n")

    polygons_created = 0
    polygons_updated = 0
    polygons_skipped: list[dict] = []
    errors: list[dict] = []

    for sub in subdivisions:
        name = sub.get("name", "")
        slug = sub.get("slug", "")
        sub_id = sub["id"]

        print(f"  {name} (slug={slug})")

        # Find matched PINs
        pins = find_pins_by_subdivision_name(base_url, key, sub)

        if not pins:
            reason = "No parcel matches found by subdivision name or links"
            print(f"    SKIP: {reason}")
            polygons_skipped.append({"name": name, "reason": reason})
            continue

        print(f"    Matched {len(pins)} PIN(s)")

        if len(pins) < MIN_PARCELS_FOR_POLYGON:
            reason = (
                f"Only {len(pins)} parcel(s) matched; minimum {MIN_PARCELS_FOR_POLYGON} "
                "required for polygon generation. Marking as low-confidence research candidate."
            )
            print(f"    SKIP: {reason}")
            polygons_skipped.append({"name": name, "reason": reason, "pin_count": len(pins)})
            continue

        if args.dry_run:
            print(f"    [dry-run] Would call generate_subdivision_polygon with {len(pins)} PINs")
            continue

        result = call_rpc(
            base_url, key,
            "generate_subdivision_polygon",
            {"p_subdivision_id": sub_id, "p_pin_array": pins},
        )

        if result is None:
            errors.append({"name": name, "error": "RPC returned None (see error above)"})
        elif not result.get("success"):
            err_msg = result.get("error", "Unknown error")
            print(f"    ERROR: {err_msg}")
            errors.append({"name": name, "error": err_msg})
        else:
            action = result.get("action", "unknown")
            parcel_count = result.get("parcel_count", 0)
            print(f"    OK: {action} (used {parcel_count} parcel geometries)")
            if action == "inserted":
                polygons_created += 1
            else:
                polygons_updated += 1

        print()

    print("=" * 60)
    print("Polygon generation report:")
    if not args.dry_run:
        print(f"  Created : {polygons_created}")
        print(f"  Updated : {polygons_updated}")
    print(f"  Skipped : {len(polygons_skipped)}")
    for s in polygons_skipped:
        pin_info = f" ({s.get('pin_count', 0)} PIN(s) found)" if "pin_count" in s else ""
        print(f"    - {s['name']}{pin_info}: {s['reason']}")
    print(f"  Errors  : {len(errors)}")
    for e in errors:
        print(f"    - {e['name']}: {e['error']}")
    print("Done.")


if __name__ == "__main__":
    main()
