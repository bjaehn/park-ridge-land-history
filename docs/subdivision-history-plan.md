# Subdivision Historical Context — Architecture Plan

## 1. Architecture Overview

### Tables extended (via migration 20260616120000)

| Table | Columns added |
|---|---|
| `subdivisions` | `display_name`, `slug`, `development_era_start_year`, `development_era_end_year`, `historical_summary`, `status` |
| `subdivision_sources` | `source_key`, `title`, `author_or_publisher`, `publication_name`, `publication_date`, `page_ref`, `column_ref`, `archive_location`, `access_notes`, `reliability_tier`, `created_at`, `updated_at` |
| `subdivision_timeline_events` | `fact_type`, `direct_quote`, `source_id` (FK→sources), `source_page`, `source_column`, `addresses_mentioned`, `streets_mentioned`, `lot_block_references`, `pin_references`, `confidence_reason`, `display_priority` |
| `subdivision_geometries` | `geometry_confidence`, `geometry_confidence_reason`, `derived_from_parcel_ids`, `derived_from_addresses`, `derived_from_pins`, `visible_in_app`, `reviewed_by_human`, `bbox` |

### New tables

- **`subdivision_aliases`** — alternate names and local nicknames for each subdivision, with typed alias_type and per-alias confidence.
- **`subdivision_research_tasks`** — structured research queue entries (search query + archive + reason + priority).

### New migration (20260616130000)

Defines the `generate_subdivision_polygon(uuid, text[])` stored procedure used by the polygon generation script.

---

## 2. Confidence Model

### Fact confidence (subdivision_timeline_events.confidence_level)

| Level | Meaning |
|---|---|
| `high` | Fact directly stated in an official primary source (city record, Cook County recorder document). |
| `medium` | Fact supported by a reliable secondary source (newspaper, digitized book), but not yet cross-verified. |
| `low` | Research lead: fact mentioned without full citation, or source page/column not yet extracted. Do not display in public UI without upgrading to medium. |
| `unknown` | Source unknown. |

### Geometry confidence (subdivision_geometries.geometry_confidence)

| Level | Criteria |
|---|---|
| `high` | Boundary traced from original recorded plat. Reviewed by human. |
| `medium` | Dissolved from ≥10 matched parcel geometries. |
| `low` | Dissolved from 3–9 matched parcel geometries. |
| `unknown` | Fewer than 3 parcels matched or method undetermined. |

Only geometries with `visible_in_app = true` are shown on the map. The polygon generation script sets this automatically when parcel count ≥ 10.

---

## 3. How to Add New Newspaper Findings

When a newspaper article or legal notice is found at the Park Ridge Public Library archive:

1. **Create a source record** in `subdivision_sources`:
   - Set `source_type = 'newspaper'`
   - Set `reliability_tier = 'secondary'`
   - Set `publication_name`, `publication_date`, `page_ref`, `column_ref`
   - Set `source_name = title`

2. **Create a fact** in `subdivision_timeline_events`:
   - Set `fact_type` (e.g. `plat_recorded`, `lots_for_sale`, `infrastructure_petition`)
   - Set `source_id` pointing to the source record created above
   - Set `source_page` and `source_column` from the physical newspaper
   - Set `confidence_level = 'medium'` (newspaper) or `'high'` (if also confirmed by official record)
   - Set `direct_quote` if the article contains a verbatim statement worth preserving
   - Set `display_priority` (lower = shown first; default 50)

3. **Update subdivision status** if appropriate:
   - `research_candidate` → `partially_verified` once recording date or plat boundary is confirmed from any source
   - `partially_verified` → `verified` only when official plat document is confirmed and geometry is reviewed

4. **Mark the research task complete**: update the corresponding `subdivision_research_tasks` row to `status = 'completed'` and set `completed_at`.

---

## 4. How to Run Seed Scripts

```bash
# 1. Apply migrations first (in Supabase dashboard or CLI)
supabase db push

# 2. Seed sources (idempotent)
python scripts/seed_subdivision_sources.py

# 3. Seed subdivision candidates (idempotent)
python scripts/seed_subdivision_candidates.py

# 4. Generate polygons (requires parcels loaded)
python scripts/generate_subdivision_polygons.py --dry-run   # preview
python scripts/generate_subdivision_polygons.py              # run
```

All scripts require `VITE_SUPABASE_URL` and either `SUPABASE_SERVICE_ROLE_KEY` or `VITE_SUPABASE_ANON_KEY` in `.env.local`.

---

## 5. Polygon Generation Notes

- The `generate_subdivision_polygon` RPC dissolves parcel geometries matched by name (ILIKE against `parcels.subdivision_name`), plus any links in `property_subdivision_links`.
- Polygons are only created when ≥ 3 parcels match. Fewer matches are logged as skipped.
- `visible_in_app` is set to `true` automatically when ≥ 10 parcels match. All others require manual review and human sign-off (`reviewed_by_human = true`) before being shown on the map.
- Parcel-based polygons are approximate. They include roads and easements within the dissolved hull. Boundary accuracy improves when more parcels are matched.
- Re-running the script updates existing geometry records rather than creating duplicates.

---

## 6. Known Limitations and Research Needs

- **Dale, Gustin and Wallace Addition (1873)**: Plat recorded and Cook County document number confirmed. Block 1 geometry not yet derived; awaits parcel name match or manual boundary tracing from plat book.
- **L. Hodge's Addition / The Pretzel**: Platting date and original developer not yet identified. Awaiting results of the IHPA intensive historic survey contracted by the City.
- **Root Subdivision**: Book reference not yet verified with exact page number. Do not display the church lot fact in the public UI until page citation is extracted.
- **Feuerborn and Klode's Ridgewood Park**: Document number in source OCR is ambiguous (`8737h25`). Requires manual verification at Cook County Recorder before displaying publicly.
- **All research_candidate subdivisions**: No geometry exists. Names come from a single source each. Plat records have not been located.
- **Park Ridge Public Library newspaper archive**: Key tool for upgrading research_candidates to partially_verified. Searchable only in-library. Coverage gaps exist before 1929 and 1936.

---

## 7. Source Citation Format for Public Display

Citations rendered in the UI should use this pattern:

```
[Source title] · [Author or publisher] · [Publication date] · p.[page_ref], col.[column_ref]
```

Omit any field that is null. If `source_url` is present, link the source title. If not, show `[archive_location]` in brackets.

For official city records (Granicus links): show title and publisher only; the URL serves as the persistent citation.

For book sources (e.g., History of Park Ridge 1841–1926): always include page number before public display. Facts without a page number should have `confidence_level = 'low'`.

**Never display a fact with `confidence_level = 'low'` in the main public UI without a research caveat.** The `SubdivisionHistoryPanel` shows all facts regardless of confidence level, with the confidence dot as a visual indicator.
