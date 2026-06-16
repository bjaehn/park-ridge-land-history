-- Extends subdivision tables with historical context.
-- Safe to re-run (uses IF NOT EXISTS).

-- ─── Extend subdivisions ──────────────────────────────────────────────────────

ALTER TABLE subdivisions
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS development_era_start_year integer,
  ADD COLUMN IF NOT EXISTS development_era_end_year integer,
  ADD COLUMN IF NOT EXISTS historical_summary text,
  ADD COLUMN IF NOT EXISTS status text
    CHECK (status IN ('verified','partially_verified','research_candidate','needs_manual_review'))
    DEFAULT 'research_candidate';

CREATE UNIQUE INDEX IF NOT EXISTS subdivisions_slug_idx
  ON subdivisions (slug)
  WHERE slug IS NOT NULL;

-- ─── Extend subdivision_sources ───────────────────────────────────────────────

ALTER TABLE subdivision_sources
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS author_or_publisher text,
  ADD COLUMN IF NOT EXISTS publication_name text,
  ADD COLUMN IF NOT EXISTS publication_date date,
  ADD COLUMN IF NOT EXISTS page_ref text,
  ADD COLUMN IF NOT EXISTS column_ref text,
  ADD COLUMN IF NOT EXISTS archive_location text,
  ADD COLUMN IF NOT EXISTS access_notes text,
  ADD COLUMN IF NOT EXISTS reliability_tier text
    CHECK (reliability_tier IN ('primary','official','secondary','tertiary','research_lead'))
    DEFAULT 'secondary',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS ss_source_key_idx
  ON subdivision_sources (source_key)
  WHERE source_key IS NOT NULL;

-- ─── Extend subdivision_timeline_events ──────────────────────────────────────

ALTER TABLE subdivision_timeline_events
  ADD COLUMN IF NOT EXISTS fact_type text,
  ADD COLUMN IF NOT EXISTS direct_quote text,
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES subdivision_sources(id),
  ADD COLUMN IF NOT EXISTS source_page text,
  ADD COLUMN IF NOT EXISTS source_column text,
  ADD COLUMN IF NOT EXISTS addresses_mentioned text[],
  ADD COLUMN IF NOT EXISTS streets_mentioned text[],
  ADD COLUMN IF NOT EXISTS lot_block_references text,
  ADD COLUMN IF NOT EXISTS pin_references text[],
  ADD COLUMN IF NOT EXISTS confidence_reason text,
  ADD COLUMN IF NOT EXISTS display_priority integer DEFAULT 50;

-- ─── Extend subdivision_geometries ───────────────────────────────────────────

ALTER TABLE subdivision_geometries
  ADD COLUMN IF NOT EXISTS geometry_confidence text
    CHECK (geometry_confidence IN ('high','medium','low','unknown'))
    DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS geometry_confidence_reason text,
  ADD COLUMN IF NOT EXISTS derived_from_parcel_ids text[],
  ADD COLUMN IF NOT EXISTS derived_from_addresses text[],
  ADD COLUMN IF NOT EXISTS derived_from_pins text[],
  ADD COLUMN IF NOT EXISTS visible_in_app boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by_human boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bbox jsonb;

-- ─── New table: subdivision_aliases ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subdivision_aliases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdivision_id uuid NOT NULL REFERENCES subdivisions(id) ON DELETE CASCADE,
  alias          text NOT NULL,
  alias_type     text,
  source_id      uuid REFERENCES subdivision_sources(id),
  confidence     text DEFAULT 'unknown'
    CHECK (confidence IN ('high','medium','low','unknown')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subdivision_aliases_unique_idx
  ON subdivision_aliases (subdivision_id, lower(alias));

CREATE INDEX IF NOT EXISTS subdivision_aliases_subdivision_id_idx
  ON subdivision_aliases (subdivision_id);

ALTER TABLE subdivision_aliases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subdivision_aliases' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON subdivision_aliases
      FOR SELECT USING (true);
  END IF;
END
$$;

-- ─── New table: subdivision_research_tasks ────────────────────────────────────

CREATE TABLE IF NOT EXISTS subdivision_research_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdivision_id      uuid REFERENCES subdivisions(id) ON DELETE SET NULL,
  search_query        text NOT NULL,
  target_archive      text,
  reason              text,
  expected_source_type text,
  status              text DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','abandoned')),
  priority            text DEFAULT 'medium'
    CHECK (priority IN ('high','medium','low')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS subdivision_research_tasks_subdivision_status_idx
  ON subdivision_research_tasks (subdivision_id, status);

CREATE INDEX IF NOT EXISTS subdivision_research_tasks_created_at_idx
  ON subdivision_research_tasks (created_at);

ALTER TABLE subdivision_research_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subdivision_research_tasks' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON subdivision_research_tasks
      FOR SELECT USING (true);
  END IF;
END
$$;
