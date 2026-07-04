-- get_linked_pins_for_subdivision (20260703000018) filtered a full scan of
-- `parcels` (~13k rows) through three OR'd IN-subqueries. Postgres can't use
-- an index for that shape, so every call did a sequential scan -- ~3.7s even
-- for a subdivision with 7 linked parcels, confirmed via EXPLAIN ANALYZE.
-- The regression test in subdivisionQueries.test.ts calls this RPC once per
-- subdivision in the whole dataset, so it was one slow moment away from
-- tripping Postgres's statement_timeout, which is exactly what happened in
-- CI (57014 on "Resubdivision of Penny and Meachem's Subdivision").
--
-- Rewritten as a UNION of three independently-indexed lookups (each source
-- table filtered by subdivision_id first, then joined back to parcels by its
-- primary key) instead of filtering the whole parcels table by three ORs.
-- Verified identical output against the live data for every affected
-- subdivision, including the largest (Kinsey's Park Ridge Subdivision, 396
-- pins both ways). Execution time for the previously-timing-out subdivision
-- dropped from ~3.7s to ~2.5ms. UNION (not UNION ALL) preserves the existing
-- de-duplication guarantee.

CREATE OR REPLACE FUNCTION get_linked_pins_for_subdivision(p_subdivision_id uuid)
RETURNS TABLE (pin text)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT p.pin_normalized AS pin
  FROM parcels p
  JOIN property_subdivision_links psl ON psl.pin = p.pin_normalized
  WHERE psl.subdivision_id = p_subdivision_id

  UNION

  SELECT p.pin_normalized AS pin
  FROM parcels p
  WHERE p.subdivision_id = p_subdivision_id

  UNION

  SELECT p.pin_normalized AS pin
  FROM parcels p
  JOIN parcel_lot_relationships plr ON plr.pin_normalized = p.pin_normalized
  JOIN gis_lots gl ON gl.id = plr.lot_id
  WHERE gl.subdivision_id = p_subdivision_id;
$$;
