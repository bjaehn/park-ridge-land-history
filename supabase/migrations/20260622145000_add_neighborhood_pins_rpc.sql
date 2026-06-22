-- Returns all pin_normalized values for parcels belonging to a neighborhood,
-- using OR-union across all three neighborhood FK columns.
CREATE OR REPLACE FUNCTION public.neighborhood_pins(p_neighborhood_id text)
RETURNS TABLE(pin text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT pin_normalized
  FROM parcels
  WHERE official_planning_neighborhood_id = p_neighborhood_id
     OR business_district_id = p_neighborhood_id
     OR local_neighborhood_id = p_neighborhood_id;
$$;
