-- Replace RETURNS TABLE with RETURNS json so PostgREST sees 1 row,
-- bypassing the server-side max-rows cap that was truncating to 1000.
-- DROP required because PostgreSQL cannot change a function's return type in-place.
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
      par.address AS address
    FROM permits p
    LEFT JOIN parcels par ON par.pin_normalized = p.pin
    ORDER BY p.date_issued DESC NULLS LAST
  ) t
$$;
