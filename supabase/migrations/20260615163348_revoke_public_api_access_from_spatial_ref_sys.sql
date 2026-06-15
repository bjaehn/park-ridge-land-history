-- Supabase system migration: restrict public read access to PostGIS reference table.
REVOKE SELECT ON public.spatial_ref_sys FROM anon, authenticated;
