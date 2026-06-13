# Citywide Trends Page

## Overview

`/park-ridge` (`CitywidePage`) is the top-level analytics page. It provides a full-city view of housing stock, permit activity, sales trends, and development patterns.

## Data Flow

```
ParkRidgeDataContext
  ├─ parcels (all 12,191 features from map GeoJSON)
  └─ isLoading

decorated = decoratePermitPressure(parcels, 5)
  ├─ used for GrowthStoryPanel
  └─ passed to buildAreaSummaries for neighborhood summaries

neighborhoods = buildAreaSummaries(decorated, "neighborhoods", boundary)
blockSummaries = buildBlockSummaries(parcels.features)
```

All computations are memoized via `useMemo`.

## Sections

### Stats Bar

| Card | Value | Source |
|------|-------|--------|
| Total Properties | `parcels.features.length` | context |
| Identified Blocks | `blockSummaries.length` | computed |
| Development Span | oldest year built | parcel scan |
| With Permit Records | count with `permit_count > 0` | parcel scan |

### Growth Story Panel

`<GrowthStoryPanel entityType="city" features={decorated.features} entityName="Park Ridge" />`

This is the primary narrative element. It renders:
- A story headline and prose body (from `aggregateChangeStory`)
- Decade construction chart (bar chart by decade)
- Four growth stat boxes (median year built, new construction %, teardown pressure %, permits per property)
- Change signal distribution bars across all parcels

### City Map

`<ParcelMiniMap allParcels={parcels} boundary={boundary} height={360} />`

No highlight pins — shows the full city with all parcels in their default styling.

### Neighborhood Comparison

A `citywide-neighborhood-grid` showing all 7 neighborhoods as cards with:
- Accent color stripe
- Parcel count
- New build and teardown counts
- Links to `/neighborhoods/:id`

### Property Rankings

Six `RankedInsightCard` components in 2 rows of 3:

| Card | Ranking function |
|------|-----------------|
| Most Permit Activity | `topMostPermits` |
| Most Sales | `topMostSold` |
| Oldest Homes | `topOldestHomes` |
| Newest Builds | `topNewestHomes` |
| Largest Assessment Δ | `topLargestAssessmentChange` |
| Redevelopment Signal | `topMostRedevelopment` |

All use limit = 8 and source from all 12,191 parcels. Each item links to `/property/:pin`.

### Block Rankings

Two `RankedInsightCard` components showing city-wide block leaders:

| Card | Sort |
|------|------|
| Most Permit Activity (Blocks) | `avgPermits` desc |
| Most Redevelopment (Blocks) | `redevelopmentScore` desc |

Items link to `/blocks/:blockId`.

### Data Coverage

`<DataCoverageNotice>` listing all major data limitations:
- Permit records begin 2019
- Year-built known for ~70% of parcels
- Assessment change requires 2+ years
- Block boundaries are Census 2020 vintage

### AI Summary Placeholder

`<AISummaryPlaceholder entityType="city" entityName="Park Ridge" />`

See `docs/ai-summaries.md` for the full spec on how this will eventually be wired to Supabase.

## Performance Notes

`decoratePermitPressure` is O(n²) for the nearby-teardown lookup (checking within 250m radius). For 12,191 parcels this is acceptable in-browser (~50ms on modern hardware) but is a candidate for pre-computation in the ETL pipeline.

`buildBlockSummaries` and `buildAreaSummaries` each do a single O(n) pass over parcels and are fast. All three are memoized so they run only when `parcels` changes (i.e., once per page load).
