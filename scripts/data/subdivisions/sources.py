"""Subdivision data source configurations.

Documents each data source investigated for subdivision history:
- What it contains
- How to access it
- What fields are available
- Whether usable programmatically
- Confidence level it provides
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SubdivisionSource:
    name: str
    description: str
    access_method: str
    base_url: str | None
    fields_available: list[str]
    subdivision_fields: list[str]
    programmatic: bool
    confidence_if_available: str
    terms_note: str
    status: str
    acquisition_notes: str = ""


COOK_COUNTY_GIS_PARCEL = SubdivisionSource(
    name="Cook County GIS Hosted Parcel Layer",
    description=(
        "Cook County ArcGIS FeatureServer layer with parcel boundaries. "
        "The layer used by the existing pipeline provides PIN, PIN10, parcel type, and tax code. "
        "Additional fields including subdivision name, lot, and block may be available "
        "depending on the layer version. Script 01 inspects the actual available fields."
    ),
    access_method="ArcGIS REST FeatureServer query",
    base_url="https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0",
    fields_available=["name", "pin10", "parceltype", "taxcode", "possibly_subdivisio", "possibly_lot", "possibly_block"],
    subdivision_fields=["subdivisio", "subdivision", "SUBDIVISIO", "lot", "block"],
    programmatic=True,
    confidence_if_available="medium",
    terms_note="Cook County public GIS data, open access.",
    status="inspect_required",
    acquisition_notes="Run script 01_inspect_cook_gis_fields.py to discover actual field list.",
)

COOK_COUNTY_GIS_HUB_PARCELS = SubdivisionSource(
    name="Cook County GIS Hub Parcels Dataset",
    description=(
        "More complete Cook County parcel dataset available on the Cook County GIS Hub at "
        "cookcountyilgis.hub.arcgis.com. May include subdivision, lot, and block attributes "
        "derived from the Assessor's recorded plat data."
    ),
    access_method="ArcGIS Hub open data download or ArcGIS REST API",
    base_url="https://cookcountyilgis.hub.arcgis.com",
    fields_available=["parcel PIN", "address", "possibly subdivision name", "lot", "block", "legal description"],
    subdivision_fields=["SUBDIVISIO", "LOT", "BLOCK"],
    programmatic=True,
    confidence_if_available="medium",
    terms_note="Cook County public GIS data, open access.",
    status="to_investigate",
    acquisition_notes="Search hub for 'parcels' and check field list before downloading.",
)

COOK_COUNTY_ASSESSOR_PARCEL_UNIVERSE = SubdivisionSource(
    name="Cook County Assessor Parcel Universe (Socrata)",
    description=(
        "Cook County Assessor Parcel Universe dataset at datacatalog.cookcountyil.gov "
        "(dataset nj4t-kc8j). Contains PIN, year, class, municipality, township, and lat/lon. "
        "Does NOT appear to contain subdivision fields in the columns currently downloaded. "
        "Additional columns may exist in the full dataset schema."
    ),
    access_method="Socrata REST API (existing pipeline already downloads this)",
    base_url="https://datacatalog.cookcountyil.gov/resource/nj4t-kc8j.json",
    fields_available=["pin", "year", "class", "lat", "lon", "cook_municipality_name", "tax_municipality_name", "township_name", "township_code", "zip_code"],
    subdivision_fields=[],
    programmatic=True,
    confidence_if_available="unknown",
    terms_note="Cook County open data, public access via Socrata API.",
    status="no_subdivision_fields_in_known_columns",
    acquisition_notes="Inspect full dataset schema via ?$limit=1&$offset=0 to check if other columns exist.",
)

COOK_COUNTY_RECORDER_PLAT_DATABASE = SubdivisionSource(
    name="Cook County Recorder of Deeds - Recorded Subdivision Plats",
    description=(
        "The official recorded subdivision plat index maintained by the Cook County Recorder "
        "of Deeds. Contains subdivision names, plat book and page references, document numbers, "
        "recording dates, and grantors/grantees. This is the authoritative source for subdivision "
        "recording dates and would support high-confidence subdivision records."
    ),
    access_method="Manual search via ccrd.info or in-person at Cook County Clerk's office",
    base_url="https://ccrd.info",
    fields_available=["subdivision name", "plat book", "plat page", "document number", "recording date", "grantor", "grantee"],
    subdivision_fields=["subdivision name", "plat book", "plat page", "document number", "recording date"],
    programmatic=False,
    confidence_if_available="high",
    terms_note="Public record. Terms of use for bulk data extraction unclear; check before automating.",
    status="manual_acquisition_required",
    acquisition_notes=(
        "Search ccrd.info for 'PARK RIDGE' subdivision plats. "
        "Download or transcribe plat index entries. "
        "Create import CSV matching the park_ridge_land_family.csv format. "
        "For high-volume research, contact the Cook County Clerk's office about data access."
    ),
)

PARK_RIDGE_LAND_FAMILY_CSV = SubdivisionSource(
    name="Park Ridge land family CSV (internal research file)",
    description=(
        "The park_ridge_land_family.csv file in data/raw/ holds PIN or address-level "
        "subdivision, plat, lot, block, developer, and land-family clues. "
        "This file is populated by manual research. It is the primary intake format "
        "for subdivision data from any source that cannot be fetched programmatically."
    ),
    access_method="Local CSV file at data/raw/park_ridge_land_family.csv",
    base_url=None,
    fields_available=["pin", "address", "title", "description", "record_type", "source_name", "source_url", "case_number"],
    subdivision_fields=["title", "description", "record_type"],
    programmatic=True,
    confidence_if_available="medium",
    terms_note="Internal research file. No external terms.",
    status="available_if_populated",
    acquisition_notes=(
        "Add rows to this CSV with record_type = 'subdivision_plat' or 'lot_block_reference'. "
        "The title field should contain the subdivision name. "
        "The case_number field should contain the document number or plat book/page reference. "
        "Source_name should identify where the record came from."
    ),
)

ILLINOIS_HARGIS = SubdivisionSource(
    name="Illinois HARGIS Historic Survey",
    description=(
        "The Illinois HARGIS dataset (Historic Architectural Resources Geographic Information System) "
        "includes legal descriptions and sometimes references subdivision names for surveyed properties. "
        "Coverage is sparse and incomplete for Park Ridge; useful as a cross-reference, not a primary source."
    ),
    access_method="Already integrated via existing pipeline",
    base_url=None,
    fields_available=["RefNum", "Location", "SignificantName", "BeginYear", "Architect", "Builder"],
    subdivision_fields=[],
    programmatic=True,
    confidence_if_available="low",
    terms_note="Illinois State Historic Preservation Office public data.",
    status="partial_cross_reference_only",
)

SANBORN_FIRE_INSURANCE_MAPS = SubdivisionSource(
    name="Sanborn Fire Insurance Maps",
    description=(
        "Sanborn maps for Park Ridge (typically 1900s–1950s coverage) show lot lines, street "
        "widths, block numbers, and sometimes subdivision names. Not georeferenced in this system. "
        "Available via Library of Congress Digital Collections (some Park Ridge coverage) and "
        "ProQuest Sanborn Maps (subscription)."
    ),
    access_method="Library of Congress Digital Collections (free, manual); ProQuest (subscription)",
    base_url="https://www.loc.gov/collections/sanborn-maps/",
    fields_available=["block number", "lot lines", "street layout", "building footprints", "sometimes subdivision names"],
    subdivision_fields=["block number", "possibly subdivision name on title block"],
    programmatic=False,
    confidence_if_available="low",
    terms_note="LOC digital images are public domain. ProQuest is subscription. Transcribed content is research output.",
    status="manual_research_required",
    acquisition_notes=(
        "Search LOC Sanborn catalog for Park Ridge, Illinois. "
        "Note map years available. "
        "Block and lot data can be cross-referenced to Cook County GIS. "
        "Do not republish scanned map images without checking LOC license."
    ),
)

ILLINOIS_HISTORICAL_AERIAL = SubdivisionSource(
    name="Illinois Historical Aerial Photography",
    description=(
        "Illinois State Geological Survey historical aerial photography clearinghouse. "
        "Useful for estimating when lots were vacant vs. built, but aerials do NOT show "
        "subdivision recording dates and should not be used to infer platting dates."
    ),
    access_method="https://clearinghouse.isgs.illinois.edu/data/imagery/illinois-historical-aerial-photography",
    base_url="https://clearinghouse.isgs.illinois.edu",
    fields_available=["imagery by year", "flight date"],
    subdivision_fields=[],
    programmatic=False,
    confidence_if_available="low",
    terms_note="Illinois State Geological Survey public data.",
    status="useful_for_buildout_not_subdivision_date",
)

HISTORICAL_TOWNSHIP_PLAT_MAPS = SubdivisionSource(
    name="Historical Township Plat Maps (Atlas maps)",
    description=(
        "Township plat maps and county atlases from the 1800s–early 1900s show farm boundaries, "
        "owner names, and sometimes early subdivision outlines for Cook County. "
        "Available from Newberry Library, Illinois State Archives, and Chicago History Museum. "
        "Not georeferenced; require manual georeferencing and transcription."
    ),
    access_method="Manual, in-person or digitized scans at libraries and archives",
    base_url=None,
    fields_available=["farm owner names", "section/township boundaries", "early subdivision outlines"],
    subdivision_fields=["early subdivision outlines", "developer/owner names"],
    programmatic=False,
    confidence_if_available="low",
    terms_note="Historical maps are typically in the public domain, but specific digitized collections may have access terms.",
    status="manual_research_required",
    acquisition_notes=(
        "Target Maine Township plat maps from 1876 Illinois atlas, 1886 Snyder plat book, "
        "and subsequent editions. The Newberry Library in Chicago holds many of these. "
        "Georeferencing would require QGIS or similar GIS software."
    ),
)

ALL_SOURCES: list[SubdivisionSource] = [
    COOK_COUNTY_GIS_PARCEL,
    COOK_COUNTY_GIS_HUB_PARCELS,
    COOK_COUNTY_ASSESSOR_PARCEL_UNIVERSE,
    COOK_COUNTY_RECORDER_PLAT_DATABASE,
    PARK_RIDGE_LAND_FAMILY_CSV,
    ILLINOIS_HARGIS,
    SANBORN_FIRE_INSURANCE_MAPS,
    ILLINOIS_HISTORICAL_AERIAL,
    HISTORICAL_TOWNSHIP_PLAT_MAPS,
]


def print_source_inventory() -> None:
    """Print a summary of all investigated sources."""
    print("\n=== Subdivision Data Source Inventory ===\n")
    for source in ALL_SOURCES:
        print(f"  {source.name}")
        print(f"    Status:      {source.status}")
        print(f"    Programmatic: {'Yes' if source.programmatic else 'No'}")
        print(f"    Confidence:  {source.confidence_if_available}")
        if source.acquisition_notes:
            print(f"    Note:        {source.acquisition_notes[:120]}...")
        print()


if __name__ == "__main__":
    print_source_inventory()
