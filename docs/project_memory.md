# Project Memory

## Future Hardening

- Home Ancestry media: HARGIS photo and PDF attachments are now carried through the parcel data and rendered in the property view. Next hardening step: sync those media files into durable storage, either Supabase Storage or local `public/` assets, so the app is not dependent on remote ArcGIS media URLs for long-term availability.
- Home Ancestry public-history clues: the app now has optional imports for Park Ridge public case files, local-history directory breadcrumbs, and Sanborn map references. Next hardening step: collect real rows from city agendas/packets, library directory indexes, and rights-cleared Sanborn references, then populate `data/raw/park_ridge_design_review_cases.csv`, `data/raw/park_ridge_directory_breadcrumbs.csv`, and `data/raw/park_ridge_sanborn_snapshots.csv`.
