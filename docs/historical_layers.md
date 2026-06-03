# Historical Layers

Historical layers are separate evidence sources, not replacements for assessor year-built data.

The app now has a structured historical layer registry at `data/historical_layers.registry.json`. The public app reads `public/data/historical/layer_manifest.json`, which is generated from that registry.

## Product Principle

Year built is not subdivision date.

Assessor `year_built` helps estimate when a structure was built. It does not prove when land was subdivided, platted, split, merged, annexed, or legally described. Parcel boundary years, recorded subdivision plats, aerial imagery, Sanborn sheets, PLSS reference data, and local preservation layers should be treated as separate evidence.

## Current Map-Ready Layers

- Cook County Parcels 2000: official Cook County parcel snapshot spatially filtered to Park Ridge.
- Cook County Parcels 2021: official Cook County parcel snapshot filtered to Park Ridge.
- Sample Parcel Changes 2000-2021: synthetic split, merge, new PIN, retired PIN, unchanged, and area-change candidates.

Sample layers are for workflow testing only. They are marked `syntheticSample: true` in the registry and GeoJSON properties. The 2000 and 2021 parcel-year layers are now real Cook County source data.

## Registered Future Layers

- Cook County historical parcel snapshots for 2004, 2009, 2019, and 2020.
- Recorded subdivision plat lots.
- ILHAP Cook County 1938/1939 aerial imagery.
- CMAP 1970, 1975, 1980, 1985, 1990, and 1995 aerial imagery.
- Cook County modern imagery 1998 and later.
- Park Ridge historic landmarks and 100-year-old homes.
- PLSS sections.
- Sanborn or other georeferenced historic map sheets.

## Commands

```bash
python -m scripts.historical_layers.build_layer_manifest
python -m scripts.historical_layers.inspect_historical_sources
python -m scripts.historical_layers.build_historical_parcel_layers --samples-only
python -m scripts.historical_layers.download_cook_2000_parcels
python -m scripts.historical_layers.download_cook_2021_parcels
python -m scripts.historical_layers.compare_parcel_years public/data/historical/sample_historical_parcels_2000.geojson public/data/historical/sample_historical_parcels_2021.geojson public/data/historical/sample_parcel_changes_2000_2021.geojson --old-year 2000 --new-year 2021
```
