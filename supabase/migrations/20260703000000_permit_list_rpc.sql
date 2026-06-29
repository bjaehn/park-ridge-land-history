CREATE OR REPLACE FUNCTION permit_list()
RETURNS TABLE (
  id uuid,
  pin text,
  permit_number text,
  local_permit_number text,
  permit_type text,
  description text,
  status text,
  date_issued date,
  amount numeric,
  address text
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
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
$$;
