# Data Coverage

## Source Datasets

| Dataset | Source | Record count | Date range |
|---------|--------|--------------|------------|
| Parcel map GeoJSON | Cook County Assessor (via ETL) | ~12,191 parcels | Current assessment year |
| Permit records | Cook County Assessor Socrata API | Varies by parcel | 2019–present |
| Sale records | Cook County Recorder (via ETL) | Varies by parcel | ~1999–present |
| Assessment values | Cook County Assessor | Varies by parcel | Multi-year |
| Year built | Cook County Assessor | ~70% coverage | Historical |
| Census block IDs | U.S. Census TIGER/Line 2020 | All parcels | 2020 vintage |

## Field-Level Coverage

### `year_built` / `decade_built`
- Present for approximately 70% of parcels
- Ranges accepted by the application: 1800–2030 (values outside this range are ignored)
- Rankings that depend on year_built (`topOldestHomes`, `topNewestHomes`) filter to only parcels with known dates

### `permit_count` / `permit_pressure_type`
- Cook County Assessor's permit data begins **2019**
- Older permit activity (pre-2019) is not captured and cannot be inferred
- Parcels with zero permits may have had significant pre-2019 work
- Permit types: `direct_teardown`, `new_construction`, `addition`, `remodel`, `recent_permit`, `none`

### `sale_count` / `sale_price_*`
- Deed transfer records go back to approximately 1999
- Some very early sales may be missing
- `max_sale_price` and related fields are null when no sale occurred
- `soldLastThreeYearsCount` (used in neighborhood rankings) counts sales within the past 3 calendar years

### `assessed_value_change_pct`
- Requires at least two assessment years of data per parcel
- Parcels with only a single year of assessment data have a null change percentage
- Expressed as a decimal percentage (e.g., `0.12` = 12% increase)

### `latest_assessed_total`
- Reflects the most recent available assessment
- Null for parcels without assessment data (vacant lots, exempt properties)

### `street_block_id`
- Census TIGER/Line 2020 vintage block GEOID (15 digits)
- Present for parcels that have been spatially joined to Census blocks
- Parcels missing a `street_block_id` are not shown on the Blocks page

## DataCoverageNotice Component

`src/components/cards/DataCoverageNotice.tsx` renders a consistent amber-tinted notice card on pages where data limitations are material. Use it whenever:

- Permit data gaps could mislead (blocks page, block detail, property page)
- Year-built gaps affect ranking interpretation
- Block boundary quirks may be confusing

```tsx
<DataCoverageNotice
  message="Data coverage for this block:"
  items={[
    "Permit records from Cook County Assessor begin 2019.",
    "12 of 18 properties have a recorded year built.",
    "Census block boundaries follow street centerlines.",
  ]}
/>
```

## Neighborhood Boundaries

Neighborhood boundaries in this application are **coordinate-based approximations** defined in `src/lib/areaGroups.ts`. They:

- Are NOT official Park Ridge municipal neighborhood boundaries
- Are NOT the same as census tract or block group boundaries
- May assign a parcel differently than a resident's perceived neighborhood membership
- Are useful for comparative exploration but should not be cited as authoritative

## Block Boundaries

Block boundaries follow U.S. Census TIGER/Line 2020 tabulation block edges, which:

- Follow street centerlines
- May split what a resident considers "their block" across two Census blocks
- Are the same boundaries used by the Census Bureau for population counting
- Use the 15-digit GEOID format: `STATE(2) + COUNTY(3) + TRACT(6) + BLOCK(4)`

## ETL Pipeline

The ETL pipeline (not in this repository) joins Cook County datasets, computes derived fields, and outputs `park_ridge_parcels_map.geojson`. It runs on a scheduled basis; the `__BUILD_DATE__` constant embedded in the frontend reflects when the frontend was last built, not when the underlying data was last refreshed.

When Supabase is activated, a `last_etl_run` metadata row should be stored and surfaced in the UI.
