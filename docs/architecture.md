# Architecture

## Overview

The v1 prototype is a static map application with a reproducible local data pipeline.

- Frontend: React, TypeScript, Vite, MapLibre GL JS.
- Data processing: Python, Pandas, GeoPandas, Shapely.
- Storage: local source files in `data/raw`, processed exports in `data/processed`, browser-ready GeoJSON in `public/data`.

## Flow

1. Configure source URLs or local paths in `.env`.
2. Download or manually place files in `data/raw`.
3. Inspect schemas and write `docs/data_dictionary.md`.
4. Normalize parcel and assessor PINs to 14 digit strings.
5. Derive one primary improvement record per PIN.
6. Filter parcels to the target municipality by boundary, then attributes as fallback.
7. Join parcel polygons to assessor-derived fields.
8. Export GeoJSON and summary JSON.
9. The React app loads generated GeoJSON, or sample data if generated data is absent.

## Municipality Extensibility

Park Ridge is the first target, but the pipeline keeps target selection in configuration and filtering logic. Another Cook County municipality should mostly require a different boundary file or municipality attribute value.

## Historical Layer Foundation

Historical rasters should be represented as tile-layer configuration:

```json
{
  "id": "cook-1938-aerial",
  "label": "1938/1939 aerial imagery",
  "tileUrl": "https://example.org/tiles/cook-1938/{z}/{x}/{y}.png",
  "attribution": "Illinois Historical Aerial Photography",
  "enabled": false
}
```

V1 keeps this as a disabled placeholder until imagery is georeferenced and tiled.
