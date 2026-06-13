"""
ETL source configuration for Park Ridge Land History.
All data sources and their fetch parameters.
"""

import os

# ─── Cook County Socrata Endpoints ────────────────────────────────────────

PARCEL_UNIVERSE_URL = os.getenv(
    "PARCEL_UNIVERSE_SOURCE_URL",
    "https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json"
)

ASSESSOR_IMPROVEMENTS_URL = os.getenv(
    "ASSESSOR_IMPROVEMENTS_SOURCE_URL",
    "https://datacatalog.cookcountyil.gov/resource/x54s-btds.json"
)

PARCEL_BOUNDARY_URL = os.getenv(
    "PARCEL_BOUNDARY_SOURCE_URL",
    "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0/query"
)

# ─── Socrata Pagination ───────────────────────────────────────────────────

SOCRATA_PAGE_SIZE = 50_000  # Max records per Socrata request
SOCRATA_CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "75"))  # PINs per API call

# ─── Supabase ─────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ─── Target Municipality ──────────────────────────────────────────────────

TARGET_MUNICIPALITY = os.getenv("TARGET_MUNICIPALITY", "Park Ridge")
TARGET_MUNICIPALITY_SOURCE_NAME = os.getenv(
    "TARGET_MUNICIPALITY_SOURCE_NAME", "CITY OF PARK RIDGE"
)
TARGET_ASSESSMENT_YEAR = int(os.getenv("TARGET_ASSESSMENT_YEAR", "2026"))

# ─── Local File Paths ─────────────────────────────────────────────────────

DATA_RAW_DIR = os.getenv("DATA_RAW_DIR", "data/raw")
DATA_INTERIM_DIR = os.getenv("DATA_INTERIM_DIR", "data/interim")
DATA_PROCESSED_DIR = os.getenv("DATA_PROCESSED_DIR", "data/processed")
PUBLIC_DATA_DIR = os.getenv("PUBLIC_DATA_DIR", "public/data")

ENRICHED_GEOJSON_PATH = f"{PUBLIC_DATA_DIR}/park_ridge_parcels_enriched.geojson"
MAP_GEOJSON_PATH = f"{PUBLIC_DATA_DIR}/park_ridge_parcels_map.geojson"
PARCEL_DETAILS_DIR = f"{PUBLIC_DATA_DIR}/parcel_details"

# ─── Import Settings ──────────────────────────────────────────────────────

# Set to True to skip Supabase and only update local files
LOCAL_ONLY_MODE = not bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)

# Batch size for Supabase upserts
SUPABASE_BATCH_SIZE = 500

# Permit type keyword matching (from existing pipeline)
DEMOLITION_KEYWORDS = {"demo", "tear down", "wreck", "demolish", "remove structure"}
NEW_CONSTRUCTION_KEYWORDS = {"new construction", "new building", "new single family", "new residence"}
ADDITION_KEYWORDS = {"addition", "expand", "extend", "new room"}
REMODEL_KEYWORDS = {"remodel", "renovate", "rehab", "rehabil", "interior alter", "alteration"}
