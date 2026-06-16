"""
Land lineage dataset tests.

Verifies that the starter deed-description dataset loaded correctly into
Supabase. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.

Run:
    python -m pytest tests/test_land_lineage.py -v
"""

import os
import json
import urllib.request
import pytest

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def _get(path: str, params: str = "") -> list:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if params:
        url += f"?{params}"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def _rpc(fn: str, body: dict | None = None) -> object:
    url = f"{SUPABASE_URL}/rest/v1/rpc/{fn}"
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(url, data=data, headers=_headers(), method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


# ─── Skip if no credentials ────────────────────────────────────────────────

needs_creds = pytest.mark.skipif(
    not SUPABASE_URL or not SUPABASE_KEY,
    reason="SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set",
)


# ─── Subdivision entities ──────────────────────────────────────────────────

@needs_creds
def test_six_subdivision_entities_exist():
    expected_names = {
        "Kinsey's Park Ridge Subdivision",
        "Arthur Dunas Subdivision",
        "Park Ridge Manor",
        "Shannon and Canfields Subdivision",
        "H. Roy Berry Co's Devon Avenue Highlands",
        "John Battcher Estate",
    }
    rows = _get("subdivisions", "select=name")
    names = {r["name"] for r in rows}
    missing = expected_names - names
    assert not missing, f"Missing subdivisions: {missing}"


@needs_creds
def test_entity_types_correct():
    rows = _get("subdivisions", "select=name,entity_type&name=in.(\"Park Ridge Manor\",\"John Battcher Estate\")")
    by_name = {r["name"]: r["entity_type"] for r in rows}
    assert by_name.get("Park Ridge Manor") == "parent_plat"
    assert by_name.get("John Battcher Estate") == "estate"


@needs_creds
def test_parent_relationships():
    # Arthur Dunas → Park Ridge Manor
    rows = _get(
        "subdivisions",
        "select=name,parent_sub:parent_subdivision_id(name)&name=eq.Arthur Dunas Subdivision",
    )
    assert rows, "Arthur Dunas Subdivision not found"
    parent = (rows[0].get("parent_sub") or {}).get("name")
    assert parent == "Park Ridge Manor", f"Expected Park Ridge Manor, got {parent}"

    # H. Roy Berry → John Battcher Estate
    rows = _get(
        "subdivisions",
        "select=name,parent_sub:parent_subdivision_id(name)&name=eq.H. Roy Berry Co's Devon Avenue Highlands",
    )
    assert rows, "H. Roy Berry subdivision not found"
    parent = (rows[0].get("parent_sub") or {}).get("name")
    assert parent == "John Battcher Estate", f"Expected John Battcher Estate, got {parent}"


# ─── property_subdivision_links ────────────────────────────────────────────

@needs_creds
def test_ten_property_links_exist():
    rows = _get("property_subdivision_links", "select=pin")
    assert len(rows) == 10, f"Expected 10 links, found {len(rows)}"


@needs_creds
def test_no_null_pins_in_links():
    rows = _get("property_subdivision_links", "select=pin&pin=is.null")
    assert not rows, f"Found links with null PIN: {rows}"


@needs_creds
def test_701_peterson_link():
    rows = _get(
        "property_subdivision_links",
        "select=pin,lot_number,block_number,confidence_level&pin=eq.12-02-402-014-0000",
    )
    assert rows, "701 Peterson Ave link missing"
    r = rows[0]
    assert r["lot_number"] == "1"
    assert r["block_number"] == "16"
    assert r["confidence_level"] == "high"


@needs_creds
def test_kinsey_has_five_properties():
    rows = _get(
        "property_subdivision_links",
        "select=pin&subdivisions=normalized_name.eq.kinseys_park_ridge_subdivision",
    )
    # Join via subdivision_id lookup
    sub_rows = _get(
        "subdivisions",
        "select=id&normalized_name=eq.kinseys_park_ridge_subdivision",
    )
    assert sub_rows, "Kinsey's subdivision not found"
    sub_id = sub_rows[0]["id"]
    link_rows = _get(
        "property_subdivision_links",
        f"select=pin&subdivision_id=eq.{sub_id}",
    )
    assert len(link_rows) == 5, f"Expected 5 Kinsey properties, found {len(link_rows)}"


# ─── subdivision_lots ──────────────────────────────────────────────────────

@needs_creds
def test_twelve_lots_exist():
    rows = _get("subdivision_lots", "select=id")
    assert len(rows) == 12, f"Expected 12 lots, found {len(rows)}"


@needs_creds
def test_901_crescent_has_two_lots():
    rows = _get(
        "subdivision_lots",
        "select=lot_number,block_number&current_pin=eq.09-35-416-001-0000",
    )
    assert len(rows) == 2, f"Expected 2 lots for 901 S Crescent Ave, found {len(rows)}"
    lot_numbers = {r["lot_number"] for r in rows}
    assert "23" in lot_numbers and "24" in lot_numbers, f"Expected lots 23 and 24, got {lot_numbers}"


@needs_creds
def test_906_cumberland_has_two_lots():
    rows = _get(
        "subdivision_lots",
        "select=lot_number,block_number&current_pin=eq.09-35-311-067-0000",
    )
    assert len(rows) == 2, f"Expected 2 lots for 906 S Cumberland Ave, found {len(rows)}"
    lot_numbers = {r["lot_number"] for r in rows}
    assert "17" in lot_numbers and "18" in lot_numbers, f"Expected lots 17 and 18, got {lot_numbers}"


@needs_creds
def test_701_peterson_lot_detail():
    rows = _get(
        "subdivision_lots",
        "select=lot_number,block_number,document_date,confidence_level&current_pin=eq.12-02-402-014-0000",
    )
    assert rows, "701 Peterson Ave lot record missing"
    r = rows[0]
    assert r["lot_number"] == "1"
    assert r["block_number"] == "16"
    assert r["document_date"] == "7/23/2004"
    assert r["confidence_level"] == "high"


@needs_creds
def test_h_roy_berry_lots_have_missing_lot_block_flag():
    rows = _get(
        "subdivision_lots",
        "select=current_pin,data_quality_flags&current_pin=in.(12-02-104-034-0000,12-02-104-030-0000)",
    )
    assert len(rows) == 2, f"Expected 2 H. Roy Berry lots, found {len(rows)}"
    for r in rows:
        flags = r.get("data_quality_flags") or []
        assert "missing_lot_block" in flags, f"Expected missing_lot_block flag for {r['current_pin']}"


@needs_creds
def test_multi_lot_pins_have_flag():
    rows = _get(
        "subdivision_lots",
        "select=current_pin,data_quality_flags&current_pin=eq.09-35-416-001-0000",
    )
    for r in rows:
        flags = r.get("data_quality_flags") or []
        assert "multiple_historic_lots_for_pin" in flags


@needs_creds
def test_arthur_dunas_lots_have_parent_flag():
    rows = _get(
        "subdivision_lots",
        "select=current_pin,data_quality_flags&current_pin=in.(09-35-416-001-0000,09-35-416-003-0000)",
    )
    for r in rows:
        flags = r.get("data_quality_flags") or []
        assert "has_parent_subdivision" in flags, f"Missing has_parent_subdivision for {r['current_pin']}"


# ─── Parcel count denormalization ──────────────────────────────────────────

@needs_creds
def test_parcel_counts():
    rows = _get("subdivisions", "select=normalized_name,parcel_count")
    by_name = {r["normalized_name"]: r["parcel_count"] for r in rows}
    assert by_name.get("kinseys_park_ridge_subdivision") == 5
    assert by_name.get("arthur_dunas_subdivision") == 2
    assert by_name.get("shannon_and_canfields_subdivision") == 1
    assert by_name.get("h_roy_berry_cos_devon_avenue_highlands") == 2
    assert by_name.get("park_ridge_manor") is None
    assert by_name.get("john_battcher_estate") is None
