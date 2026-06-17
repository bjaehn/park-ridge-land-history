-- RPCs to compute bounding boxes for street and neighborhood map scopes.
-- Used by MapView to fitBounds() instead of defaulting to city center.

CREATE OR REPLACE FUNCTION street_bbox(p_street_name text)
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
  WHERE street_name_normalized = p_street_name
    AND geometry IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION street_bbox(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION neighborhood_bbox(p_neighborhood_id text)
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
  WHERE neighborhood_id = p_neighborhood_id
    AND geometry IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION neighborhood_bbox(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION block_bbox(p_block_id text)
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
  WHERE street_block_id = p_block_id
    AND geometry IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION block_bbox(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION section_bbox(p_section_id text)
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
  WHERE LEFT(street_block_id, 4) = p_section_id
    AND geometry IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION section_bbox(text) TO anon, authenticated;
