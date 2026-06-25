-- Generated boolean column so deed_notes presence is queryable without scanning text.
-- Auto-updates whenever deed_notes changes, zero maintenance required.
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS has_deed_notes boolean
  GENERATED ALWAYS AS (deed_notes IS NOT NULL AND deed_notes <> '') STORED;
