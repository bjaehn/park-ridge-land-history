CREATE OR REPLACE FUNCTION public.subdivision_list_with_earliest_build()
RETURNS TABLE(id text, name text, normalized_name text, parcel_count integer, earliest_built integer)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    s.id,
    s.name,
    s.normalized_name,
    s.parcel_count,
    MIN(p.year_built)::integer AS earliest_built
  FROM subdivisions s
  LEFT JOIN property_subdivision_links psl ON psl.subdivision_id = s.id
  LEFT JOIN parcels p ON p.pin_normalized = psl.pin AND p.year_built IS NOT NULL
  GROUP BY s.id, s.name, s.normalized_name, s.parcel_count
  ORDER BY MIN(p.year_built) ASC NULLS LAST, s.name ASC;
$$;
