# Neighborhood Pages

## Overview

Two pages handle neighborhood-level exploration:

- **`/neighborhoods`** (`NeighborhoodsPage`) — directory of all neighborhoods with ranked comparisons
- **`/neighborhoods/:id`** (`NeighborhoodDetailPage`) — deep dive into a single neighborhood

## Neighborhood Definitions

Neighborhoods are defined in `src/lib/areaGroups.ts` using coordinate-based bounding polygons. They are **not** official Park Ridge municipal boundaries. There are 7 defined neighborhoods:

| ID | Label |
|----|-------|
| `uptown` | Uptown |
| `south_park` | South Park |
| `northwest_park` | Northwest Park |
| `northeast_park` | Northeast Park |
| `southwest_woods` | Southwest Woods |
| `southeast_park` | Southeast Park |
| `central_residential` | Central Residential |

`buildAreaSummaries(parcels, "neighborhoods", boundary)` assigns each parcel to a neighborhood and returns a `FeatureCollection<Polygon, AreaSummaryProperties>`.

### `AreaSummaryProperties` fields used

| Field | Description |
|-------|-------------|
| `id` | Neighborhood slug |
| `label` | Display name |
| `parcelCount` | Total parcels assigned to this neighborhood |
| `remodelCount` | Parcels with any permit pressure signal |
| `soldLastThreeYearsCount` | Parcels with a sale in the last 3 years |
| `newConstructionCount` | Parcels with `new_construction` pressure type |
| `teardownPressureCount` | Parcels with `direct_teardown` pressure type |
| `olderHomeCount` | Parcels with `year_built` ≤ 1945 |
| `signal` | Neighborhood-level signal: `quiet`, `watch`, `active`, `teardown_pressure` |
| `parcelPins` | Array of pin values for all parcels in this neighborhood |

## NeighborhoodsPage (`src/pages/NeighborhoodsPage.tsx`)

### Ranked Comparisons

Six `RankedInsightCard` components in a 3 + 3 grid:

| Card | Sort | Value label |
|------|------|-------------|
| Oldest Housing Stock | `oldestYear` asc | "Oldest: YYYY" |
| Newest Construction | `newestYear` desc | "Newest: YYYY" |
| Most Permit Activity | `remodelCount` desc | "N permit records" |
| Most Recent Sales | `soldLastThreeYearsCount` desc | "N sales (3yr)" |
| New Construction | `newConstructionCount` desc | "N new builds" |
| Teardown Pressure | `teardownPressureCount` desc | "N teardown signals" |

Year data (`oldestYear`, `newestYear`) is computed from a parcel scan in `neighborhoodYearStats` — they are not stored in `AreaSummaryProperties` by default.

### Neighborhood Cards Grid

All neighborhoods rendered as card links. Each card shows:
- Pre-1945 home percentage
- Permit coverage percentage
- Oldest home year (if known)
- Signal badge (`quiet` / `watch` / `active` / `teardown pressure`)
- New build count · teardown count footer

Color coding per neighborhood via `NEIGHBORHOOD_COLORS` map (also indexed by underscore ID for robustness).

## NeighborhoodDetailPage (`src/pages/NeighborhoodDetailPage.tsx`)

### URL pattern

```
/neighborhoods/:id
```

`id` matches the neighborhood slug (e.g. `southwest_woods`).

### Breadcrumb

```
Park Ridge > Neighborhoods > [Neighborhood Name]
```

### Page Sections

1. **Header** — neighborhood name, parcel count, signal badge
2. **Stats** — Properties, Development Span, Total Permits, Total Sales
3. **Main Layout** (two columns)
   - Left: `<GrowthStoryPanel entityType="neighborhood" />`
   - Right: `<ParcelMiniMap>` with neighborhood parcels highlighted
4. **Character Stats** — Pre-1945 Homes, New Construction, Teardown Pressure, Avg Assessment
5. **Property Rankings** — 6 ranked insight cards across 2 rows:
   - Most Permits, Most Sales, Oldest Homes
   - Newest Builds, Largest Assessment Δ, Redevelopment Signal
6. **Blocks in This Neighborhood** — ranked by permit activity and redevelopment score (2 cards)
7. **Data Coverage** — `<DataCoverageNotice>`
8. **AI Summary Placeholder** — `<AISummaryPlaceholder entityType="neighborhood">`

### Block Rankings Within Neighborhood

The page calls `buildBlockSummaries(neighborhoodFeatures)` on only the parcels in this neighborhood, producing neighborhood-scoped block rankings. This means "Most Permit-Active Block" shows the hottest block within the neighborhood, not the city.

### Map Highlighting

`ParcelMiniMap` receives a `highlightPins` Set derived from all parcels in the neighborhood. Parcels outside the neighborhood render in the base map color; highlighted parcels use the accent color.
