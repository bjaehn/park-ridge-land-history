-- Legal description parse tracking (Property Story Sprint, Priority 3).
--
-- At only ~211 parcels with deed_notes on file (not the ~12,000 total Park
-- Ridge parcels), a full batch reprocess through the AI deed pipeline is
-- cheap and safe to run directly, unlike the earlier "12,000 parcels" scope
-- estimate in docs/property-story-sprint-followup.md (that number was the
-- total Park Ridge parcel count, not the deed-text count -- corrected here).
--
-- Adds the two genuinely missing pieces from the brief's 19-field taxonomy:
--   - quarter_section on historical_subdivision_lineage, alongside the
--     section/township/range/meridian columns that already exist there.
--   - deed_parse_results: one row per PIN tracking the PARSE JOB itself
--     (status, numeric confidence, notes) -- distinct from the existing
--     categorical confidence_level on each extracted fact/link, which
--     stays as-is. This is what parse_status/parse_notes/confidence_score
--     from the brief actually describe: the state of the parsing attempt,
--     not of any one extracted field.
--
-- Nothing here changes what's already published. Every row this backfill
-- produces goes in with parse_status = 'needs_review' -- an admin still
-- has to promote it, same as the existing AI deed-analysis review panel.

ALTER TABLE historical_subdivision_lineage ADD COLUMN IF NOT EXISTS quarter_section text;

CREATE TABLE IF NOT EXISTS deed_parse_results (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pin                     text        NOT NULL,
  parse_status            text        NOT NULL DEFAULT 'unparsed'
                          CHECK (parse_status IN ('unparsed', 'parsed', 'needs_review', 'rejected')),
  confidence_score        numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  parse_notes             text,
  subdivision_link_count  int         NOT NULL DEFAULT 0,
  lineage_record_count    int         NOT NULL DEFAULT 0,
  ai_model                text,
  parsed_at               timestamptz,
  reviewed                boolean     NOT NULL DEFAULT false,
  reviewed_at             timestamptz,
  reviewed_by             text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pin)
);

ALTER TABLE deed_parse_results ENABLE ROW LEVEL SECURITY;
-- Admin-only: no public or authenticated access (service_role bypasses RLS).
DROP POLICY IF EXISTS "admin_only" ON deed_parse_results;
CREATE POLICY "admin_only" ON deed_parse_results USING (false);

CREATE INDEX IF NOT EXISTS deed_parse_results_status_idx ON deed_parse_results (parse_status) WHERE NOT reviewed;

-- Surface unreviewed parses in the existing data quality report rather than
-- building a dedicated admin page for ~211 rows.
CREATE OR REPLACE FUNCTION data_quality_summary()
RETURNS TABLE (check_type text, label text, severity text, issue_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT 'missing_address', 'Missing address', 'medium',
    count(*) FROM parcels WHERE municipality = 'CITY OF PARK RIDGE' AND (address IS NULL OR btrim(address) = '')
  UNION ALL
  SELECT 'duplicate_pin', 'Duplicate PIN rows', 'high',
    count(*) FROM (
      SELECT pin_normalized FROM parcels WHERE pin_normalized IS NOT NULL
      GROUP BY pin_normalized HAVING count(*) > 1
    ) d
  UNION ALL
  SELECT 'no_subdivision_link', 'No subdivision link', 'low',
    count(*) FROM parcels p
    WHERE p.municipality = 'CITY OF PARK RIDGE'
      AND p.pin_normalized IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM property_subdivision_links l WHERE l.pin = p.pin_normalized)
  UNION ALL
  SELECT 'no_legal_description', 'No legal description on file', 'low',
    count(*) FROM parcels
    WHERE municipality = 'CITY OF PARK RIDGE' AND (deed_notes IS NULL OR btrim(deed_notes) = '')
  UNION ALL
  SELECT 'contradictory_year', 'Assessed before construction year', 'medium',
    count(*) FROM parcels
    WHERE municipality = 'CITY OF PARK RIDGE'
      AND year_built IS NOT NULL AND first_assessed_year IS NOT NULL
      AND first_assessed_year < year_built - 5
  UNION ALL
  SELECT 'implausible_year_built', 'Implausible year built', 'medium',
    count(*) FROM parcels
    WHERE municipality = 'CITY OF PARK RIDGE'
      AND year_built IS NOT NULL
      AND (year_built < 1830 OR year_built > date_part('year', now())::int + 1)
  UNION ALL
  SELECT 'permit_unmatched_pin', 'Permit with no matched PIN', 'medium',
    count(*) FROM permits WHERE pin IS NULL
  UNION ALL
  SELECT 'sale_orphaned_pin', 'Sale references a PIN with no parcel record', 'high',
    count(*) FROM (
      SELECT DISTINCT s.pin FROM sales s
      WHERE s.pin IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM parcels p WHERE p.pin_normalized = s.pin)
    ) o
  UNION ALL
  SELECT 'deed_parse_needs_review', 'AI deed parse awaiting review', 'low',
    count(*) FROM deed_parse_results WHERE parse_status = 'needs_review' AND NOT reviewed;
