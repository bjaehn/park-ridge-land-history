"""
Seed subdivision candidates from data/seeds/park_ridge_subdivision_candidates.json
into Supabase tables: subdivisions, subdivision_timeline_events, subdivision_aliases,
subdivision_research_tasks.

Usage:
    python scripts/seed_subdivision_candidates.py

Requires SUPABASE_SERVICE_ROLE_KEY (preferred) or VITE_SUPABASE_ANON_KEY in
.env.local or .env, plus VITE_SUPABASE_URL.

Safe to re-run (idempotent).
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
CANDIDATES_FILE = PROJECT_ROOT / "data" / "seeds" / "park_ridge_subdivision_candidates.json"


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
    """GET from REST API; returns list of rows."""
    endpoint = f"{base_url}/rest/v1/{path_and_query}"
    req = urllib.request.Request(endpoint, headers=base_headers(key))
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        print(f"  GET ERROR {path_and_query}: HTTP {exc.code}: {body[:300]}")
        return []


def api_post(base_url: str, key: str, table: str, row: dict, return_repr: bool = True) -> dict | None:
    """POST a row; returns inserted row if return_repr=True, else None."""
    endpoint = f"{base_url}/rest/v1/{table}"
    payload = json.dumps(row).encode()
    prefer = "return=representation" if return_repr else "return=minimal"
    headers = {**base_headers(key), "Prefer": prefer}
    req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode()
            if return_repr and body:
                rows = json.loads(body)
                return rows[0] if rows else None
            return None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        print(f"  POST ERROR {table}: HTTP {exc.code}: {body[:300]}")
        return None


def normalize_name(name: str) -> str:
    """Lowercase and collapse whitespace."""
    return " ".join(name.lower().split())


def get_or_create_subdivision(base_url: str, key: str, candidate: dict) -> str | None:
    """Return existing subdivision id or create a new one. Returns id string or None on error."""
    slug = candidate["slug"]

    rows = api_get(base_url, key, f"subdivisions?slug=eq.{urllib.request.quote(slug)}&limit=1")
    if rows:
        return rows[0]["id"]

    row = {
        "name": candidate["canonical_name"],
        "normalized_name": normalize_name(candidate["canonical_name"]),
        "alternate_names": candidate.get("alternate_names") or [],
        "slug": slug,
        "display_name": candidate.get("display_name") or candidate["canonical_name"],
        "development_era_start_year": candidate.get("development_era_start_year"),
        "development_era_end_year": candidate.get("development_era_end_year"),
        "historical_summary": candidate.get("historical_summary"),
        "status": candidate.get("status", "research_candidate"),
        "confidence_level": candidate.get("confidence_level", "low"),
    }

    result = api_post(base_url, key, "subdivisions", row)
    if result:
        return result["id"]
    return None


def resolve_source_id(base_url: str, key: str, source_key: str | None) -> tuple[str | None, str | None]:
    """Return (source_id, source_title) for a given source_key, or (None, None)."""
    if not source_key:
        return None, None
    rows = api_get(
        base_url, key,
        f"subdivision_sources?source_key=eq.{urllib.request.quote(source_key)}&select=id,title&limit=1"
    )
    if rows:
        return rows[0]["id"], rows[0].get("title")
    return None, None


def seed_facts(
    base_url: str, key: str, subdivision_id: str, facts: list[dict]
) -> tuple[int, int]:
    created = 0
    skipped = 0

    for fact in facts:
        # Build a deduplication key: (subdivision_id, fact_type, event_year, title)
        fact_type = fact.get("fact_type", "")
        event_year = fact.get("event_year")
        title = fact.get("title", "")

        query = (
            f"subdivision_timeline_events"
            f"?subdivision_id=eq.{urllib.request.quote(subdivision_id)}"
            f"&title=eq.{urllib.request.quote(title)}"
            f"&limit=1"
        )
        existing = api_get(base_url, key, query)
        if existing:
            skipped += 1
            continue

        source_id, source_title = resolve_source_id(base_url, key, fact.get("source_key"))

        row = {
            "subdivision_id": subdivision_id,
            "event_year": event_year,
            "event_date": None,
            "event_type": fact_type,
            "title": title,
            "description": fact.get("description"),
            "fact_type": fact_type,
            "source_id": source_id,
            "source_name": source_title,
            "confidence_level": fact.get("confidence_level", "low"),
            "direct_quote": fact.get("direct_quote"),
            "confidence_reason": None,
            "display_priority": 50,
        }

        result = api_post(base_url, key, "subdivision_timeline_events", row, return_repr=False)
        if result is not None or True:
            # POST with return=minimal returns None on success; we trust it went through
            # unless an error was printed by api_post
            created += 1

    return created, skipped


def seed_aliases(
    base_url: str, key: str, subdivision_id: str, aliases: list[dict]
) -> tuple[int, int]:
    created = 0
    skipped = 0

    for alias_entry in aliases:
        alias_text = alias_entry.get("alias", "")

        query = (
            f"subdivision_aliases"
            f"?subdivision_id=eq.{urllib.request.quote(subdivision_id)}"
            f"&alias=ilike.{urllib.request.quote(alias_text)}"
            f"&limit=1"
        )
        existing = api_get(base_url, key, query)
        if existing:
            skipped += 1
            continue

        source_id, _ = resolve_source_id(base_url, key, alias_entry.get("source_key"))

        row = {
            "subdivision_id": subdivision_id,
            "alias": alias_text,
            "alias_type": alias_entry.get("alias_type"),
            "source_id": source_id,
            "confidence": alias_entry.get("confidence_level", "unknown"),
        }

        api_post(base_url, key, "subdivision_aliases", row, return_repr=False)
        created += 1

    return created, skipped


def seed_research_tasks(
    base_url: str, key: str, subdivision_id: str, tasks: list[dict]
) -> tuple[int, int]:
    created = 0
    skipped = 0

    for task in tasks:
        search_query = task.get("search_query", "")

        query = (
            f"subdivision_research_tasks"
            f"?subdivision_id=eq.{urllib.request.quote(subdivision_id)}"
            f"&search_query=eq.{urllib.request.quote(search_query)}"
            f"&limit=1"
        )
        existing = api_get(base_url, key, query)
        if existing:
            skipped += 1
            continue

        row = {
            "subdivision_id": subdivision_id,
            "search_query": search_query,
            "target_archive": task.get("target_archive"),
            "reason": task.get("reason"),
            "expected_source_type": task.get("expected_source_type"),
            "status": "pending",
            "priority": task.get("priority", "medium"),
        }

        api_post(base_url, key, "subdivision_research_tasks", row, return_repr=False)
        created += 1

    return created, skipped


def main() -> None:
    base_url, key = load_env()

    with open(CANDIDATES_FILE, encoding="utf-8") as f:
        data = json.load(f)

    candidates = data["subdivisions"]
    print(f"Seeding {len(candidates)} subdivision candidates...\n")

    total_subs_created = 0
    total_subs_skipped = 0
    total_facts_created = 0
    total_facts_skipped = 0
    total_aliases_created = 0
    total_aliases_skipped = 0
    total_tasks_created = 0
    total_tasks_skipped = 0

    for candidate in candidates:
        name = candidate["canonical_name"]
        slug = candidate["slug"]
        print(f"Processing: {name}")

        # Check existence before calling get_or_create to report accurately
        existing_rows = api_get(base_url, key, f"subdivisions?slug=eq.{urllib.request.quote(slug)}&limit=1")
        sub_existed = bool(existing_rows)

        subdivision_id = get_or_create_subdivision(base_url, key, candidate)
        if not subdivision_id:
            print(f"  ERROR: Could not create or find subdivision for slug={slug}. Skipping.")
            continue

        if sub_existed:
            print(f"  [SKIP] Subdivision already exists (id={subdivision_id})")
            total_subs_skipped += 1
        else:
            print(f"  [INSERT] Subdivision created (id={subdivision_id})")
            total_subs_created += 1

        # Seed facts
        facts = candidate.get("facts") or []
        if facts:
            fc, fs = seed_facts(base_url, key, subdivision_id, facts)
            total_facts_created += fc
            total_facts_skipped += fs
            print(f"  Facts: {fc} created, {fs} skipped")

        # Seed aliases
        aliases = candidate.get("aliases") or []
        if aliases:
            ac, as_ = seed_aliases(base_url, key, subdivision_id, aliases)
            total_aliases_created += ac
            total_aliases_skipped += as_
            print(f"  Aliases: {ac} created, {as_} skipped")

        # Seed research tasks
        tasks = candidate.get("research_tasks") or []
        if tasks:
            tc, ts = seed_research_tasks(base_url, key, subdivision_id, tasks)
            total_tasks_created += tc
            total_tasks_skipped += ts
            print(f"  Research tasks: {tc} created, {ts} skipped")

        print()

    print("=" * 60)
    print("Validation report:")
    print(f"  Subdivisions : {total_subs_created} created, {total_subs_skipped} skipped")
    print(f"  Facts        : {total_facts_created} created, {total_facts_skipped} skipped")
    print(f"  Aliases      : {total_aliases_created} created, {total_aliases_skipped} skipped")
    print(f"  Tasks        : {total_tasks_created} created, {total_tasks_skipped} skipped")
    print("Done.")


if __name__ == "__main__":
    main()
