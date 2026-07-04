-- linked_parcel_count (20260703000017) is trigger-maintained, but 3
-- subdivisions had drifted out of sync with the real 3-source union by the
-- time the previous migration's performance fix (20260707000001) let the
-- regression test actually finish instead of timing out:
--   Park Ridge Resubdivision of Blocks 1, 3, 4 and 5 in Brickton: cached 6, real 7
--   Brickton: cached 1, real 2
--   Resubdivision of Penny and Meachem's Subdivision: cached 7, real 9
-- Re-running the existing refresh function (unchanged logic) resyncs the
-- cache for every subdivision rather than special-casing these 3, in case
-- other rows have drifted the same way without yet being noticed.

DO $$
DECLARE
  sub_id uuid;
BEGIN
  FOR sub_id IN SELECT id FROM subdivisions LOOP
    PERFORM _refresh_subdivision_earliest_built(sub_id);
  END LOOP;
END;
$$;
