-- Adds subdivision-scoped equivalents of neighborhood_era_distribution() and
-- neighborhood_price_comparison() (see 20260621000001_update_neighborhood_rpcs.sql)
-- so the /subdivisions page can show its own "Era portrait" and "Median sale
-- price" sections scoped to subdivisions instead of reusing neighborhood data.
--
-- Parcel-to-subdivision linkage must union all three sources per CLAUDE.md
-- (deed research, direct FK, GIS-lot spatial match) -- the same union
-- get_linked_pins_for_subdivision() uses (20260703000018, perf-fixed in
-- 20260707000001). Centralized here as a view, subdivision_linked_pins, so
-- both new RPCs share one definition instead of each re-deriving the union
-- inline, keeping this in sync with get_linked_pins_for_subdivision per the
-- documented convention.

CREATE OR REPLACE VIEW subdivision_linked_pins AS
  SELECT psl.subdivision_id, psl.pin AS pin
  FROM property_subdivision_links psl

  UNION

  SELECT p.subdivision_id, p.pin_normalized AS pin
  FROM parcels p
  WHERE p.subdivision_id IS NOT NULL

  UNION

  SELECT gl.subdivision_id, plr.pin_normalized AS pin
  FROM parcel_lot_relationships plr
  JOIN gis_lots gl ON gl.id = plr.lot_id;

GRANT SELECT ON subdivision_linked_pins TO anon, authenticated;

-- ── subdivision_era_distribution() ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION subdivision_era_distribution()
RETURNS TABLE(subdivision_id uuid, era text, count integer)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    slp.subdivision_id,
    CASE
      WHEN p.year_built < 1920 THEN 'pre1920'
      WHEN p.year_built < 1946 THEN 'boom'
      WHEN p.year_built < 1980 THEN 'postwar'
      WHEN p.year_built < 2000 THEN 'eighties'
      WHEN p.year_built < 2010 THEN 'aughts'
      WHEN p.year_built < 2020 THEN 'teens'
      ELSE 'recent'
    END,
    COUNT(*)::integer
  FROM subdivision_linked_pins slp
  JOIN parcels p ON p.pin_normalized = slp.pin
  WHERE p.year_built IS NOT NULL
  GROUP BY slp.subdivision_id, 2
  ORDER BY slp.subdivision_id, 2;
$$;

GRANT EXECUTE ON FUNCTION subdivision_era_distribution() TO anon, authenticated;

-- ── subdivision_price_comparison() ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION subdivision_price_comparison()
RETURNS TABLE(subdivision_id uuid, year_2015 integer, year_2024 integer)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    sub.subdivision_id,
    MAX(sub.median_price) FILTER (WHERE sub.sale_year = 2015),
    MAX(sub.median_price) FILTER (WHERE sub.sale_year = 2024)
  FROM (
    SELECT
      slp.subdivision_id,
      s.sale_year,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.sale_price)::integer AS median_price
    FROM subdivision_linked_pins slp
    JOIN sales s ON s.pin = slp.pin
    WHERE s.is_market_sale = true
      AND s.sale_price BETWEEN 50000 AND 5000000
      AND s.sale_year IN (2015, 2024)
    GROUP BY slp.subdivision_id, s.sale_year
  ) sub
  GROUP BY sub.subdivision_id;
$$;

GRANT EXECUTE ON FUNCTION subdivision_price_comparison() TO anon, authenticated;
