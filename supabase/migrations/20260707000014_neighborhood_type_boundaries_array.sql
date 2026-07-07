-- Generalizes the two neighborhood-type-overview RPCs (20260707000013) from
-- a single p_type to a p_types array, since /neighborhoods needs to show
-- two groupings together (Corridor + Local/Market) on one map, unlike the
-- single-type /planning-districts and /business-districts pages.

DROP FUNCTION IF EXISTS get_neighborhood_type_boundaries_geojson(text);

CREATE OR REPLACE FUNCTION get_neighborhood_type_boundaries_geojson(p_types text[])
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(json_agg(
      json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(n.geometry)::json,
        'properties', json_build_object('id', n.id, 'label', n.label, 'slug', n.slug)
      )
    ) FILTER (WHERE n.geometry IS NOT NULL), '[]'::json)
  )
  FROM neighborhoods n
  WHERE n.neighborhood_type = ANY(p_types);
$$;

GRANT EXECUTE ON FUNCTION get_neighborhood_type_boundaries_geojson(text[]) TO anon, authenticated;

DROP FUNCTION IF EXISTS get_neighborhood_type_bbox(text);

CREATE OR REPLACE FUNCTION get_neighborhood_type_bbox(p_types text[])
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
  FROM neighborhoods
  WHERE neighborhood_type = ANY(p_types)
    AND geometry IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION get_neighborhood_type_bbox(text[]) TO anon, authenticated;
