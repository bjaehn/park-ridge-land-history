-- Returns the stored boundary polygon for a neighborhood as a GeoJSON FeatureCollection.
-- Used by /api/neighborhood-boundary to render boundary overlays on the public map.
CREATE OR REPLACE FUNCTION get_neighborhood_boundary_geojson(p_id text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    CASE
      WHEN n.geometry IS NULL THEN
        '{"type":"FeatureCollection","features":[]}'::json
      ELSE
        json_build_object(
          'type', 'FeatureCollection',
          'features', json_build_array(
            json_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(n.geometry)::json,
              'properties', json_build_object('id', n.id, 'label', n.label)
            )
          )
        )
    END
  FROM neighborhoods n
  WHERE n.id = p_id;
$$;

GRANT EXECUTE ON FUNCTION get_neighborhood_boundary_geojson(text) TO anon, authenticated;
