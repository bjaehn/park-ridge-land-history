-- Add neighborhood_name to permit_list() output by joining
-- the official_planning_neighborhood via parcels.
-- Drop required to change the output shape.

DROP FUNCTION IF EXISTS permit_list();
CREATE OR REPLACE FUNCTION permit_list()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT
      p.id,
      p.pin,
      p.permit_number,
      p.local_permit_number,
      p.permit_type,
      p.description,
      p.status,
      p.date_issued::date,
      NULLIF(p.raw_record->>'amount', '')::numeric AS amount,
      par.address                                   AS address,
      n.label                                       AS neighborhood_name
    FROM permits p
    LEFT JOIN parcels par ON par.pin_normalized = p.pin
    LEFT JOIN neighborhoods n
           ON n.id = par.official_planning_neighborhood_id
    ORDER BY p.date_issued DESC NULLS LAST
  ) t
$$;
