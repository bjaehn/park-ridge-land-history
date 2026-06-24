-- Aggregate function to return all GIS page codes used by Park Ridge parcels
-- with their parcel counts. Replaces a raw row fetch that hit PostgREST's
-- default 1000-row limit, causing some codes to silently disappear.

CREATE OR REPLACE FUNCTION get_park_ridge_gis_page_codes()
RETURNS TABLE(code text, cnt bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    replace(subdivision_name, 'Assessor subdivision area ', '') AS code,
    count(*)::bigint AS cnt
  FROM parcels
  WHERE municipality = 'CITY OF PARK RIDGE'
    AND subdivision_name LIKE 'Assessor subdivision area %'
  GROUP BY subdivision_name
  ORDER BY code;
$$;
