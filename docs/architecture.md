# Park Ridge Land History — Architecture

## Overview

A premium property-history intelligence product for Park Ridge, Illinois.
The app surfaces 12,000+ parcels through permits, sales, assessments, and
development patterns — with every claim traced to a source record.

**Stack**: React 18 + TypeScript + Vite | MapLibre GL | Python data pipeline | Supabase (configured, optional)
**Deployment**: Railway via RAILPACK (Node 22)

---

## Product Modes

### Research Mode
- Search by address or PIN → property detail page
- Navigate by block, neighborhood, or citywide filters
- View permit history, sales, assessments, historic survey data

### Story Mode
- Discover homepage with curated ranked insights
- Neighborhood and block narrative pages
- AI-generated summaries (grounded, citation-backed) — schema ready, pending Supabase activation

---

## Frontend Architecture

```
src/
  App.tsx                    # BrowserRouter + Routes
  main.tsx                   # React root
  contexts/
    ParkRidgeDataContext.tsx  # Shared parcel data (loaded once, shared via context)
  pages/
    DiscoverPage.tsx          # / — homepage with search + rankings
    SearchPage.tsx            # /search
    PropertyPage.tsx          # /property/:pin (timeline, charts, source drawer)
    BlocksPage.tsx            # /blocks
    NeighborhoodsPage.tsx     # /neighborhoods
    NeighborhoodDetailPage.tsx# /neighborhoods/:id
    CitywidePage.tsx          # /park-ridge (citywide trends)
    MapsPage.tsx              # /maps (historical layer inventory)
    DataSourcesPage.tsx       # /data-sources
  components/
    layout/                  # AppShell, Header (sticky nav + search)
    cards/                   # StatCard, RankedInsightCard
    charts/                  # AssessmentChart, SalesPriceChart, PermitActivityChart
    timeline/                # PropertyTimeline (chronological event list)
    search/                  # SearchBox (autocomplete, keyboard-navigable)
    sources/                 # SourceDrawer, CitationBadge
  lib/
    routes.ts                # Route constants (single source of truth)
    formatters/              # Currency, PIN, address, year formatters
    rankings/                # Compute ranked property lists from parcel data
    supabase/                # Supabase client (optional — falls back to flat files)
```

### Data Flow

1. `ParkRidgeDataContext` loads `park_ridge_parcels_map.geojson` once on app init
2. Pages consume context via `useParkRidgeContext()`
3. `PropertyPage` additionally loads detail chunks from `/data/parcel_details/{prefix}.json`
4. Rankings are computed in-memory from the loaded parcel features
5. When Supabase is configured (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`), queries
   can move to Supabase for real-time data

### Routing

| Route | Page |
|-------|------|
| `/` | DiscoverPage (homepage) |
| `/search?q=...` | SearchPage |
| `/property/:pin` | PropertyPage (the emotional center) |
| `/blocks` | BlocksPage |
| `/blocks/:blockId` | BlockDetailPage |
| `/neighborhoods` | NeighborhoodsPage |
| `/neighborhoods/:neighborhoodId` | NeighborhoodDetailPage |
| `/park-ridge` | CitywidePage |
| `/maps` | MapsPage |
| `/data-sources` | DataSourcesPage |

---

## Data Architecture

### Current State (Flat Files)

```
public/data/
  park_ridge_parcels_map.geojson       # 12,191 parcels, map fields only
  park_ridge_parcels_enriched.geojson  # Full enriched dataset (200+ fields/feature)
  park_ridge_boundary.geojson          # Municipal boundary
  parcel_details/{prefix}.json         # Full detail by 4-digit PIN prefix (13 files)
  historical/                          # Historical layer GeoJSON files
```

### Target State (Supabase)

See `supabase/migrations/001_initial_schema.sql` for the full schema.

Key tables:
- `properties` — one row per parcel, enriched fields
- `sales` — all recorded sales
- `assessments` — annual assessed values
- `permits` — all permit records (NO sample limits)
- `property_events` — unified timeline for a property
- `historic_survey_records` — Hargis survey data
- `ranked_insights` — cached rankings (updated on import)
- `ai_summaries` — cached AI-generated narratives with citations and source IDs

---

## ETL Pipeline

```
etl/
  run_etl.py              # CLI runner (python -m etl.run_etl --help)
  config/sources.py       # Source URLs, Supabase config, batch sizes
  loaders/
    properties.py         # GeoJSON → properties table
    permits.py            # Timeline events → permits table (NO sample limits)
  transforms/normalize.py # PIN normalization, address cleaning
  validators/properties.py# Record validation rules
  supabase/client.py      # Supabase client (service role, ETL only)
```

### Running the ETL

```bash
# Dry run — validate but do not write
python -m etl.run_etl --dry-run

# Load properties and permits (full dataset)
python -m etl.run_etl --loaders properties,permits

# Custom GeoJSON path
python -m etl.run_etl --geojson path/to/enriched.geojson
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in environment.
Without them, runs in `LOCAL_ONLY_MODE` (validates records, reports counts, does not write).

---

## Design System

Dark, glassy, premium. CSS custom properties in `src/styles/global.css`.

Key tokens:
```css
--bg: #04070f
--accent: #22d3ee        /* Primary cyan — properties, search */
```

Semantic accents:
- `#34d399` green — sales, positive trends
- `#fbbf24` amber — permits, warnings
- `#a78bfa` purple — assessments
- `#f87171` red — teardowns, critical
- `#60a5fa` blue — maps, blocks

---

## Deployment

Deployed on **Railway** via RAILPACK (Node 22).

```
Build:  npm run build  →  tsc && vite build
Serve:  npm start      →  node scripts/serve.mjs on $PORT
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Railway-provided | Server port (defaults to 4173) |
| `VITE_SUPABASE_URL` | Optional | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Optional | Supabase anon/public key |
| `SUPABASE_URL` | ETL only | Same, for ETL scripts |
| `SUPABASE_SERVICE_ROLE_KEY` | ETL only | Supabase service role key (NEVER in frontend) |

The app works without Supabase. It falls back to flat files in `public/data/`.

---

## Hierarchy

```
Park Ridge (citywide)
  └── Neighborhood (6 defined: Uptown, South Park, Northwest Park, Northeast Park, Southwest Woods, Southeast Park)
        └── Block (Census tabulation blocks, max 120 parcels)
              └── Property (12,191 parcels)
```

## Previous Architecture (v1)

See git history. v1 was a map-first single-page app with no router. The map was
the primary navigation model. The rebuild (this branch) moves to a page-first model
where the map is supporting context, not the entry point.
