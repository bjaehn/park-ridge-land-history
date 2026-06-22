-- Fix: clear previous assignments before assigning from boundary.
-- Previously the UPDATE only wrote new rows inside the boundary but never
-- cleared parcels that were outside it, leaving stale assignments behind.
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
    UPDATE parcels SET business_district_id = NULL
      WHERE business_district_id = p_neighborhood_id;
    UPDATE parcels SET business_district_id = p_neighborhood_id
      WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  ELSIF v_type = 'local_market' THEN
    UPDATE parcels SET local_neighborhood_id = NULL
      WHERE local_neighborhood_id = p_neighborhood_id;
    UPDATE parcels SET local_neighborhood_id = p_neighborhood_id
      WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  ELSE
    UPDATE parcels SET official_planning_neighborhood_id = NULL
      WHERE official_planning_neighborhood_id = p_neighborhood_id;
    UPDATE parcels SET official_planning_neighborhood_id = p_neighborhood_id
      WHERE ST_Contains(v_geom, ST_Centroid(parcels.geometry));
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
