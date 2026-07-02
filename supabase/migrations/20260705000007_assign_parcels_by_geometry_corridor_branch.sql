-- Fixes assign_parcels_by_geometry() to branch on neighborhood_type = 'corridor'
-- (added in 20260705000003) using ST_Contains against parcels.corridor_id,
-- instead of falling through to the 'else' branch and overwriting
-- official_planning_neighborhood_id. This only matters for future manual
-- edits via the admin boundary map editor -- the 3 existing corridor rows
-- were populated directly by street-name match (20260705000004), not via
-- this RPC.
-- Safe to re-run (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.assign_parcels_by_geometry(p_neighborhood_id text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_geom geometry;
  v_type text;
  v_count integer := 0;
BEGIN
  SELECT geometry, neighborhood_type INTO v_geom, v_type
  FROM neighborhoods WHERE id = p_neighborhood_id;

  IF v_geom IS NULL THEN
    RAISE EXCEPTION 'No geometry saved for neighborhood %', p_neighborhood_id;
  END IF;

  IF v_type = 'business_district' THEN
    UPDATE parcels SET business_district_id = p_neighborhood_id
    WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  ELSIF v_type = 'local_market' THEN
    UPDATE parcels SET local_neighborhood_id = p_neighborhood_id
    WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  ELSIF v_type = 'corridor' THEN
    UPDATE parcels SET corridor_id = p_neighborhood_id
    WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  ELSE
    UPDATE parcels SET official_planning_neighborhood_id = p_neighborhood_id
    WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
