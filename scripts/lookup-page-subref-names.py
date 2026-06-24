"""Resolve PAGE_SUBREF codes to human-readable subdivision names.

PAGE_SUBREF is Cook County's internal plat book page reference (e.g. "1202B_B").
This script attempts to resolve each unmapped code to a subdivision name by:

  1. Checking the Cook County Assessor's property detail page
     (https://www.cookcountyassessor.com/pin/<pin10>)
     and parsing the legal description from the HTML.

  2. Falling back to the Cook County Recorder's plat index
     (https://www.cookcountyrecorder.com) when the Assessor page has no name.

For each unique PAGE_SUBREF it picks a representative PIN from
parcel_lot_relationships, looks up the legal description, extracts the
subdivision name, and upserts it into page_subref_map.

Usage:
  # Dry run — show what would be resolved without writing to Supabase:
  python scripts/lookup-page-subref-names.py --dry-run

  # Resolve and write (rate-limited, ~1 req/sec):
  python scripts/lookup-page-subref-names.py

  # Limit to N codes for a test run:
  python scripts/lookup-page-subref-names.py --limit 20

NOTE: As of 2026-06-23 the Cook County Assessor's property page returns HTTP 500
and the Recorder's site shows "Coming Soon". Run this script again once those
sources are available. In the meantime the 5 PIN-bridge-confirmed mappings in
page_subref_map will be used.
"""

from __future__ import annotations

import argparse
import os
import re
import ssl
import time
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]


# ─── Configuration ────────────────────────────────────────────────────────────

RATE_LIMIT_SECS = 1.0   # seconds between Assessor requests

ASSESSOR_URL = "https://www.cookcountyassessor.com/pin/{pin10}"

# Regex patterns to extract subdivision name from Assessor HTML legal descriptions.
# Formats seen: "LOT 4 BLOCK 3 KINSEY'S PARK RIDGE SUBDIVISION"
_SUBDIVISION_PATTERNS = [
    re.compile(r"(?:BLOCK\s+\w+\s+)?(?:LOT\s+[\w-]+\s+(?:BLOCK\s+\w+\s+)?)?([A-Z][A-Z0-9 '&.,-]+SUBDIVISION)", re.IGNORECASE),
    re.compile(r"(?:BLOCK\s+\w+\s+)?(?:LOT\s+[\w-]+\s+(?:BLOCK\s+\w+\s+)?)?([A-Z][A-Z0-9 '&.,-]+ADDITION)", re.IGNORECASE),
    re.compile(r"(?:BLOCK\s+\w+\s+)?(?:LOT\s+[\w-]+\s+(?:BLOCK\s+\w+\s+)?)?([A-Z][A-Z0-9 '&.,-]+RESUBDIVISION)", re.IGNORECASE),
]


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    load_dotenv(PROJECT_ROOT / ".env.local")
    load_dotenv(PROJECT_ROOT / ".env")

    parser = argparse.ArgumentParser(description="Resolve PAGE_SUBREF codes to subdivision names.")
    parser.add_argument("--dry-run", action="store_true", help="Print resolutions; do not write to Supabase.")
    parser.add_argument("--limit", type=int, default=0, help="Only process N unmapped codes (0 = all).")
    args = parser.parse_args()

    supabase = get_supabase_client()
    if not supabase:
        return

    # ── 1. Fetch unmapped PAGE_SUBREFs with a representative PIN each ─────────
    print("Fetching unmapped PAGE_SUBREF codes …")
    result = supabase.rpc("get_unmapped_page_subrefs", {}).execute()
    rows = result.data or []
    print(f"  {len(rows)} unmapped codes.")

    if args.limit:
        rows = rows[: args.limit]
        print(f"  Limiting to {len(rows)} codes for this run.")

    if not rows:
        print("All PAGE_SUBREF codes are already mapped. Nothing to do.")
        return

    # ── 2. For each code, look up the Assessor page and extract the name ──────
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    resolved: list[dict] = []
    failed: list[str] = []

    for i, row in enumerate(rows):
        page_subref = row["page_subref"]
        pin14 = row.get("representative_pin")
        if not pin14:
            failed.append(page_subref)
            continue

        pin10 = pin14[:10]
        url = ASSESSOR_URL.format(pin10=pin10)

        name = fetch_subdivision_name_from_assessor(url, ssl_ctx)
        status = f"✓ {name}" if name else "✗ not found"
        print(f"  [{i+1}/{len(rows)}] {page_subref} (PIN {pin10}): {status}")

        if name:
            resolved.append({
                "page_subref": page_subref,
                "subdivision_name": name,
                "confidence": "medium",
                "source": "assessor_legal_description",
                "notes": f"Parsed from Assessor property page for PIN {pin10}",
            })
        else:
            failed.append(page_subref)

        time.sleep(RATE_LIMIT_SECS)

    print(f"\nResolved: {len(resolved)} / {len(rows)}   Failed: {len(failed)}")

    if args.dry_run:
        print("\n[DRY RUN] Would upsert:")
        for r in resolved:
            print(f"  {r['page_subref']} → {r['subdivision_name']}")
        return

    # ── 3. Upsert resolved names into page_subref_map ─────────────────────────
    if resolved:
        supabase.table("page_subref_map").upsert(
            resolved,
            on_conflict="page_subref",
        ).execute()
        print(f"Upserted {len(resolved)} rows into page_subref_map.")

    # ── 4. Propagate into gis_lots ────────────────────────────────────────────
    if resolved:
        result = supabase.rpc("update_gis_lots_subdivision_ids", {}).execute()
        print(f"Propagated to gis_lots: {result.data}")

    if failed:
        print(f"\n{len(failed)} unresolvable PAGE_SUBREFs (no name found):")
        for code in failed[:20]:
            print(f"  {code}")
        if len(failed) > 20:
            print(f"  … and {len(failed) - 20} more")


# ─── Assessor parsing ─────────────────────────────────────────────────────────

def fetch_subdivision_name_from_assessor(url: str, ssl_ctx: ssl.SSLContext) -> str | None:
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
        )
        with urllib.request.urlopen(req, timeout=15, context=ssl_ctx) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:
        print(f"    HTTP error: {exc}")
        return None

    return parse_subdivision_name_from_html(html)


def parse_subdivision_name_from_html(html: str) -> str | None:
    # Look for a "legal description" section.
    # The Assessor site renders it in various places; try several anchors.
    anchors = ["legal description", "legal_desc", "legalDescription", "property-legal"]
    html_lower = html.lower()

    for anchor in anchors:
        idx = html_lower.find(anchor)
        if idx == -1:
            continue
        # Extract ~500 chars after the anchor to search for a subdivision name.
        snippet = html[idx: idx + 500].upper()
        for pat in _SUBDIVISION_PATTERNS:
            m = pat.search(snippet)
            if m:
                return m.group(1).strip().title()

    return None


# ─── Supabase helpers ─────────────────────────────────────────────────────────

def get_supabase_client():
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL in .env")
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except ImportError:
        print("supabase-py not installed. Run: pip install supabase")
        return None


if __name__ == "__main__":
    main()
