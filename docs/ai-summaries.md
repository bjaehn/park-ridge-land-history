# AI Summaries

## Current State

AI narrative summaries are not yet active. Every page that will eventually show an AI summary currently renders an `<AISummaryPlaceholder>` component instead.

## AISummaryPlaceholder (`src/components/cards/AISummaryPlaceholder.tsx`)

The placeholder shows:
- A "Narrative summary" section header with a Sparkles icon
- A short description of what will appear ("A plain-English summary of this [block/neighborhood/city]'s development story…")
- A faint "Coming soon" badge

This keeps the UI slot visible in the layout so pages don't need structural changes when summaries are activated.

## Planned Architecture

### Data Model

Summaries will be stored in a Supabase table:

```sql
CREATE TABLE ai_summaries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,   -- 'property' | 'block' | 'neighborhood' | 'city'
  entity_id   text NOT NULL,   -- PIN, block GEOID, neighborhood slug, 'park-ridge'
  summary     text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model       text,            -- model identifier used for generation
  UNIQUE (entity_type, entity_id)
);
```

### ETL Generation

Summaries are generated offline by the ETL pipeline (never in the browser):

1. Pull aggregated stats per entity from Supabase views
2. Construct a structured prompt using only deterministic data fields
3. Call the LLM API
4. `UPSERT` into `ai_summaries` with the model identifier

**Security note:** The ETL pipeline uses `SUPABASE_SERVICE_ROLE_KEY` to write summaries. This key must never appear in frontend code or be committed to the repository.

### Frontend Integration

Replace `<AISummaryPlaceholder>` with an `<AISummary>` component that:

```typescript
// Pseudocode — not yet implemented
const { data } = useSupabase()
  .from("ai_summaries")
  .select("summary, generated_at")
  .eq("entity_type", entityType)
  .eq("entity_id", entityId)
  .single();
```

Use the public anon key (safe for frontend) with Row Level Security set to `SELECT` only.

### Fallback Behavior

If Supabase is unavailable or the row doesn't exist, fall back to the placeholder. The flat-file dataset path must continue to work without any Supabase configuration.

## Entity ID Conventions

| Entity type | `entity_id` value |
|-------------|-------------------|
| `property` | PIN (14-digit, no dashes) |
| `block` | Census GEOID (15-digit `street_block_id`) |
| `neighborhood` | Neighborhood slug (e.g. `southwest_woods`) |
| `city` | `"park-ridge"` |

## What AI Summaries Should NOT Do

- Claim specific facts not derivable from the source data fields provided to the prompt
- Reference the model name or generation process in the output text
- Use hedging language about data quality (the `<DataCoverageNotice>` component handles that separately)
- Speculate about future development trends — summaries describe the historical record only
