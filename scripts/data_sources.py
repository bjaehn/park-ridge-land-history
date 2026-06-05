from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class DataSource:
    name: str
    env_url: str
    env_path: str
    default_path: Path
    required_for_build: bool
    description: str

    @property
    def url(self) -> str | None:
        return os.getenv(self.env_url) or None

    @property
    def local_path(self) -> Path:
        configured = os.getenv(self.env_path)
        if configured:
            path = Path(configured)
            return path if path.is_absolute() else PROJECT_ROOT / path
        return PROJECT_ROOT / self.default_path


DATA_SOURCES: list[DataSource] = [
    DataSource(
        name="Cook County parcel boundaries",
        env_url="PARCEL_BOUNDARY_SOURCE_URL",
        env_path="PARCEL_BOUNDARY_LOCAL_PATH",
        default_path=Path("data/raw/cook_county_parcels.geojson"),
        required_for_build=True,
        description="Current parcel geometry used for map polygons."
    ),
    DataSource(
        name="Cook County Assessor single and multi-family improvements",
        env_url="ASSESSOR_IMPROVEMENTS_SOURCE_URL",
        env_path="ASSESSOR_IMPROVEMENTS_LOCAL_PATH",
        default_path=Path("data/raw/assessor_improvements.csv"),
        required_for_build=True,
        description="Improvement-level assessor characteristics, including year built."
    ),
    DataSource(
        name="Cook County Assessor permits",
        env_url="ASSESSOR_PERMITS_SOURCE_URL",
        env_path="ASSESSOR_PERMITS_LOCAL_PATH",
        default_path=Path("data/raw/assessor_permits.csv"),
        required_for_build=False,
        description="Permit-level building history, including issued dates, statuses, and work descriptions."
    ),
    DataSource(
        name="Cook County Assessor parcel sales",
        env_url="ASSESSOR_PARCEL_SALES_SOURCE_URL",
        env_path="ASSESSOR_PARCEL_SALES_LOCAL_PATH",
        default_path=Path("data/raw/assessor_parcel_sales.csv"),
        required_for_build=False,
        description="PIN-level assessor sale history from 1999 to present."
    ),
    DataSource(
        name="Cook County Assessor assessed values",
        env_url="ASSESSOR_ASSESSED_VALUES_SOURCE_URL",
        env_path="ASSESSOR_ASSESSED_VALUES_LOCAL_PATH",
        default_path=Path("data/raw/assessor_assessed_values.csv"),
        required_for_build=False,
        description="PIN-level assessed value history from 1999 to present."
    ),
    DataSource(
        name="Cook County Assessor appeals",
        env_url="ASSESSOR_APPEALS_SOURCE_URL",
        env_path="ASSESSOR_APPEALS_LOCAL_PATH",
        default_path=Path("data/raw/assessor_appeals.csv"),
        required_for_build=False,
        description="PIN-level assessment appeal history from 1999 to present."
    ),
    DataSource(
        name="Cook County Assessor parcel proximity",
        env_url="ASSESSOR_PARCEL_PROXIMITY_SOURCE_URL",
        env_path="ASSESSOR_PARCEL_PROXIMITY_LOCAL_PATH",
        default_path=Path("data/raw/assessor_parcel_proximity.csv"),
        required_for_build=False,
        description="PIN10-level proximity context such as parks, Metra, trails, roads, and nearby foreclosure rates."
    ),
    DataSource(
        name="Cook County parcel universe or address data",
        env_url="PARCEL_UNIVERSE_SOURCE_URL",
        env_path="PARCEL_UNIVERSE_LOCAL_PATH",
        default_path=Path("data/raw/parcel_universe.csv"),
        required_for_build=False,
        description="Optional parcel metadata, addresses, property classes, and municipality fields."
    ),
    DataSource(
        name="Cook County Assessor parcel addresses",
        env_url="ASSESSOR_PARCEL_ADDRESSES_SOURCE_URL",
        env_path="ASSESSOR_PARCEL_ADDRESSES_LOCAL_PATH",
        default_path=Path("data/raw/assessor_parcel_addresses.csv"),
        required_for_build=False,
        description="Assessor parcel situs addresses used for address search and parcel labels."
    ),
    DataSource(
        name="Park Ridge municipal boundary",
        env_url="PARK_RIDGE_BOUNDARY_SOURCE_URL",
        env_path="PARK_RIDGE_BOUNDARY_LOCAL_PATH",
        default_path=Path("data/raw/park_ridge_boundary.geojson"),
        required_for_build=False,
        description="Municipal polygon used for centroid/intersection filtering."
    )
]

HISTORICAL_AERIAL_DOC_URL = os.getenv(
    "HISTORICAL_AERIAL_DOC_URL",
    "https://clearinghouse.isgs.illinois.edu/data/imagery/illinois-historical-aerial-photography"
)
