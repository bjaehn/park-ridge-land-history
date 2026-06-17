CREATE OR REPLACE FUNCTION pin_prefix_bbox(p_prefix text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'minLng', ST_XMin(ST_Extent(geometry)),
    'minLat', ST_YMin(ST_Extent(geometry)),
    'maxLng', ST_XMax(ST_Extent(geometry)),
    'maxLat', ST_YMax(ST_Extent(geometry))
  )
  FROM parcels
  WHERE pin_normalized ILIKE (p_prefix || '%')
    AND geometry IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION pin_prefix_bbox(text) TO anon, authenticated;
