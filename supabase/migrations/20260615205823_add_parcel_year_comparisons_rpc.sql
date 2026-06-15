-- RPC for property detail page: compare this parcel's year_built against
-- median year_built on the same street, in the same neighborhood, and city-wide.

CREATE OR REPLACE FUNCTION parcel_year_comparisons(p_pin text)
RETURNS TABLE(
  scope         text,
  scope_label   text,
  property_year integer,
  median_year   numeric
) AS $$
DECLARE
  v_year         integer;
  v_street       text;
  v_neighborhood text;
BEGIN
  SELECT year_built, street_name_normalized, neighborhood_id
    INTO v_year, v_street, v_neighborhood
    FROM parcels
   WHERE pin_normalized = p_pin
   LIMIT 1;

  IF v_year IS NULL THEN RETURN; END IF;

  IF v_street IS NOT NULL THEN
    RETURN QUERY
    SELECT 'street'::text,
           'On this street'::text,
           v_year,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)
      FROM parcels
     WHERE street_name_normalized = v_street
       AND year_built IS NOT NULL;
  END IF;

  IF v_neighborhood IS NOT NULL THEN
    RETURN QUERY
    SELECT 'neighborhood'::text,
           'In this neighborhood'::text,
           v_year,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)
      FROM parcels
     WHERE neighborhood_id = v_neighborhood
       AND year_built IS NOT NULL;
  END IF;

  RETURN QUERY
  SELECT 'city'::text,
         'Across Park Ridge'::text,
         v_year,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY year_built)
    FROM parcels
   WHERE year_built IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;
