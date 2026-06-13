# Park Ridge Land History — Roadmap

## What's shipped (v2 rebuild)

- **10-page routed architecture** — Discover, Property, Search, Blocks, Neighborhoods, Neighborhood Detail, Citywide, Maps, Data Sources
- **ParkRidgeDataContext** — loads all 12,191 parcels once, shared across all pages
- **PropertyPage** — timeline, assessment chart, sales chart, permit chart, source drawer, citation badges, detail chunk loading
- **SearchBox** — full autocomplete with keyboard navigation, single-result direct routing
- **RankedInsightCard** — reusable ranked property lists (most sold, most permits, oldest, newest, largest assessment change)
- **Dark/glassy design system** — StatCard, AppShell, Header, all page layouts
- **Supabase schema** — `properties`, `sales`, `assessments`, `permits`, `property_events`, `historic_survey_records`, `ranked_insights`, `ai_summaries` (PostGIS + pg_trgm)
- **ETL pipeline** — GeoJSON → Supabase, all permit data, no sample limits, dry-run mode
- **Railway deployment** — RAILPACK Node 22, `npm run build` + `npm start`

---

## Phase 1 — Complete the page layer

### 1.1 BlockDetailPage
- Route: `/blocks/:blockId` exists but page is a stub
- Pattern: mirror NeighborhoodDetailPage
- Content: block header, 4 StatCards (parcel count, avg year built, permit activity, sales count), 3 RankedInsightCards scoped to that block, property list with links
- Data: filter `parcels.features` by `f.properties.street_block_id === blockId`

### 1.2 MapsPage — connect to real map view
- Currently lists layers from `historicalLayers` context with expand/collapse
- Add a MapLibre GL panel that activates when a ready layer is expanded
- Clicking a layer should show it on the city-level map
- Keep the "maps support stories, not primary navigation" philosophy

### 1.3 DiscoverPage — search refinement
- Add a "recently viewed" section (localStorage, last 5 properties)
- Add neighborhood quick-links below the ranked insights grid
- Consider a "random property" button for exploration

### 1.4 PropertyPage — fill remaining gaps
- **Historic survey section**: `historic_survey_record` from detail chunk; show Hargis survey data when present
- **Nearby properties**: filter parcels within same `street_block_id`, show as a short linked list
- **AI summary placeholder**: render a `glass-card` with "Summary coming soon" when Supabase is live but no summary exists yet — avoids jarring empty space

---

## Phase 2 — Activate Supabase

### 2.1 Environment setup
- Set in Railway: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Keep `SUPABASE_SERVICE_ROLE_KEY` out of the frontend (ETL only)
- App auto-detects: `isSupabaseConfigured` gates all Supabase queries

### 2.2 Run the ETL
```bash
# Full load
python -m etl.run_etl --loaders properties,permits

# Dry run first
python -m etl.run_etl --dry-run
```
- Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in environment
- ETL logs written to `etl/logs/`

### 2.3 Move queries to Supabase
- `ParkRidgeDataContext`: add Supabase path for parcel search (pg_trgm full-text)
- `PropertyPage`: load detail from `properties` + `permits` + `sales` tables instead of chunk files
- `RankedInsightCard` / rankings: pull from `ranked_insights` cache table instead of in-memory compute
- Keep flat-file fallback working throughout

### 2.4 Real-time ranked insights
- ETL populates `ranked_insights` table on each import run
- Frontend reads from table when Supabase is configured; falls back to in-memory rankings

---

## Phase 3 — AI summaries

Schema is ready (`ai_summaries` table). All rules from the original brief apply:

- Every claim must cite a source record
- No hallucination: if data is missing, say so explicitly
- Summaries are cached — never generated live on page load
- Fields: `pin`, `summary_markdown`, `source_ids[]`, `model_version`, `generated_at`, `confidence_score`

### 3.1 Generation pipeline
- Script: `etl/generators/ai_summaries.py`
- Reads from `properties` + `permits` + `sales` + `assessments` for a given PIN
- Calls Claude API with strict grounding prompt
- Writes to `ai_summaries` table
- Run after ETL: `python -m etl.generators.ai_summaries --pins all`

### 3.2 Frontend rendering
- `PropertyPage`: fetch summary from `ai_summaries` where `pin = :pin`
- Render `summary_markdown` in a `glass-card` with citation badges
- Show confidence score and generation date in footer
- If no summary: show placeholder, not an error

---

## Phase 4 — Performance and polish

### 4.1 Code splitting
- Current bundle: ~671 kB (warning threshold). Fine for now.
- When it matters: wrap each page in `React.lazy()` + `<Suspense>`
- Priority: PropertyPage (heaviest), CitywidePage (chart-heavy)

### 4.2 Search improvements
- SearchBox currently searches `address` and `pin` fields in memory
- With Supabase: switch to `properties` table full-text search using pg_trgm index
- Add search by owner name when that data is available

### 4.3 Property page deep links
- "View on map" link from PropertyPage → MapsPage with PIN pre-selected
- "View block" and "View neighborhood" breadcrumb links already exist; confirm routing

### 4.4 Data freshness
- Cook County updates parcel data periodically
- Add `last_updated` display to DataSourcesPage and PropertyPage source drawer
- ETL records `import_run_id` on each property row for provenance

---

## Data gaps to address (known)

| Gap | Impact | Fix |
|-----|--------|-----|
| ~30% of parcels have no `year_built` | Oldest/newest rankings are incomplete | Cross-reference Cook County building permits for construction year |
| Permit data limited to what Cook County published | Some older permits missing | Mark as "records may be incomplete before [year]" in UI |
| No owner name data | Can't search by owner | Cook County assessor has this — add to ETL when needed |
| `assessed_value_timeline` sparse for newer properties | Assessment chart shows gaps | Accept as-is; label chart axis "data as available" |
| `historic_survey_record` present on ~15% of parcels | Hargis survey section shows rarely | Expand survey data sourcing |

---

## Conventions to preserve

- **No hallucination**: every displayed fact must come from a source field in the data
- **Citation badges** on PropertyPage link to `SourceDrawer` which lists provenance
- **Supabase service role key** never in frontend code — ETL only
- **Flat-file fallback** always works — app is usable without Supabase
- **Route constants** from `src/lib/routes.ts` — never hardcode paths
- **Accent color semantics**: cyan=properties/search, green=sales, amber=permits, purple=assessments, red=teardowns, blue=maps/blocks
