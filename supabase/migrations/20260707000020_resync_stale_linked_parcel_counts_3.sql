-- Same recurring drift class as 20260707000002 and 20260707000007:
-- linked_parcel_count is documented as "trigger-maintained" (CLAUDE.md),
-- but _refresh_subdivision_earliest_built (20260703000009) is actually a
-- manually-invoked function, not a real auto-firing SQL trigger -- nothing
-- calls it automatically when parcels.subdivision_id or gis_lots.subdivision_id
-- change directly. 20260707000018 and 20260707000019 (correcting the
-- Kinsey's Park Ridge / Talcott Road overlap) updated those columns via raw
-- UPDATE statements and never called the refresh function, so
-- subdivisionQueries.test.ts caught exactly the staleness those two prior
-- resync migrations existed to fix:
--   Kinsey's Talcott Road Subdivision: cached 49, real 50
--   Kinsey's Park Ridge Subdivision: cached 454, real 440
-- Re-running the refresh across every subdivision, matching the precedent
-- of both prior resync migrations, in case anything else has drifted too.

DO $$
DECLARE
  sub_id uuid;
BEGIN
  FOR sub_id IN SELECT id FROM subdivisions LOOP
    PERFORM _refresh_subdivision_earliest_built(sub_id);
  END LOOP;
END;
$$;
