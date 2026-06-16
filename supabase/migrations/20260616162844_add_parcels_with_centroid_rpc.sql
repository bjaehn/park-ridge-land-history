-- RPC used by scripts/rematch_hargis_to_supabase.py to get parcel centroids.
-- Parcels table uses PostGIS geometry instead of lat/lng columns.

CREATE OR REPLACE FUNCTION parcels_with_centroid()
RETURNS TABLE (
  pin_normalized text,
  address        text,
  lat            double precision,
  lng            double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    pin_normalized,
    address,
    ST_Y(ST_Centroid(geometry)) AS lat,
    ST_X(ST_Centroid(geometry)) AS lng
  FROM parcels
  WHERE geometry IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION parcels_with_centroid() TO anon, authenticated;
