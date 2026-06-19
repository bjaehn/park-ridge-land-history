CREATE OR REPLACE FUNCTION pins_bbox(pin_array text[])
RETURNS TABLE(min_lng double precision, min_lat double precision, max_lng double precision, max_lat double precision)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ST_XMin(ST_Extent(geometry))::double precision AS min_lng,
    ST_YMin(ST_Extent(geometry))::double precision AS min_lat,
    ST_XMax(ST_Extent(geometry))::double precision AS max_lng,
    ST_YMax(ST_Extent(geometry))::double precision AS max_lat
  FROM parcels
  WHERE pin_normalized = ANY(pin_array)
    AND geometry IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION pins_bbox(text[]) TO anon, authenticated;
