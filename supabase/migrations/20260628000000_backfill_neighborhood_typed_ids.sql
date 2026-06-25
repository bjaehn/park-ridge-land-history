-- Backfill the three typed neighborhood FK columns on parcels using geometry.
-- Calls assign_parcels_by_geometry() for each known official_planning neighborhood.
-- Skips silently if a neighborhood has no geometry saved yet.

DO $$
DECLARE
  nid text;
BEGIN
  FOR nid IN
    SELECT id FROM neighborhoods WHERE neighborhood_type = 'official_planning' AND geometry IS NOT NULL
  LOOP
    BEGIN
      PERFORM assign_parcels_by_geometry(nid);
    EXCEPTION WHEN OTHERS THEN
      -- skip neighborhoods without geometry
    END;
  END LOOP;
END;
$$;
