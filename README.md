# Park Ridge Land History

Local prototype for exploring how Park Ridge, Illinois developed parcel by parcel over time.

The first version is intentionally simple: a static React map reads generated GeoJSON from `public/data`, while Python scripts handle data inspection, PIN normalization, assessor joins, Park Ridge filtering, and exports. If real data has not been generated yet, the app falls back to synthetic sample parcels so the map runs immediately.

## What the App Does

- Shows current parcel polygons when a processed Cook County parcel file is available.
- Colors parcels by the decade of the primary structure's assessor `year_built`.
- Filters visible parcels by decade and by "built by year".
- Shows parcel details on click: PIN, address, year built, square footage, class, improvement count, and quality flags.
- Includes layer toggles for parcel outlines, boundary display, and a disabled placeholder for future 1938/1939 aerial overlays.

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

This prototype can be deployed as a static Node service on Railway. Railway will install dependencies, run `npm run build`, and start the app with `npm start`.

The repository also contains Python data-pipeline scripts, so `railpack.json` explicitly sets the Railpack provider to `node`. Without that, Railway may detect `requirements.txt` first, install only Python, and then fail at `npm run build`.

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
pip install -r requirements.txt
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Data Pipeline Commands

```bash
python scripts/setup_data_dirs.py
python scripts/download_sources.py
python scripts/inspect_sources.py
python scripts/build_park_ridge_dataset.py
python scripts/export_geojson.py
```

The downloader uses `.env` values. Copy `.env.example` to `.env`, fill in source URLs or local paths, and place manually downloaded files in `data/raw` when automatic export is not feasible.

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
- Improve Park Ridge boundary sourcing through public GIS layers.
- Add address and PIN search.
- Add cumulative build-out animation.

Longer-term:

- Historical parcel layers, subdivision plats, permits, Sanborn maps, georeferenced aerial imagery, zoning overlays, landmark layers, and support for additional municipalities.

## Screenshots

Placeholder for screenshots once the app is running with either sample or real data.
