import json

import pandas as pd

from scripts.build_park_ridge_dataset import attach_house_evolution_timelines, build_home_artifact_history, build_permit_history, permit_title


def test_build_permit_history_groups_by_normalized_pin_and_sorts_by_date():
    permits = pd.DataFrame(
        [
            {
                "pin": "09-25-101-004-0000",
                "permit_number": "PR-2017-0264",
                "date_issued": "2017-03-08T00:00:00",
                "status": "Closed",
                "work_description": "Kitchen remodel and interior alteration.",
            },
            {
                "pin": "09251010040000",
                "permit_number": "PR-1988-0417",
                "date_issued": "1988-06-14T00:00:00",
                "status": "Closed",
                "work_description": "Construct detached two-car garage.",
            },
        ]
    )

    history = build_permit_history(permits)

    assert len(history) == 1
    row = history.iloc[0]
    assert row["pin_normalized"] == "09251010040000"
    assert row["permit_count"] == 2
    assert row["latest_permit_year"] == 2017
    assert [event["title"] for event in row["permit_timeline"]] == ["Garage permit", "Remodel or renovation permit"]


def test_permit_title_prefers_canonical_work_description_keywords():
    assert permit_title("Rear family room addition") == "Addition permit"
    assert permit_title("Demolition of single-family residence") == "Demolition or teardown permit"
    assert permit_title("Replace deck boards and stairs") == "Porch, deck, or patio permit"


def test_home_artifact_history_matches_by_address_and_enters_timeline():
    parcels = pd.DataFrame(
        [
            {
                "pin_normalized": "09251010040000",
                "address": "123 Main St",
                "year_built": 1924,
            }
        ]
    )
    records = pd.DataFrame(
        [
            {
                "address": "123 Main Street",
                "map_year": "1928",
                "sheet": "14",
                "description": "Footprint shows a detached garage behind the house.",
                "source_name": "Sanborn map reference",
                "source_url": "https://example.test/sanborn",
            }
        ]
    )

    history = build_home_artifact_history(records, parcels, "sanborn_snapshot", "sanborn_snapshot_count", "sanborn_snapshots_json")
    enriched = attach_house_evolution_timelines(parcels.merge(history, on="pin_normalized", how="left"))
    timeline = json.loads(enriched.iloc[0]["house_evolution_timeline"])

    assert history.iloc[0]["sanborn_snapshot_count"] == 1
    assert any(event["event_type"] == "sanborn_snapshot" and event["sheet"] == "14" for event in timeline)
