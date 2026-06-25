-- Draft migration: add optional extended fields to neighborhoods table.
--
-- All columns are nullable with no required defaults, so existing rows are
-- unaffected. Apply via the Supabase dashboard or CLI when ready.
-- Do NOT run this migration automatically.

ALTER TABLE neighborhoods
  ADD COLUMN IF NOT EXISTS short_description   text,
  ADD COLUMN IF NOT EXISTS boundary_source     text,
  ADD COLUMN IF NOT EXISTS boundary_confidence text
    CHECK (boundary_confidence IN ('high', 'medium', 'low', 'unknown')),
  ADD COLUMN IF NOT EXISTS review_status       text DEFAULT 'published'
    CHECK (review_status IN ('published', 'draft', 'needs_review'));

COMMENT ON COLUMN neighborhoods.short_description IS
  'One- or two-sentence summary shown in page headers and cards.';
COMMENT ON COLUMN neighborhoods.boundary_source IS
  'Description of where the boundary geometry came from, e.g. "City of Park Ridge planning GIS".';
COMMENT ON COLUMN neighborhoods.boundary_confidence IS
  'Confidence level for the boundary geometry: high, medium, low, or unknown.';
COMMENT ON COLUMN neighborhoods.review_status IS
  'Publication state. Published rows are visible on public pages; draft and needs_review rows are admin-only.';
