-- Cook County Recorder of Deeds Plat Index
-- Stores entries from Section/Township/Range plat searches for T40N R12E (Park Ridge area).
-- Admin-only. Service role bypasses RLS; anon/authenticated are blocked.

CREATE TABLE IF NOT EXISTS recorder_plat_index (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  section_ref   text    NOT NULL,
  short_name    text    NOT NULL,
  full_name     text    NOT NULL,
  subdivision_id uuid   REFERENCES subdivisions(id) ON DELETE SET NULL,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (section_ref, short_name)
);

CREATE INDEX IF NOT EXISTS recorder_plat_index_short_name_idx   ON recorder_plat_index (short_name);
CREATE INDEX IF NOT EXISTS recorder_plat_index_subdivision_idx  ON recorder_plat_index (subdivision_id);
CREATE INDEX IF NOT EXISTS recorder_plat_index_section_idx      ON recorder_plat_index (section_ref);

ALTER TABLE recorder_plat_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recorder_plat_index_admin_only" ON recorder_plat_index;
CREATE POLICY "recorder_plat_index_admin_only" ON recorder_plat_index FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION recorder_plat_index_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS recorder_plat_index_updated_at ON recorder_plat_index;
CREATE TRIGGER recorder_plat_index_updated_at
  BEFORE UPDATE ON recorder_plat_index
  FOR EACH ROW EXECUTE FUNCTION recorder_plat_index_set_updated_at();
