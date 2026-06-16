"""
Re-match HARGIS historic survey records to Park Ridge parcels with street-name validation.

Reads the HARGIS CSV files written by scripts/download_hargis.py, then re-matches
each record to a parcel using two sequential checks:
  1. Spatial proximity  - HARGIS map point must be within --radius-ft of a parcel centroid
  2. Street-name check  - HARGIS Location street must fuzzy-match the parcel address street

The original pipeline (build_park_ridge_dataset.py) used spatial proximity only, which
produced ~30 bad matches where the HARGIS map point was placed near the wrong parcel.
This script rejects those mismatches by validating the street name.

Usage:
  python -m scripts.rematch_hargis_to_supabase               # live run
  python -m scripts.rematch_hargis_to_supabase --dry-run     # print plan, write nothing
  python -m scripts.rematch_hargis_to_supabase --radius-ft 150

Prerequisites:
  1. Run  python -m scripts.download_hargis  first (requires ArcGIS network access)
  2. Set env vars in .env.local:
       VITE_SUPABASE_URL       - your project URL
       VITE_SUPABASE_ANON_KEY  - anon/public key (read)
       SUPABASE_SERVICE_ROLE_KEY - service-role key (needed for DELETE + INSERT)
     If SUPABASE_SERVICE_ROLE_KEY is absent, falls back to anon key (DELETE may fail).
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "raw"

DEFAULT_RADIUS_FT = 120
DEFAULT_FUZZY_THRESHOLD = 0.72
EARTH_RADIUS_FT = 20_902_231.0  # mean radius of Earth in feet

# ── street-name normalisation ─────────────────────────────────────────────────

_DIRECTIONAL_PREFIX = re.compile(
    r"^(?:north|south|east|west|n\.?|s\.?|e\.?|w\.?)\s+",
    re.IGNORECASE,
)
_DIRECTIONAL_SUFFIX = re.compile(
    r"\s+(?:north|south|east|west|n\.?|s\.?|e\.?|w\.?)$",
    re.IGNORECASE,
)
_STREET_TYPE_WORDS = {
    "avenue", "ave",
    "boulevard", "blvd",
    "circle", "cir",
    "court", "ct",
    "drive", "dr",
    "highway", "hwy",
    "lane", "ln",
    "parkway", "pkwy",
    "place", "pl",
    "road", "rd",
    "street", "st",
    "terrace", "ter",
    "trail", "trl",
    "way",
}


def normalize_street(text: str | None) -> str | None:
    """
    Reduce a full address or HARGIS Location string to just the normalised
    street name (no number, no directional, no type suffix) for comparison.

    Examples
    --------
    "255-257 N. Northwest Hwy."  ->  "northwest"
    "250 Cuttress"               ->  "cuttress"
    "722 N. Merrill"             ->  "merrill"
    "250 N CUTTRESS ST"          ->  "cuttress"
    "435 Cutriss"                ->  "cutriss"
    """
    if not text:
        return None
    s = text.strip()

    # Remove leading house number, including ranges ("255-257")
    s = re.sub(r"^\d+(?:-\d+)?\s+", "", s)
    s = s.strip().rstrip(".,;")

    # Remove directional prefix then suffix
    s = _DIRECTIONAL_PREFIX.sub("", s).strip()
    s = _DIRECTIONAL_SUFFIX.sub("", s).strip()

    # Lowercase, strip trailing period ("Hwy." -> "hwy")
    s = s.lower().rstrip(".")

    # Remove known street-type suffix (last word only)
    parts = s.rsplit(None, 1)
    if len(parts) == 2 and parts[1].rstrip(".") in _STREET_TYPE_WORDS:
        s = parts[0].strip()

    return s or None


def streets_match(hargis_location: str | None, parcel_address: str | None, threshold: float) -> bool:
    """
    Return True when the street name in hargis_location is close enough to
    the street name in parcel_address to be considered the same street.
    """
    a = normalize_street(hargis_location)
    b = normalize_street(parcel_address)
    if not a or not b:
        return False
    if a == b:
        return True
    # Substring check catches "cuttress" vs "cuttress ave" after suffix strip
    if a in b or b in a:
        return True
    return SequenceMatcher(None, a, b).ratio() >= threshold


# ── geo helpers ───────────────────────────────────────────────────────────────

def haversine_ft(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance in feet."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_FT * math.asin(math.sqrt(min(a, 1.0)))


# ── Supabase REST helpers ─────────────────────────────────────────────────────

def load_env() -> tuple[str, str]:
    load_dotenv(PROJECT_ROOT / ".env.local")
    load_dotenv(PROJECT_ROOT / ".env")

    url = os.environ.get("VITE_SUPABASE_URL", "").rstrip("/")
    if not url:
        sys.exit("ERROR: VITE_SUPABASE_URL must be set in .env.local")

    # Prefer service-role key for write operations (bypasses RLS)
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        or os.environ.get("VITE_SUPABASE_ANON_KEY", "")
    )
    if not key:
        sys.exit(
            "ERROR: SUPABASE_SERVICE_ROLE_KEY (preferred) or VITE_SUPABASE_ANON_KEY "
            "must be set in .env.local"
        )
    if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        print(
            "WARNING: SUPABASE_SERVICE_ROLE_KEY not set; using anon key.\n"
            "  DELETE may fail if RLS blocks the anon role.\n"
            "  Set SUPABASE_SERVICE_ROLE_KEY in .env.local to avoid this.\n"
        )
    return url, key


def sb_get_all(url: str, key: str, table: str, select: str) -> list[dict]:
    """Paginate through all rows of a table returning only the requested columns."""
    rows: list[dict] = []
    page_size = 1000
    offset = 0
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Prefer": "count=none",
    }
    while True:
        endpoint = (
            f"{url}/rest/v1/{table}"
            f"?select={urllib.parse.quote(select)}"
            f"&limit={page_size}&offset={offset}"
        )
        req = urllib.request.Request(endpoint, headers=headers)
        with urllib.request.urlopen(req, timeout=60) as resp:
            page: list[dict] = json.loads(resp.read().decode())
        if not page:
            break
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return rows


def sb_rpc(url: str, key: str, fn_name: str) -> list[dict]:
    """Call a Supabase RPC function and return all rows (paginated)."""
    rows: list[dict] = []
    page_size = 1000
    offset = 0
    endpoint = f"{url}/rest/v1/rpc/{fn_name}"
    while True:
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Range": f"{offset}-{offset + page_size - 1}",
            "Prefer": "count=none",
        }
        req = urllib.request.Request(endpoint, data=b"{}", headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=120) as resp:
            page = json.loads(resp.read().decode())
        if not page:
            break
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return rows


def sb_delete_all(url: str, key: str, table: str, dry_run: bool) -> None:
    """Delete every row in a table (filter on refnum to avoid PostgREST's no-filter guard)."""
    if dry_run:
        print(f"  [dry-run] would DELETE all rows from {table}")
        return
    endpoint = f"{url}/rest/v1/{table}?refnum=not.is.null"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Prefer": "return=minimal",
    }
    req = urllib.request.Request(endpoint, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"  Cleared {table} (HTTP {resp.status})")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        print(f"  DELETE HTTP {exc.code}: {body[:500]}")
        raise


