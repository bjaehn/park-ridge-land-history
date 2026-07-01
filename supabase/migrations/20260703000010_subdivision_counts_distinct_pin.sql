-- Use COUNT(DISTINCT pin) so the view is immune to any future duplicate PSL rows
-- for the same PIN+subdivision, keeping it consistent with fetchSubdivisionParcels
-- which deduplicates by PIN before counting.

CREATE OR REPLACE VIEW subdivision_property_counts AS
SELECT
  subdivision_id,
  COUNT(DISTINCT pin)                                                               AS total_properties,
  COUNT(DISTINCT pin) FILTER (WHERE match_method = 'deed_legal_description')       AS deeded_properties
FROM property_subdivision_links
GROUP BY subdivision_id;

GRANT SELECT ON subdivision_property_counts TO anon, authenticated;