$$;

CREATE OR REPLACE FUNCTION data_quality_report(p_check_type text DEFAULT NULL, p_limit int DEFAULT 200)
RETURNS TABLE (
  check_type      text,
  entity_type     text,
  entity_id       text,
  problem         text,
  severity        text,
  suggested_fix   text,
  source_fields   text[]
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT
      'missing_address'::text AS check_type, 'parcel'::text AS entity_type, p.pin_normalized AS entity_id,
      'No address on file for a Park Ridge parcel'::text AS problem, 'medium'::text AS severity,
      'Backfill from Cook County GIS parcel centroid or a matching assessor record'::text AS suggested_fix,
      ARRAY['address']::text[] AS source_fields
    FROM parcels p
    WHERE p.municipality = 'CITY OF PARK RIDGE' AND (p.address IS NULL OR btrim(p.address) = '')

    UNION ALL
    SELECT 'duplicate_pin', 'parcel', p.pin_normalized,
      format('%s parcel rows share this PIN', count(*)), 'high',
      'Review import batches; keep the most recently imported row and remove the rest',
      ARRAY['pin_normalized']
    FROM parcels p
    WHERE p.pin_normalized IS NOT NULL
    GROUP BY p.pin_normalized
    HAVING count(*) > 1

    UNION ALL
    SELECT 'no_subdivision_link', 'parcel', p.pin_normalized,
      'No subdivision link (deed-based or spatial) found for this parcel'::text, 'low',
      'Already covered by the deed_research_queue pipeline; check queue status before re-researching'::text,
      ARRAY['pin_normalized']
    FROM parcels p
    WHERE p.municipality = 'CITY OF PARK RIDGE'
      AND p.pin_normalized IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM property_subdivision_links l WHERE l.pin = p.pin_normalized)

    UNION ALL
    SELECT 'no_legal_description', 'parcel', p.pin_normalized,
      'No deed legal description text on file'::text, 'low',
      'Pull deed from Cook County Recorder and run through the AI deed analysis workflow'::text,
      ARRAY['deed_notes']
    FROM parcels p
    WHERE p.municipality = 'CITY OF PARK RIDGE' AND (p.deed_notes IS NULL OR btrim(p.deed_notes) = '')

    UNION ALL
    SELECT 'contradictory_year', 'parcel', p.pin_normalized,
      format('First assessed %s but marked built in %s', p.first_assessed_year, p.year_built), 'medium',
      'Compare against deed-derived construction evidence; assessor year_built may be wrong'::text,
      ARRAY['year_built', 'first_assessed_year']
    FROM parcels p
    WHERE p.municipality = 'CITY OF PARK RIDGE'
      AND p.year_built IS NOT NULL AND p.first_assessed_year IS NOT NULL
      AND p.first_assessed_year < p.year_built - 5

    UNION ALL
    SELECT 'implausible_year_built', 'parcel', p.pin_normalized,
      format('year_built of %s is outside a plausible range', p.year_built), 'medium',
      'Check for a data entry or import error (e.g. 2-digit year overflow)'::text,
      ARRAY['year_built']
    FROM parcels p
    WHERE p.municipality = 'CITY OF PARK RIDGE'
      AND p.year_built IS NOT NULL
      AND (p.year_built < 1830 OR p.year_built > date_part('year', now())::int + 1)

    UNION ALL
    SELECT 'permit_unmatched_pin', 'permit', pm.id::text,
      format('Permit %s has no matched PIN', COALESCE(pm.local_permit_number, pm.permit_number, pm.id::text)), 'medium',
      'Re-run address/PIN matching for this permit batch'::text,
      ARRAY['pin']
    FROM permits pm
    WHERE pm.pin IS NULL

    UNION ALL
    SELECT 'sale_orphaned_pin', 'sale', s.pin,
      'Sale record references a PIN with no matching parcel'::text, 'high',
      'Check whether the parcel was removed or merged, or whether the sale PIN has a typo'::text,
      ARRAY['pin']
    FROM (SELECT DISTINCT pin FROM sales WHERE pin IS NOT NULL) s
    WHERE NOT EXISTS (SELECT 1 FROM parcels p WHERE p.pin_normalized = s.pin)

    UNION ALL
    SELECT 'deed_parse_needs_review', 'parcel', d.pin,
      format('AI deed parse (confidence %s) awaiting admin review', COALESCE(d.confidence_score::text, 'unknown')), 'low',
      'Review in Admin > Properties > this PIN''s deed analysis panel, then mark reviewed'::text,
      ARRAY['deed_notes']
    FROM deed_parse_results d
    WHERE d.parse_status = 'needs_review' AND NOT d.reviewed
  ) issues
  WHERE p_check_type IS NULL OR issues.check_type = p_check_type
  LIMIT p_limit;
END;
$$;
