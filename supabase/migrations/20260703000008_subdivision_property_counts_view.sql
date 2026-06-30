-- Fast per-subdivision property counts for the admin subdivisions list page.
-- total_properties : every PIN linked to the subdivision via PSL
-- deeded_properties: only those linked via deed_legal_description

CREATE OR REPLACE VIEW subdivision_property_counts AS
SELECT
  subdivision_id,
  COUNT(*)                                                               AS total_properties,
  COUNT(*) FILTER (WHERE match_method = 'deed_legal_description')       AS deeded_properties
FROM property_subdivision_links
GROUP BY subdivision_id;

GRANT SELECT ON subdivision_property_counts TO anon, authenticated;
