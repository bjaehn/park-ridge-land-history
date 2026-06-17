-- Admin extensions: neighborhood improvements, neighborhood_subdivision_links,
-- parcel_change_events, and parcel_lineage_edges.
-- Also extends neighborhoods with additional metadata columns.

-- ─── 1. Extend neighborhoods table with missing columns ──────────────────────
ALTER TABLE neighborhoods
  ADD COLUMN IF NOT EXISTS slug               text UNIQUE,
  ADD COLUMN IF NOT EXISTS historical_summary text,
  ADD COLUMN IF NOT EXISTS established_year   integer,
  ADD COLUMN IF NOT EXISTS notes              text,
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz DEFAULT now();

-- ─── 2. neighborhood_subdivision_links ────────────────────────────────────────
-- neighborhoods.id is text (e.g., "neighborhood:uptown"), so FK is text
CREATE TABLE IF NOT EXISTS neighborhood_subdivision_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood_id   text NOT NULL REFERENCES neighborhoods (id) ON DELETE CASCADE,
  subdivision_id    uuid NOT NULL REFERENCES subdivisions   (id) ON DELETE CASCADE,
  relationship_type text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (neighborhood_id, subdivision_id)
);

CREATE INDEX IF NOT EXISTS nsl_neighborhood_idx ON neighborhood_subdivision_links (neighborhood_id);
CREATE INDEX IF NOT EXISTS nsl_subdivision_idx  ON neighborhood_subdivision_links (subdivision_id);

ALTER TABLE neighborhood_subdivision_links ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'neighborhood_subdivision_links' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON neighborhood_subdivision_links FOR SELECT USING (true);
  END IF;
END $$;

-- ─── 3. parcel_change_events ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcel_change_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       text NOT NULL CHECK (event_type IN (
                     'subdivision','consolidation','resubdivision',
                     'boundary_adj','creation','annexation','acquisition'
                   )),
  event_date       date,
  event_year       integer,
  date_precision   text NOT NULL DEFAULT 'unknown'
                     CHECK (date_precision IN ('exact','year','approximate','unknown')),
  description      text,
  plat_book        text,
  plat_page        text,
  document_number  text,
  confidence_level text NOT NULL DEFAULT 'unknown'
                     CHECK (confidence_level IN ('high','medium','low','unknown')),
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parcel_change_events_year_idx ON parcel_change_events (event_year);
CREATE INDEX IF NOT EXISTS parcel_change_events_type_idx ON parcel_change_events (event_type);

ALTER TABLE parcel_change_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'parcel_change_events' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON parcel_change_events FOR SELECT USING (true);
  END IF;
END $$;

-- ─── 4. parcel_lineage_edges ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcel_lineage_edges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_event_id uuid NOT NULL REFERENCES parcel_change_events (id) ON DELETE CASCADE,
  pin             text NOT NULL,
  side            text NOT NULL CHECK (side IN ('predecessor','successor')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parcel_lineage_event_idx ON parcel_lineage_edges (change_event_id);
CREATE INDEX IF NOT EXISTS parcel_lineage_pin_idx   ON parcel_lineage_edges (pin);

ALTER TABLE parcel_lineage_edges ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'parcel_lineage_edges' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON parcel_lineage_edges FOR SELECT USING (true);
  END IF;
END $$;
