-- Same recurring drift class as 20260707000002: linked_parcel_count is
-- trigger-maintained (20260703000017) but had gone stale again for 4 rows
-- by the time the subdivisionQueries.test.ts regression test next ran:
--   Brickton: cached 2, real 3
--   David F. Cahill's Addition to Park Ridge: cached 5, real 6
--   Park Ridge Resubdivision of Blocks 1, 3, 4 and 5 in Brickton: cached 7, real 10
--   Penny and Meachem's Subdivision: cached 4, real 5
-- None of these were touched by 20260707000005/20260707000006 (those only
-- wrote to the subdivisions table itself, never to property_subdivision_links
-- / parcels / parcel_lot_relationships, which are what the trigger watches),
-- so this is pre-existing drift, not a regression from that work. Re-running
-- the existing refresh function across every subdivision resyncs the cache,
-- same fix as 20260707000002, in case other rows have drifted the same way.

DO $$
DECLARE
  sub_id uuid;
BEGIN
  FOR sub_id IN SELECT id FROM subdivisions LOOP
    PERFORM _refresh_subdivision_earliest_built(sub_id);
  END LOOP;
END;
$$;
