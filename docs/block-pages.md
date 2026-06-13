# Block Pages

## Overview

Block-level pages let users explore Park Ridge one Census tabulation block at a time. Two pages handle this:

- **`/blocks`** (`BlocksPage`) — city-wide block directory with ranked summaries
- **`/blocks/:blockId`** (`BlockDetailPage`) — deep dive into a single block

## BlocksPage (`src/pages/BlocksPage.tsx`)

### Data Flow

```
ParkRidgeDataContext.parcels
  └─ buildBlockSummaries(features, minParcels=3)
       └─ BlockSummary[]
```

`buildBlockSummaries` groups parcels by `street_block_id`, computes aggregates, and returns only blocks with ≥ 3 parcels.

### Stats Bar

| Card | Source |
|------|--------|
| Identified Blocks | `blockSummaries.length` |
| Total Properties | `parcels.features.length` |
| Total Permit Records | sum of `permit_count` across all features |
| Total Sale Records | sum of `sale_count` across all features |

### Ranked Insight Cards

Six categories shown in a 3 + 3 grid:

| Card | Sort key | Direction |
|------|----------|-----------|
| Most Permit Activity | `avgPermits` | desc |
| Most Sales Activity | `avgSales` | desc |
| Redevelopment Signal | `redevelopmentScore` | desc |
| Oldest Housing Stock | `oldestYear` | asc |
| Newest Construction | `newestYear` | desc |
| Largest Assessment Δ | `avgAssessmentChange` | desc |

Each card item links to `/blocks/:blockId`.

### Block Search

A `<SearchBox>` at the top lets users type a street name or address; the existing search routing handles navigation to a matching property or block.

## BlockDetailPage (`src/pages/BlockDetailPage.tsx`)

### URL pattern

```
/blocks/:blockId
```

`blockId` is the raw `street_block_id` value (Census 15-digit GEOID), URL-encoded.

### Breadcrumb

```
Park Ridge > [Neighborhood] > Blocks > [Block Name]
```

Parent neighborhood is inferred by running `buildAreaSummaries()` on the block's subset of features and picking the neighborhood with the highest `parcelCount`.

### Block Name Derivation (`deriveBlockName`)

Parses the address field of each parcel, finds the dominant street by count, then formats a range: `100–198 Main St`. Falls back to the first parcel's formatted address.

### Page Sections

1. **Stats** — Properties, Development Span, Total Permits, Total Sales
2. **Growth Story** — `<GrowthStoryPanel entityType="block" />`
3. **Map + Ranked Properties** — two-column layout
   - Left: `<ParcelMiniMap>` with block parcels highlighted
   - Right: Most Permit Activity, Most Sales, Oldest Homes
4. **Extended Rankings** — Newest Builds, Largest Assessment Δ, Redevelopment Signal
5. **Property List** — all parcels in the block, sorted by street number
6. **Data Coverage** — `<DataCoverageNotice>`
7. **AI Summary Placeholder** — `<AISummaryPlaceholder entityType="block">`

### Property Cards

Each card shows: address, year built, permit count (amber), sale count (green), assessed value (purple). All link to `/property/:pin`.

## `blockSummaries.ts` (`src/lib/blockSummaries.ts`)

### `BlockSummary` type

```typescript
{
  blockId: string;
  label: string;          // human-readable block name
  parcelCount: number;
  totalPermits: number;
  totalSales: number;
  avgPermits: number;     // totalPermits / parcelCount
  avgSales: number;
  oldestYear: number | null;
  newestYear: number | null;
  avgAssessmentChange: number | null;  // mean assessed_value_change_pct
  redevelopmentScore: number;
}
```

### `buildBlockSummaries(features, minParcels = 3)`

Groups parcels by `street_block_id`. Computes aggregates from fields available in the map GeoJSON. Filters out blocks below `minParcels`.

### `blockSummariesToRanked(summaries, sortKey, valueLabel, secondaryLabel?, direction?, limit?)`

Sorts block summaries by a given key (defaulting to descending), slices to `limit` (default 8), and maps to `RankedProperty[]` so all existing `RankedInsightCard` components can render blocks without modification.