def sb_insert_batch(url: str, key: str, table: str, rows: list[dict], dry_run: bool, batch_size: int = 200) -> int:
    """Insert rows in batches; returns number of rows sent."""
    endpoint = f"{url}/rest/v1/{table}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    inserted = 0
    total_batches = math.ceil(len(rows) / batch_size)
    for batch_num, i in enumerate(range(0, len(rows), batch_size), start=1):
        batch = rows[i : i + batch_size]
        if dry_run:
            print(f"  [dry-run] batch {batch_num}/{total_batches}: {len(batch)} rows")
            inserted += len(batch)
            continue
        payload = json.dumps(batch).encode()
        req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as _:
                pass
            inserted += len(batch)
            if total_batches > 1:
                print(f"  Inserted batch {batch_num}/{total_batches}")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode(errors="replace")
            print(f"  INSERT HTTP {exc.code}: {body[:500]}")
            raise
    return inserted


# ── CSV loaders ───────────────────────────────────────────────────────────────

def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


# ── media index ───────────────────────────────────────────────────────────────

def build_media_index(photos: list[dict], pdfs: list[dict]) -> dict[str, dict[str, str | None]]:
    """Return {refnum -> {photo_url, pdf_url}} with first URL for each refnum."""
    index: dict[str, dict[str, str | None]] = {}

    for photo in photos:
        refnum = str(photo.get("RefNum") or photo.get("REFNUM") or "").strip()
        url = (photo.get("Url") or photo.get("URL") or "").strip() or None
        if refnum and url and refnum not in index:
            index.setdefault(refnum, {"photo_url": None, "pdf_url": None})
            index[refnum]["photo_url"] = index[refnum]["photo_url"] or url

    for pdf in pdfs:
        refnum = str(pdf.get("REFNUM") or pdf.get("RefNum") or "").strip()
        url = (pdf.get("URL") or pdf.get("Url") or "").strip() or None
        if refnum and url:
            index.setdefault(refnum, {"photo_url": None, "pdf_url": None})
            index[refnum]["pdf_url"] = index[refnum]["pdf_url"] or url

    return index


