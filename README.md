# Park Ridge Land History

Local prototype for exploring how Park Ridge, Illinois developed parcel by parcel over time.

The first version is intentionally simple: a static React map reads generated GeoJSON from `public/data`, while Python scripts handle data inspection, PIN normalization, assessor joins, Park Ridge filtering, and exports. If real data has not been generated yet, the app falls back to synthetic sample parcels so the map runs immediately.

## What the App Does

- Shows current parcel polygons when a processed Cook County parcel file is available.
- Colors parcels by the decade of the primary structure's assessor `year_built`.
- Filters visible parcels by decade and by "built by year".
- Shows parcel details on click: PIN, address, year built, square footage, class, improvement count, and quality flags.
- Includes layer toggles for parcel outlines, boundary display, and a disabled placeholder for future 1938/1939 aerial overlays.
- Registers historical evidence layers for parcel boundary years, aerial imagery, subdivision plats, local preservation context, PLSS, and Sanborn/map sheets.
- Includes real Cook County 2000 and 2021 historical parcel overlays plus sample parcel-change candidates so the historical layer workflow can be tested while formal change detection is expanded.

## Data Sources

Primary sources to configure or manually download:

- Cook County GIS parcel boundary service: `https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer`
- Cook County Open Data parcel snapshots, such as Parcel 2021: `https://datacatalog.cookcountyil.gov/Boundaries-Districts/ccgisdata-Parcel-2021/77tz-riq7`
- Cook County Assessor Single and Multi-Family Improvement Characteristics: `https://datacatalog.cookcountyil.gov/w/x54s-btds/qzb8-g2nd`
- Cook County Assessor Parcel Universe: `https://datacatalog.cookcountyil.gov/Property-Taxation/Assessor-Parcel-Universe/nj4t-kc8j`
- Park Ridge Map Gallery: `https://storymaps.arcgis.com/collections/94130fe6114d4606af97b11fd0875e25`
- Illinois Historical Aerial Photography, Cook County 1938/1939: `https://clearinghouse.isgs.illinois.edu/webdocs/ilhap/county/j_cook.html`

See `docs/data_sources.md` for notes and caveats.

## Local Setup

```bash
npm install
npm run dev
```

Open the Vite URL printed by the dev server. The app first requests `public/data/park_ridge_parcels_enriched.geojson`; if it is missing, it loads `public/data/sample_parcels.geojson` and shows a Sample Data notice.

## Railway Deployment

This prototype deploys as a static Node service on Railway. Railway installs npm dependencies, runs `npm run build`, and starts the app with `npm start`.

The Python GIS pipeline is local tooling only. Its requirements live in `data/requirements.txt` so Railway does not spend deploy time installing GeoPandas, Shapely, Pandas, or other data-processing packages.

For automatic builds:

1. Push this repository to GitHub.
2. In Railway, create a new project from the GitHub repository.
3. Use the repository root as the service root.
4. Let Railway read `railway.json`; it sets the build command, start command, and `/` healthcheck.
5. Each push to the connected branch will trigger a new build.

The deployed version serves whatever is in `public/data`. Until the real data pipeline exports `park_ridge_parcels_enriched.geojson`, Railway will serve the synthetic sample parcel layer.

## Python Setup

macOS/Linux:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r data/requirements.txt
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r data/requirements.txt
```

## Data Pipeline Commands

```bash
python scripts/setup_data_dirs.py
python -m scripts.download_cook_county_live --year 2026 --force
python -m scripts.download_park_ridge_boundary
python -m scripts.inspect_sources
python -m scripts.build_park_ridge_dataset
python scripts/export_geojson.py
python -m scripts.historical_layers.download_cook_2000_parcels
python -m scripts.historical_layers.download_cook_2021_parcels
python -m scripts.historical_layers.build_layer_manifest
python -m scripts.historical_layers.inspect_historical_sources
```

The live downloader queries Cook County Parcel Universe for `CITY OF PARK RIDGE`, downloads matching assessor improvement rows, fetches matching parcel geometries from the Cook County parcel FeatureServer, and writes local files into `data/raw`. The build script joins those files and exports `public/data/park_ridge_parcels_enriched.geojson` for the deployed app.

As of the current v1 data build, the public GeoJSON contains 12,191 Park Ridge parcel polygons with matched assessor year-built data. Some Park Ridge PINs from Parcel Universe do not return polygon geometry from the current parcel boundary service, often because they are non-base or condominium-related records.

## Historical Layer Pipeline

The historical layer registry lives at `data/historical_layers.registry.json`. It is the source of truth for layer IDs, status, source attribution, and map-ready data paths.

Generate the public manifest after registry changes:

```bash
python -m scripts.historical_layers.build_layer_manifest
```

Compare two parcel years:

```bash
python -m scripts.historical_layers.compare_parcel_years OLD.geojson NEW.geojson OUTPUT.geojson --old-year 2000 --new-year 2021
```

See `docs/historical_layers.md`, `docs/parcel_change_detection.md`, `docs/georeferencing_historical_imagery.md`, and `docs/subdivision_plat_research.md`.

## PIN Normalization

PINs are always treated as strings. The helper removes formatting characters, preserves the original value, zero-pads to 14 digits, and flags invalid or missing values.

Examples:

- `09-25-101-001-0000` becomes `09251010010000`
- `9251010010000` becomes `09251010010000`
- invalid values keep `pin_original` and receive a data quality flag

## Year-Built Bucketing

`year_built` is bucketed as:

- `Unknown` for null or missing values
- `Suspicious` for years before 1800 or after the current year
- `Pre-1900` for valid years before 1900
- decade labels from `1900s` through `2020s`

## Tests

```bash
pytest
```

Tests cover PIN normalization, year-built buckets, primary improvement selection, and GeoJSON validation.

## Known Limitations

Year built is not subdivision date. Current parcel boundaries do not reconstruct historical lot splits, consolidations, or plats. Multiple improvements per parcel are reduced to a primary-building record for v1 using clear, documented rules. Historical aerials and Sanborn maps need separate georeferencing, access, and licensing work.

See `docs/limitations.md` for the full list.

## Roadmap

Near-term:

- Wire real Cook County parcel and assessor files into the v1 build.
- Keep the Park Ridge municipal boundary refreshed from the public TIGER/Line source or a verified local GIS source.
- Add address and PIN search.
- Add cumulative build-out animation.

Longer-term:

- Historical parcel layers, subdivision plats, permits, Sanborn maps, georeferenced aerial imagery, zoning overlays, landmark layers, and support for additional municipalities.

## Screenshots

Placeholder for screenshots once the app is running with either sample or real data.
