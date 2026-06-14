"""Subdivision history data pipeline for Park Ridge Land History.

Processes Cook County GIS and assessor data to extract, normalize, match,
and load subdivision records into Supabase.

Run in order:
  python -m scripts.data.subdivisions.01_inspect_cook_gis_fields
  python -m scripts.data.subdivisions.02_download_cook_gis_parcels_subdivisions
  python -m scripts.data.subdivisions.03_extract_subdivision_candidates
  python -m scripts.data.subdivisions.04_match_parcels_to_subdivisions
  python -m scripts.data.subdivisions.05_load_to_supabase
  python -m scripts.data.subdivisions.06_generate_qa_report
"""
