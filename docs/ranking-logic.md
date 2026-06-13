# Ranking Logic

All rankings are **deterministic formulas** computed from Cook County public records. No AI or inference is used in ranking calculations.

## Property-Level Rankings (`src/lib/rankings/index.ts`)

| Function | Metric | Filter |
|----------|--------|--------|
| `topMostSold` | `sale_count` descending | > 0 sales |
| `topMostPermits` | `permit_count` descending | > 0 permits |
| `topOldestHomes` | `year_built` ascending | 1800–1945 |
| `topNewestHomes` | `year_built` descending | 2000–present |
| `topLargestAssessmentChange` | `|assessed_value_change_pct|` descending | non-zero |
| `topLargestSalePriceChange` | `max_sale_price` descending | > 1 sale |
| `topHighestAssessment` | `latest_assessed_total` descending | > 0 |
| `topMostRedevelopment` | redevelopment score descending | score > 0 |

## Redevelopment Score Formula

```
score = permit_pressure_score
      + min(permit_count, 10)
      + min(sale_count, 5) × 0.5
      + nearby_teardown_bonus

permit_pressure_score:
  direct_teardown   → +20
  new_construction  → +15
  addition          → +8
  remodel           → +5
  recent_permit     → +3

nearby_teardown_bonus:
  nearby_teardown_count > 0 → +5
```

Score is computed per parcel. For blocks, sum across all parcels in the block.

## Block-Level Rankings (`src/lib/blockSummaries.ts`)

Block summaries aggregate parcel-level data. Minimum 3 parcels per block.

| Ranking | Metric |
|---------|--------|
| Oldest blocks | `oldestYear` ascending (min year_built in block) |
| Newest blocks | `newestYear` descending (max year_built in block) |
| Most permit activity | `avgPermits` descending (total permits / parcel count) |
| Most sales activity | `avgSales` descending (total sales / parcel count) |
| Largest assessment change | `avgAssessmentChange` descending (mean `assessed_value_change_pct`) |
| Most redevelopment | `redevelopmentScore` descending (sum of per-parcel scores) |

## Neighborhood-Level Rankings (`src/pages/NeighborhoodsPage.tsx`)

Neighborhood data comes from `buildAreaSummaries()` in `src/lib/areaGroups.ts`. Rankings use:

| Ranking | Source field |
|---------|-------------|
| Oldest neighborhoods | `oldestYear` from parcel year_built scan |
| Newest neighborhoods | `newestYear` from parcel year_built scan |
| Most permit activity | `remodelCount` (parcels with any permit pressure) |
| Most recent sales | `soldLastThreeYearsCount` |
| Most new construction | `newConstructionCount` |
| Most teardown pressure | `teardownPressureCount` |

## Data Limitations

- Permit data begins 2019 (Cook County Assessor Socrata).
- Year-built data is present for ~70% of parcels; rankings reflect only parcels with known dates.
- Assessment change requires at least two years of data per parcel.
- Block boundaries are Census TIGER/Line 2020 vintage tabulation blocks.
- Neighborhood boundaries are approximate coordinate-based definitions, not official designations.

## TODO: Supabase Migration

When Supabase is activated, rankings should be pre-computed by the ETL pipeline and stored in the `ranked_insights` table. The frontend should read from that table for city-level and neighborhood-level rankings, falling back to in-memory computation when Supabase is unavailable.
