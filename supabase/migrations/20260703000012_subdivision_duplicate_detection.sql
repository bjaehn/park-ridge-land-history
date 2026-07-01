-- Duplicate subdivision detection + merge support.
--
-- Confirmed gap (Property Story Sprint, Priority 4): normalized_name has no
-- uniqueness enforcement and there was no tooling to find or merge duplicate
-- subdivision records (e.g. "Peeny and Meachem" vs "Penny & Meacham").
-- This migration adds fuzzy-match detection only. Merging is a manual,
-- admin-gated action (see mergeSubdivisions in app/admin/_actions/subdivisions.ts)
-- that soft-deprecates the losing record rather than deleting it.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Allow a 'deprecated' status so merged-away subdivisions stay in the table
-- (with all history intact) instead of being hard-deleted.
ALTER TABLE subdivisions DROP CONSTRAINT IF EXISTS subdivisions_status_check;
ALTER TABLE subdivisions
  ADD CONSTRAINT subdivisions_status_check
  CHECK (status IN ('verified','partially_verified','research_candidate','needs_manual_review','deprecated'));

ALTER TABLE subdivisions ADD COLUMN IF NOT EXISTS merged_into_id uuid REFERENCES subdivisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS subdivisions_normalized_name_trgm_idx
  ON subdivisions USING gin (normalized_name gin_trgm_ops);

-- Returns pairs of active (non-deprecated) subdivisions whose normalized
-- names or aliases are similar enough to plausibly be the same real-world
-- plat under different spellings. This is a candidate list for human review,
-- not an automatic merge -- similarity alone cannot tell "Park Ridge Manor"
-- apart from a genuinely distinct "Park Ridge Highlands", so every pair still
-- needs a person to confirm before merging.
CREATE OR REPLACE FUNCTION find_subdivision_duplicate_candidates(similarity_threshold real DEFAULT 0.45)
RETURNS TABLE (
  subdivision_a_id   uuid,
  subdivision_a_name text,
  subdivision_b_id   uuid,
  subdivision_b_name text,
  similarity_score   real,
  match_basis        text
)
LANGUAGE sql
STABLE
AS $$
  WITH name_pairs AS (
    SELECT
      a.id   AS subdivision_a_id,
      a.name AS subdivision_a_name,
      b.id   AS subdivision_b_id,
      b.name AS subdivision_b_name,
      similarity(a.normalized_name, b.normalized_name) AS similarity_score,
      'name'::text AS match_basis
    FROM subdivisions a
    JOIN subdivisions b ON a.id < b.id
    WHERE COALESCE(a.status, '') != 'deprecated'
      AND COALESCE(b.status, '') != 'deprecated'
      AND similarity(a.normalized_name, b.normalized_name) >= similarity_threshold
  ),
  alias_pairs AS (
    SELECT
      a.id   AS subdivision_a_id,
      a.name AS subdivision_a_name,
      b.id   AS subdivision_b_id,
      b.name AS subdivision_b_name,
      similarity(lower(al.alias), b.normalized_name) AS similarity_score,
      'alias'::text AS match_basis
    FROM subdivisions a
    JOIN subdivision_aliases al ON al.subdivision_id = a.id
    JOIN subdivisions b ON b.id != a.id
    WHERE COALESCE(a.status, '') != 'deprecated'
      AND COALESCE(b.status, '') != 'deprecated'
      AND similarity(lower(al.alias), b.normalized_name) >= similarity_threshold
  ),
  combined AS (
    SELECT * FROM name_pairs
    UNION ALL
    SELECT
      LEAST(subdivision_a_id, subdivision_b_id),
      CASE WHEN subdivision_a_id < subdivision_b_id THEN subdivision_a_name ELSE subdivision_b_name END,
      GREATEST(subdivision_a_id, subdivision_b_id),
      CASE WHEN subdivision_a_id < subdivision_b_id THEN subdivision_b_name ELSE subdivision_a_name END,
      similarity_score,
      match_basis
    FROM alias_pairs
    WHERE subdivision_a_id != subdivision_b_id
  )
  SELECT DISTINCT ON (subdivision_a_id, subdivision_b_id)
    subdivision_a_id, subdivision_a_name, subdivision_b_id, subdivision_b_name, similarity_score, match_basis
  FROM combined
  ORDER BY subdivision_a_id, subdivision_b_id, similarity_score DESC;
$$;

-- Reassigns every reference from `loser_id` to `winner_id`, then marks the
-- loser deprecated. Never deletes rows -- all history (aliases, links,
-- lineage records, facts, timeline events) is preserved and reattributed.
CREATE OR REPLACE FUNCTION merge_subdivisions(winner_id uuid, loser_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF winner_id = loser_id THEN
    RAISE EXCEPTION 'winner_id and loser_id must differ';
  END IF;

  UPDATE property_subdivision_links SET subdivision_id = winner_id WHERE subdivision_id = loser_id;
  UPDATE historical_subdivision_lineage SET child_subdivision_id = winner_id WHERE child_subdivision_id = loser_id;
  UPDATE historical_subdivision_lineage SET parent_subdivision_id = winner_id WHERE parent_subdivision_id = loser_id;
  UPDATE subdivisions SET parent_subdivision_id = winner_id WHERE parent_subdivision_id = loser_id;
  UPDATE subdivision_lots SET subdivision_id = winner_id WHERE subdivision_id = loser_id;
  UPDATE subdivision_timeline_events SET subdivision_id = winner_id WHERE subdivision_id = loser_id;
  UPDATE subdivision_sources SET subdivision_id = winner_id WHERE subdivision_id = loser_id;
  UPDATE subdivision_aliases SET subdivision_id = winner_id WHERE subdivision_id = loser_id;
  UPDATE subdivision_research_tasks SET subdivision_id = winner_id WHERE subdivision_id = loser_id;

  -- Preserve the loser's name as an alias on the winner if not already present.
  INSERT INTO subdivision_aliases (subdivision_id, alias, alias_type, confidence)
  SELECT winner_id, s.name, 'merged_duplicate', 'medium'
  FROM subdivisions s
  WHERE s.id = loser_id
    AND NOT EXISTS (
      SELECT 1 FROM subdivision_aliases WHERE subdivision_id = winner_id AND lower(alias) = lower(s.name)
    );

  UPDATE subdivisions
  SET status = 'deprecated', merged_into_id = winner_id, updated_at = now()
  WHERE id = loser_id;
END;
$$;