# ── value coercion ────────────────────────────────────────────────────────────

def clean(val: object) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s if s and s.lower() not in {"none", "null", "nan", ""} else None


def first_clean(*vals: object) -> str | None:
    for v in vals:
        s = clean(v)
        if s:
            return s
    return None


def parse_int(val: object) -> int | None:
    s = clean(val)
    if not s:
        return None
    try:
        f = float(s)
        i = int(f)
        return i if f == i else None
    except (ValueError, TypeError):
        return None


def parse_date(val: object) -> str | None:
    """Parse HARGIS SurveyDate (several possible formats) to ISO date."""
    import datetime

    s = clean(val)
    if not s:
        return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y"):
        try:
            return datetime.datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    # Year-only like "1986"
    try:
        y = int(float(s))
        return f"{y}-01-01"
    except (ValueError, TypeError):
        pass
    return None


# ── matching ──────────────────────────────────────────────────────────────────

def match_records(
    hargis_rows: list[dict],
    parcels: list[dict],
    radius_ft: float,
    fuzzy_threshold: float,
) -> list[tuple[dict, dict, float]]:
    """
    For each HARGIS record return (hargis_row, best_parcel, distance_ft).
    Matching rules:
      - Spatial: parcel centroid within radius_ft of the HARGIS map point
      - Street:  normalised street names match (fuzzy ≥ fuzzy_threshold)
    The nearest passing parcel is chosen when multiple candidates exist.
    """
    results: list[tuple[dict, dict, float]] = []
    skipped = 0

    for row in hargis_rows:
        refnum = row.get("REFNUM", "?")
        location = row.get("Location") or ""

        try:
            h_lat = float(row["latitude"])
            h_lon = float(row["longitude"])
        except (KeyError, TypeError, ValueError):
            print(f"  SKIP REFNUM {refnum}: no coordinates")
            skipped += 1
            continue

        # Collect all parcels within radius, sorted nearest-first
        candidates: list[tuple[dict, float]] = []
        for parcel in parcels:
            try:
                p_lat = float(parcel["lat"])
                p_lon = float(parcel["lng"])
            except (KeyError, TypeError, ValueError):
                continue
            dist = haversine_ft(h_lat, h_lon, p_lat, p_lon)
            if dist <= radius_ft:
                candidates.append((parcel, dist))

        candidates.sort(key=lambda x: x[1])

        matched = False
        for parcel, dist in candidates:
            if streets_match(location, parcel.get("address"), fuzzy_threshold):
                results.append((row, parcel, dist))
                matched = True
                break

        if not matched:
            if candidates:
                best = candidates[0]
                print(
                    f"  SKIP REFNUM {refnum}: '{location}' — "
                    f"nearest parcel '{best[0].get('address')}' at {best[1]:.0f}ft "
                    f"failed street check"
                )
            else:
                print(f"  SKIP REFNUM {refnum}: '{location}' — no parcel within {radius_ft:.0f}ft")
            skipped += 1

    print(f"\n  Matched: {len(results)}  |  Skipped: {skipped}")
    return results


# ── record builder ────────────────────────────────────────────────────────────

