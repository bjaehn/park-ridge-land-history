-- Fixes a silent-data-loss bug in get_gis_page_codes_with_status()
-- (20260704000001_plat_section_map_rpcs.sql): when a single GIS page code's
-- parcels end up split across MORE THAN ONE subdivision (e.g. from an
-- admin's earlier bulk-link mistake), the function picks an arbitrary
-- `(array_agg(...))[1]` subdivision_id/name and silently hides the rest --
-- the /admin/plat-mapping "Browse all GIS codes manually" list then shows
-- one name as if it were authoritative, with no indication the code is
-- actually contested.
--
-- Adds distinct_subdivision_cnt so the UI can flag a split instead of hiding
-- it, plus a new on-demand drill-down RPC for the rare case an admin needs
-- to see exactly which subdivisions hold a contested code's parcels.

-- Adding a new output column changes the function's row type, which Postgres
-- won't let CREATE OR REPLACE do in place.
DROP FUNCTION IF EXISTS get_gis_page_codes_with_status();

CREATE FUNCTION get_gis_page_codes_with_status()
RETURNS TABLE(
  code            text,
  cnt             bigint,
  linked_cnt      bigint,
  subdivision_id  uuid,
  subdivision_name text,
  distinct_subdivision_cnt bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    replace(p.subdivision_name, 'Assessor subdivision area ', '') AS code,
    count(*)::bigint AS cnt,
    count(*) FILTER (WHERE p.subdivision_id IS NOT NULL)::bigint AS linked_cnt,
    (array_agg(p.subdivision_id) FILTER (WHERE p.subdivision_id IS NOT NULL))[1] AS subdivision_id,
    (array_agg(s.name) FILTER (WHERE p.subdivision_id IS NOT NULL))[1] AS subdivision_name,
    count(DISTINCT p.subdivision_id) FILTER (WHERE p.subdivision_id IS NOT NULL)::bigint AS distinct_subdivision_cnt
  FROM parcels p
  LEFT JOIN subdivisions s ON s.id = p.subdivision_id
  WHERE p.municipality = 'CITY OF PARK RIDGE'
    AND p.subdivision_name LIKE 'Assessor subdivision area %'
  GROUP BY p.subdivision_name
  ORDER BY code;
$$;

CREATE OR REPLACE FUNCTION get_gis_page_code_subdivision_breakdown(p_code text)
RETURNS TABLE(
  subdivision_id   uuid,
  subdivision_name text,
  cnt              bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    p.subdivision_id,
    s.name AS subdivision_name,
    count(*)::bigint AS cnt
  FROM parcels p
  LEFT JOIN subdivisions s ON s.id = p.subdivision_id
  WHERE p.municipality = 'CITY OF PARK RIDGE'
    AND p.subdivision_name = 'Assessor subdivision area ' || p_code
    AND p.subdivision_id IS NOT NULL
  GROUP BY p.subdivision_id, s.name
  ORDER BY cnt DESC;
$$;
