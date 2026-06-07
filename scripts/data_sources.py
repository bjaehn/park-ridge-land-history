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
    default_url: str | None = None

    @property
    def url(self) -> str | None:
        return os.getenv(self.env_url) or self.default_url

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
    ),
    DataSource(
        name="U.S. Census Illinois tabulation blocks",
        env_url="CENSUS_TABULATION_BLOCKS_SOURCE_URL",
        env_path="CENSUS_TABULATION_BLOCKS_LOCAL_PATH",
        default_path=Path("data/raw/tl_2024_17_tabblock20.zip"),
        required_for_build=False,
        description="Census block polygons used as the first real street-bounded block geography.",
        default_url="https://www2.census.gov/geo/tiger/TIGER2024/TABBLOCK20/tl_2024_17_tabblock20.zip"
    ),
    DataSource(
        name="Illinois HARGIS Park Ridge properties",
        env_url="HARGIS_PROPERTIES_SOURCE_URL",
        env_path="HARGIS_PROPERTIES_LOCAL_PATH",
        default_path=Path("data/raw/hargis_park_ridge_properties.csv"),
        required_for_build=False,
        description="Illinois Historic Architectural Resources Geographic Information System property survey records for Park Ridge."
    ),
    DataSource(
        name="Illinois HARGIS Park Ridge photos",
        env_url="HARGIS_PHOTOS_SOURCE_URL",
        env_path="HARGIS_PHOTOS_LOCAL_PATH",
        default_path=Path("data/raw/hargis_park_ridge_photos.csv"),
        required_for_build=False,
        description="Linked public HARGIS photo records for matched Park Ridge survey properties."
    ),
    DataSource(
        name="Illinois HARGIS Park Ridge PDFs",
        env_url="HARGIS_PDFS_SOURCE_URL",
        env_path="HARGIS_PDFS_LOCAL_PATH",
        default_path=Path("data/raw/hargis_park_ridge_pdfs.csv"),
        required_for_build=False,
        description="Linked public HARGIS PDF records for matched Park Ridge survey properties."
    ),
    DataSource(
        name="Park Ridge public design review cases",
        env_url="PARK_RIDGE_DESIGN_REVIEW_CASES_SOURCE_URL",
        env_path="PARK_RIDGE_DESIGN_REVIEW_CASES_LOCAL_PATH",
        default_path=Path("data/raw/park_ridge_design_review_cases.csv"),
        required_for_build=False,
        description="Address or PIN-level appearance, zoning, preservation, and design review case artifacts."
    ),
    DataSource(
        name="Park Ridge historical directory breadcrumbs",
        env_url="PARK_RIDGE_DIRECTORY_BREADCRUMBS_SOURCE_URL",
        env_path="PARK_RIDGE_DIRECTORY_BREADCRUMBS_LOCAL_PATH",
        default_path=Path("data/raw/park_ridge_directory_breadcrumbs.csv"),
        required_for_build=False,
        description="Address or PIN-level breadcrumbs transcribed from city directories, phone books, or local history indexes."
    ),
    DataSource(
        name="Park Ridge Sanborn map snapshots",
        env_url="PARK_RIDGE_SANBORN_SNAPSHOTS_SOURCE_URL",
        env_path="PARK_RIDGE_SANBORN_SNAPSHOTS_LOCAL_PATH",
        default_path=Path("data/raw/park_ridge_sanborn_snapshots.csv"),
        required_for_build=False,
        description="Address or PIN-level Sanborn/fire insurance map references, sheet links, and interpretation notes."
    ),
    DataSource(
        name="Cook County recorder paper trail",
        env_url="COOK_RECORDER_PAPER_TRAIL_SOURCE_URL",
        env_path="COOK_RECORDER_PAPER_TRAIL_LOCAL_PATH",
        default_path=Path("data/raw/cook_county_recorder_paper_trail.csv"),
        required_for_build=False,
        description="PIN or address-level recorded land document index: deeds, mortgages, releases, quit claims, liens, and foreclosure-related filings."
    ),
    DataSource(
        name="Park Ridge recognized history",
        env_url="PARK_RIDGE_RECOGNIZED_HISTORY_SOURCE_URL",
        env_path="PARK_RIDGE_RECOGNIZED_HISTORY_LOCAL_PATH",
        default_path=Path("data/raw/park_ridge_recognized_history.csv"),
        required_for_build=False,
        description="Address-level local landmarks, 100-year-home recognition, and local historic narrative clues."
    ),
    DataSource(
        name="Park Ridge land family",
        env_url="PARK_RIDGE_LAND_FAMILY_SOURCE_URL",
        env_path="PARK_RIDGE_LAND_FAMILY_LOCAL_PATH",
        default_path=Path("data/raw/park_ridge_land_family.csv"),
        required_for_build=False,
        description="PIN or address-level subdivision, plat, lot, block, developer, and land-family clues."
    )
]

HISTORICAL_AERIAL_DOC_URL = os.getenv(
    "HISTORICAL_AERIAL_DOC_URL",
    "https://clearinghouse.isgs.illinois.edu/data/imagery/illinois-historical-aerial-photography"
)
