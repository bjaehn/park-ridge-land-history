-- Ranks candidate GIS page codes for a subdivision so an admin doesn't have
-- to click through ~666 opaque codes manually.
--
-- Primary signal: direct evidence. A subdivision's already deed-verified
-- parcels (property_subdivision_links) each carry their own GIS page code
-- in parcels.subdivision_name -- tallying those codes cross-references two
-- systems of record that have never been joined before, and is far more
-- reliable than geometric distance (tested against Kinsey's Park Ridge
-- Subdivision: centroid distance ranked the correct codes 1202G_A/1202H_A
-- outside the top 10, while direct evidence found them immediately as the
-- codes 32 and 20 of its 57 coded deed-verified parcels actually carry).
--
-- Secondary signal: spatial proximity (centroid distance), used only to
-- fill remaining slots for codes with no direct evidence, and only when
-- the subdivision has at least one deed-verified parcel with geometry to
-- anchor from. Subdivisions with zero deed-verified parcels return nothing
-- -- there's no ground truth yet to suggest from.

CREATE OR REPLACE FUNCTION suggest_gis_page_codes_for_subdivision(
  p_subdivision_id uuid,
  p_limit          int DEFAULT 8
)
RETURNS TABLE(
  code            text,
  cnt             bigint,
  match_type      text,
  evidence_count  bigint,
  evidence_total  bigint,
  distance_m      numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH evidence AS (
    SELECT
      replace(p.subdivision_name, 'Assessor subdivision area ', '') AS code,
      count(*) AS evidence_count
    FROM property_subdivision_links psl
    JOIN parcels p ON p.pin_normalized = psl.pin
    WHERE psl.subdivision_id = p_subdivision_id
      AND p.subdivision_name LIKE 'Assessor subdivision area %'
    GROUP BY 1
  ),
  evidence_total AS (
    SELECT COALESCE(sum(evidence_count), 0)::bigint AS total FROM evidence
  ),
  anchor AS (
    SELECT ST_Centroid(ST_Collect(p.geometry)) AS geom
    FROM property_subdivision_links psl
    JOIN parcels p ON p.pin_normalized = psl.pin
    WHERE psl.subdivision_id = p_subdivision_id
      AND p.geometry IS NOT NULL
  ),
  codes AS (
    SELECT
      replace(p.subdivision_name, 'Assessor subdivision area ', '') AS code,
      count(*) AS cnt,
      ST_Centroid(ST_Collect(p.geometry)) AS geom
    FROM parcels p
    WHERE p.municipality = 'CITY OF PARK RIDGE'
      AND p.subdivision_name LIKE 'Assessor subdivision area %'
      AND p.geometry IS NOT NULL
    GROUP BY p.subdivision_name
  ),
  direct AS (
    SELECT
      c.code,
      c.cnt,
      'direct_evidence'::text AS match_type,
      e.evidence_count,
      et.total AS evidence_total,
      NULL::numeric AS distance_m
    FROM evidence e
    JOIN codes c ON c.code = e.code
    CROSS JOIN evidence_total et
  ),
  spatial AS (
    SELECT
      c.code,
      c.cnt,
      'spatial_nearby'::text AS match_type,
      0::bigint AS evidence_count,
      et.total AS evidence_total,
      round(ST_Distance(c.geom::geography, a.geom::geography))::numeric AS distance_m
    FROM codes c
    CROSS JOIN anchor a
    CROSS JOIN evidence_total et
    WHERE a.geom IS NOT NULL
      AND c.code NOT IN (SELECT code FROM evidence)
    ORDER BY distance_m ASC
    LIMIT p_limit
  )
  SELECT * FROM direct
  UNION ALL
  SELECT * FROM spatial
  ORDER BY match_type ASC, evidence_count DESC, distance_m ASC NULLS LAST
  LIMIT p_limit;
$$;
