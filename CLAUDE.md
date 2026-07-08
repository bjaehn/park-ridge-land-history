# Park Ridge Land History — Developer Notes

## Build Requirement

**Always run `npm run build` locally and confirm it passes before committing and pushing.** Fix any TypeScript or build errors before the commit. Never push broken builds.

## Page Content Order

All discovery pages (city, neighborhood, street, subdivision, PIN group) MUST follow this canonical section order. Omit sections with no data. Extra page-specific sections go in the most logical position within this hierarchy — never appended blindly to the bottom.

1. Breadcrumb
2. Page header (eyebrow · title · subtitle · badges · alias chips)
3. Introductory text / narrative / notes / historical summary
4. Contextual panels (e.g. SubdivisionHistoryPanel)
5. Stat grid
6. Map — always immediately after the stat grid
7. Price comparison (2015 vs. 2024)
8. Sales activity stat cards
9. Assessment snapshot
10. Charts — construction by decade first, then market history / home sales
11. Highlight reel
12. Sub-entity lists (streets, sections, blocks, property grids)
13. Source note


## UI Style Conventions

### Decade grouping
When grouping a list of items by construction decade, always use the shared
`<DecadeGroup>` component (`src/components/ui/DecadeGroup.tsx`), backed by
`src/lib/decadeGrouping.ts`'s `groupByDecade`/`groupByFixedBuckets`. Never
reimplement the header row or bucketing logic per page.

`<DecadeGroup>` owns:
- Outer container: `space-y-8`
- Header row: `flex items-center gap-3 mb-3` containing an era color dot
  (`getEraColor()` from `src/lib/mapConfig.ts`, always rendered, `"#64748b"`
  fallback), the decade label (`"1990s"`, or `"Unknown era"` for the unknown
  bucket — never bare `"Unknown"`), a horizontal rule, and the item count.
- Per-decade grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
- Decade key: `${Math.floor(year / 10) * 10}s`; sort chronological ascending,
  unknown always last. Does not collapse pre-1900 years into a combined
  bucket (that behavior is specific to the map legend's `formatDecade()`).

Callers supply `items`, `getYear`, `getKey`, and a `renderItem` card-rendering
callback (card shape varies too much across call sites — `meta` vs
`metaItems`, `UnresolvableEntityCard` fallback, etc. — to be owned by the
shared component). An optional `buckets` prop overrides the default
single-decade bucketing with a fixed multi-decade scheme, used by the streets
index (`app/streets/_StreetsContent.tsx`) for its 5-bucket era spans — treat
that as a documented, intentional exception, not something to "fix" back to
single-decade grouping.

### Teardown/rebuild badge
Properties with `is_teardown_rebuild = true` display a `<TeardownBadge>` (amber/flame).
- **Detection (medium)**: `year_built >= 1990 AND (year_built - first_assessed_year) >= 20`
- **Detection (high)**: permit `description` matches deconstruction/demolition of a residence, OR new single-family construction with new utility connections. Patterns: `ILIKE '%deconstruction%residence%'`, `ILIKE '%deconstruction%single family%'`, `ILIKE '%demolition%residence%'`, `ILIKE '%demolition%single family%'`, or (`ILIKE '%new%single family%'` AND `ILIKE '%new utility%'`). Applied via `20260630000001_teardown_permit_detection.sql`.
- **Badge component**: `src/components/ui/TeardownBadge.tsx` — pass `confidence` prop
- **EntityCard**: accepts `isTeardownRebuild` and `teardownConfidence` props; renders badge automatically
- **Property detail page**: badge shown alongside `ConfidenceBadge` in the vitals section
- **Subdivision page**: amber callout above the property grid when ≥ 1 teardown exists
- **Migrations**: `20260628000002_add_teardown_rebuild_flag.sql` adds columns; `20260630000001_teardown_permit_detection.sql` upgrades matched permits to `high`

### Neighborhood model (three-taxonomy)
The old `parcels.neighborhood_id` TEXT column is preserved but superseded by three typed FKs:
- `official_planning_neighborhood_id` — city planning districts (primary; use this for all RPCs)
- `business_district_id` — commercial zones (optional)
- `local_neighborhood_id` — informal/realtor names (optional)

New neighborhoods are assigned via `assign_parcels_by_geometry()` (admin function).
Legacy parcels are backfilled by migration `20260628000000_backfill_neighborhood_typed_ids.sql`.

### Subdivision → parcel linkage — always union all 3 sources
A parcel can be linked to a subdivision three different ways: deed research (`property_subdivision_links`), the direct admin-assigned FK (`parcels.subdivision_id`), or GIS-lot spatial matching (`parcel_lot_relationships` → `gis_lots`). **Any code that lists, counts, or maps a subdivision's parcels must union all three** — querying just one silently undercounts. This has broken three separate times (bulk-link filters, the public subdivision detail/index pages, `highlight_parcels`'s subdivision scope) from code written against only `property_subdivision_links`, the oldest and most familiar table.

The canonical source is the `get_linked_pins_for_subdivision(p_subdivision_id uuid)` RPC (`supabase/migrations/20260703000018_get_linked_pins_for_subdivision.sql`) — prefer calling it over re-deriving the union. `subdivisions.linked_parcel_count` (trigger-maintained) is the reference figure; if a displayed count doesn't match it for a given subdivision, that's the first thing to check. `subdivisions.parcel_count` is a legacy, deed-only-scoped column kept only for old admin writes — never read it for a user-facing count.

Where the union must be written inline as raw SQL (e.g. inside `highlight_parcels`'s dynamic `format()` scope clause), it must match:
```sql
(p.pin_normalized IN (SELECT psl.pin FROM property_subdivision_links psl WHERE psl.subdivision_id = %L::uuid)
 OR p.subdivision_id = %L::uuid
 OR p.pin_normalized IN (
   SELECT plr.pin_normalized FROM parcel_lot_relationships plr
   JOIN gis_lots gl ON gl.id = plr.lot_id
   WHERE gl.subdivision_id = %L::uuid
 ))
```
Always keep this in sync with `get_linked_pins_for_subdivision`.