def build_row(
    hargis: dict,
    parcel: dict,
    dist_ft: float,
    media: dict[str, dict],
) -> dict:
    refnum = clean(hargis.get("REFNUM"))
    media_entry = media.get(refnum or "", {"photo_url": None, "pdf_url": None})

    method = (
        f"map point (street validated, {dist_ft:.0f}ft)"
        if dist_ft > 0
        else "address (street validated)"
    )

    return {
        "pin": parcel["pin_normalized"],
        "refnum": refnum,
        "location_text": clean(hargis.get("Location")),
        "record_name": first_clean(hargis.get("SignificantName"), hargis.get("OtherName")),
        "nr_evaluation": first_clean(
            hargis.get("NREVAL"), hargis.get("NREval_1"), hargis.get("StaffEval")
        ),
        "category": clean(hargis.get("Category")),
        "arch_class": clean(hargis.get("ArchClass")),
        "current_function": clean(hargis.get("CurrentFunction")),
        "historic_function": clean(hargis.get("HistoricFunction")),
        "wall_materials": clean(hargis.get("WallMaterials")),
        "architect": clean(hargis.get("Architect")),
        "builder": clean(hargis.get("Builder")),
        "begin_year": parse_int(hargis.get("BeginYear")),
        "end_year": parse_int(hargis.get("EndYear")),
        "survey_date": parse_date(hargis.get("SurveyDate")),
        "opinion_significance": clean(hargis.get("OpinionOfSignificance")),
        "match_method": method,
        "photo_url": media_entry.get("photo_url"),
        "pdf_url": media_entry.get("pdf_url"),
        "source_id": refnum,
    }


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Re-match HARGIS survey records to parcels with street-name validation."
    )
    parser.add_argument(
        "--radius-ft", type=float, default=DEFAULT_RADIUS_FT,
        help=f"Proximity radius in feet (default {DEFAULT_RADIUS_FT})",
    )
    parser.add_argument(
        "--fuzzy-threshold", type=float, default=DEFAULT_FUZZY_THRESHOLD,
        help=f"Street-name fuzzy match threshold 0–1 (default {DEFAULT_FUZZY_THRESHOLD})",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print results without writing")
    args = parser.parse_args()

    supabase_url, supabase_key = load_env()

    # ── load HARGIS CSVs ──────────────────────────────────────────────────────
    props_path = DATA_DIR / "hargis_park_ridge_properties.csv"
    photos_path = DATA_DIR / "hargis_park_ridge_photos.csv"
    pdfs_path = DATA_DIR / "hargis_park_ridge_pdfs.csv"

    if not props_path.exists():
        sys.exit(
            f"ERROR: {props_path} not found.\n"
            "Run  python -m scripts.download_hargis  first (requires ArcGIS network access)."
        )

    print(f"Loading HARGIS CSVs from {DATA_DIR} ...")
    hargis_rows = load_csv(props_path)
    photos = load_csv(photos_path) if photos_path.exists() else []
    pdfs = load_csv(pdfs_path) if pdfs_path.exists() else []
    print(f"  {len(hargis_rows):,} properties, {len(photos):,} photos, {len(pdfs):,} PDFs")

    # ── load parcels from Supabase ────────────────────────────────────────────
    print("\nFetching parcels from Supabase ...")
    parcels = sb_rpc(supabase_url, supabase_key, "parcels_with_centroid")
    print(f"  {len(parcels):,} parcels with coordinates")

    # ── match ─────────────────────────────────────────────────────────────────
    print(
        f"\nMatching (radius={args.radius_ft}ft, fuzzy_threshold={args.fuzzy_threshold}) ..."
    )
    media_index = build_media_index(photos, pdfs)
    matches = match_records(hargis_rows, parcels, args.radius_ft, args.fuzzy_threshold)

    if not matches:
        print("No matches found. Aborting — something may be wrong with the input data.")
        sys.exit(1)

    records = [build_row(h, p, d, media_index) for h, p, d in matches]

    # ── write to Supabase ─────────────────────────────────────────────────────
    print(f"\nClearing existing historic_survey_records ...")
    sb_delete_all(supabase_url, supabase_key, "historic_survey_records", args.dry_run)

    print(f"Inserting {len(records)} validated records ...")
    inserted = sb_insert_batch(supabase_url, supabase_key, "historic_survey_records", records, args.dry_run)

    verb = "would insert" if args.dry_run else "inserted"
    print(f"\nDone. {inserted} records {verb} into historic_survey_records.")


if __name__ == "__main__":
    main()
