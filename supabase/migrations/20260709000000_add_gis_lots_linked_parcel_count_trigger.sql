-- Closes the recurring linked_parcel_count staleness bug (3 manual resyncs
-- so far: 20260707000002, 20260707000007, 20260707000020). Originally
-- scoped as: _refresh_subdivision_earliest_built (which also maintains
-- linked_parcel_count as of 20260703000017) is called by triggers on
-- property_subdivision_links, parcels, and parcel_lot_relationships -- but
-- not on gis_lots itself. A direct UPDATE gis_lots SET subdivision_id = ...
-- (as done in 20260707000019) bypasses all three existing triggers.
--
-- Live verification of the new gis_lots trigger surfaced a second, more
-- severe bug in the EXISTING _trg_psl_refresh_earliest_built (added
-- 20260703000003): its `IF OLD IS NOT NULL` / `IF NEW IS NOT NULL` checks
-- use row-level (composite-type) NULL semantics, which for a ROW value
-- means "ALL columns are null" -- not "this row exists". Every single row
-- in property_subdivision_links has at least one null column (328/328
-- checked live), so `OLD IS NOT NULL` and `NEW IS NOT NULL` evaluate FALSE
-- unconditionally, and this trigger has likely never actually fired its
-- refresh call since it was created. This is a probable root cause of the
-- recurring staleness bug, independent of (and larger than) the gis_lots
-- gap this migration originally set out to fix. _trg_parcel_refresh_earliest_built
-- and _trg_plr_refresh_earliest_built already use the safe column-level
-- pattern (checking OLD.subdivision_id / NEW.lot_id directly) and are not
-- affected.
--
-- Both the new gis_lots trigger and the pre-existing PSL trigger are fixed
-- here to use TG_OP + column-level NULL checks instead of row-level checks.

CREATE OR REPLACE FUNCTION _trg_gis_lots_refresh_earliest_built()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.subdivision_id IS NOT NULL THEN
    PERFORM _refresh_subdivision_earliest_built(OLD.subdivision_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.subdivision_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.subdivision_id IS DISTINCT FROM OLD.subdivision_id) THEN
    PERFORM _refresh_subdivision_earliest_built(NEW.subdivision_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_gis_lots_refresh_earliest_built ON gis_lots;
CREATE TRIGGER trg_gis_lots_refresh_earliest_built
AFTER INSERT OR UPDATE OR DELETE ON gis_lots
FOR EACH ROW EXECUTE FUNCTION _trg_gis_lots_refresh_earliest_built();

-- Fix the pre-existing PSL trigger's row-level NULL check bug (see above).
CREATE OR REPLACE FUNCTION _trg_psl_refresh_earliest_built()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.subdivision_id IS NOT NULL THEN
    PERFORM _refresh_subdivision_earliest_built(OLD.subdivision_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.subdivision_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.subdivision_id IS DISTINCT FROM OLD.subdivision_id) THEN
    PERFORM _refresh_subdivision_earliest_built(NEW.subdivision_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Pin search_path on all 5 related functions (function_search_path_mutable
-- security lint) while touching this code -- cheap hardening, not the root
-- cause of the above bug, but directly relevant to the functions this
-- migration modifies.
ALTER FUNCTION _refresh_subdivision_earliest_built(uuid) SET search_path = public;
ALTER FUNCTION _trg_parcel_refresh_earliest_built() SET search_path = public;
ALTER FUNCTION _trg_plr_refresh_earliest_built() SET search_path = public;

-- One-time backfill in case anything drifted before these fixes existed.
DO $$
DECLARE
  sub_id uuid;
BEGIN
  FOR sub_id IN SELECT id FROM subdivisions LOOP
    PERFORM _refresh_subdivision_earliest_built(sub_id);
  END LOOP;
END;
$$;
