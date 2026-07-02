-- RPCs powering the new map view on /admin/plat-mapping.
--
-- get_pins_for_gis_page_codes  -- PINs for one or more GIS page codes, used to
--   highlight a code cluster on the map (all parcels, not just unlinked
--   candidates -- mirrors the WHERE clause in bulkLinkParcelsByPageCodes()
--   minus the subdivision_id IS NULL restriction).
-- get_gis_page_codes_with_status -- extends get_park_ridge_gis_page_codes()
--   (20260627000004) with per-code linkage status so the map's code list can
--   show unlinked / partially linked / fully linked at a glance.

CREATE OR REPLACE FUNCTION get_pins_for_gis_page_codes(p_codes text[])
RETURNS TABLE(pin text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT pin_normalized
  FROM parcels
  WHERE municipality = 'CITY OF PARK RIDGE'
    AND subdivision_name = ANY (
      ARRAY(SELECT 'Assessor subdivision area ' || c FROM unnest(p_codes) AS c)
    );
$$;

CREATE OR REPLACE FUNCTION get_gis_page_codes_with_status()
RETURNS TABLE(
  code            text,
  cnt             bigint,
  linked_cnt      bigint,
  subdivision_id  uuid,
  subdivision_name text
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
    (array_agg(s.name) FILTER (WHERE p.subdivision_id IS NOT NULL))[1] AS subdivision_name
  FROM parcels p
  LEFT JOIN subdivisions s ON s.id = p.subdivision_id
  WHERE p.municipality = 'CITY OF PARK RIDGE'
    AND p.subdivision_name LIKE 'Assessor subdivision area %'
  GROUP BY p.subdivision_name
  ORDER BY code;
$$;
