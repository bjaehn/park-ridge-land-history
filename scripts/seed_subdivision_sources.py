"""
Upsert subdivision sources from data/sources/park_ridge_subdivision_sources.json
into the Supabase subdivision_sources table.

Usage:
    python scripts/seed_subdivision_sources.py

Requires SUPABASE_SERVICE_ROLE_KEY (preferred) or VITE_SUPABASE_ANON_KEY in
.env.local or .env, plus VITE_SUPABASE_URL.

Safe to re-run (idempotent via source_key).
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCES_FILE = PROJECT_ROOT / "data" / "sources" / "park_ridge_subdivision_sources.json"


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
    }


def get_existing_source(base_url: str, key: str, source_key: str) -> dict | None:
    """Return the existing row for this source_key, or None if not found."""
    endpoint = (
        f"{base_url}/rest/v1/subdivision_sources"
        f"?source_key=eq.{urllib.request.quote(source_key)}"
        f"&limit=1"
    )
    req = urllib.request.Request(endpoint, headers={**base_headers(key), "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            rows = json.loads(resp.read().decode())
            return rows[0] if rows else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        print(f"  ERROR fetching source_key={source_key}: HTTP {exc.code}: {body[:300]}")
        return None


def build_row(src: dict) -> dict:
    """Map JSON source record to DB columns."""
    return {
        "source_key": src["source_key"],
        "title": src["title"],
        "source_name": src["title"],  # NOT NULL constraint
        "source_type": src.get("source_type"),
        "author_or_publisher": src.get("author_or_publisher"),
        "publication_name": src.get("publication_name"),
        "publication_date": src.get("publication_date"),
        "source_url": src.get("url"),
        "access_notes": src.get("access_notes"),
        "reliability_tier": src.get("reliability_tier", "secondary"),
    }


def insert_source(base_url: str, key: str, row: dict) -> None:
    endpoint = f"{base_url}/rest/v1/subdivision_sources"
    payload = json.dumps(row).encode()
    headers = {
        **base_headers(key),
        "Prefer": "return=minimal",
    }
    req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        _ = resp.read()


def update_source(base_url: str, key: str, existing_id: str, row: dict) -> None:
    endpoint = (
        f"{base_url}/rest/v1/subdivision_sources"
        f"?id=eq.{urllib.request.quote(existing_id)}"
    )
    payload = json.dumps(row).encode()
    headers = {
        **base_headers(key),
        "Prefer": "return=minimal",
    }
    req = urllib.request.Request(endpoint, data=payload, headers=headers, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        _ = resp.read()


def main() -> None:
    base_url, key = load_env()

    with open(SOURCES_FILE, encoding="utf-8") as f:
        data = json.load(f)

    sources = data["sources"]
    print(f"Seeding {len(sources)} sources...")

    inserted = 0
    updated = 0

    for src in sources:
        source_key = src["source_key"]
        row = build_row(src)

        existing = get_existing_source(base_url, key, source_key)

        try:
            if existing is None:
                insert_source(base_url, key, row)
                print(f"  [INSERT] source_key: {source_key}")
                inserted += 1
            else:
                update_source(base_url, key, existing["id"], row)
                print(f"  [UPDATE] source_key: {source_key}")
                updated += 1
        except urllib.error.HTTPError as exc:
            body = exc.read().decode(errors="replace")
            print(f"  [ERROR] source_key={source_key}: HTTP {exc.code}: {body[:300]}")

    print(f"\nDone. {inserted} inserted, {updated} updated.")


if __name__ == "__main__":
    main()
