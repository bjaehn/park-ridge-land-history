-- Update find_research_candidates to return up to 50 candidates PER subdivision
-- (previously a single global LIMIT 50). Also adds a per-subdivision variant.

CREATE OR REPLACE FUNCTION find_research_candidates()
RETURNS TABLE(
  candidate_pin              text,
  candidate_address          text,
  suspected_subdivision_id   uuid,
  suspected_subdivision_name text,
  source_pins                text[],
  neighbor_count             bigint,
  anchor_lots                text[],
  anchor_blocks              text[],
  anchor_addresses           text[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH raw AS (
    SELECT
      candidates.pin_normalized,
      candidates.address,
      anchors.subdivision_id,
      anchors.subdivision_name,
      array_agg(DISTINCT anchors.anchor_pin)                                               AS source_pins,
      COUNT(DISTINCT anchors.anchor_pin)                                                   AS neighbor_count,
      array_agg(DISTINCT anchors.lot_number)   FILTER (WHERE anchors.lot_number   IS NOT NULL) AS anchor_lots,
      array_agg(DISTINCT anchors.block_number) FILTER (WHERE anchors.block_number IS NOT NULL) AS anchor_blocks,
      array_agg(DISTINCT anchors.anchor_address)                                            AS anchor_addresses
    FROM parcels candidates
    JOIN (
      SELECT
        p.pin_normalized    AS anchor_pin,
        p.address           AS anchor_address,
        p.geometry          AS anchor_geometry,
        psl.subdivision_id,
        s.name              AS subdivision_name,
        psl.lot_number,
        psl.block_number
      FROM   parcels p
      JOIN   property_subdivision_links psl ON psl.pin = p.pin_normalized
      JOIN   subdivisions               s   ON s.id   = psl.subdivision_id
      WHERE  psl.match_method = 'deed_legal_description'
        AND  p.geometry IS NOT NULL
    ) anchors
      ON ST_DWithin(candidates.geometry, anchors.anchor_geometry, 0.0003)
    WHERE candidates.municipality = 'CITY OF PARK RIDGE'
      AND candidates.geometry IS NOT NULL
      AND candidates.pin_normalized != anchors.anchor_pin
      AND candidates.pin_normalized NOT IN (
            SELECT pin FROM property_subdivision_links
          )
      AND candidates.pin_normalized NOT IN (
            SELECT pin FROM deed_research_queue
            WHERE  status IN ('researched', 'not_found', 'skipped')
          )
    GROUP BY candidates.pin_normalized, candidates.address,
             anchors.subdivision_id, anchors.subdivision_name
  ),
  ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (
             PARTITION BY subdivision_id
             ORDER BY neighbor_count DESC
           ) AS rn
    FROM raw
  )
  SELECT pin_normalized, address, subdivision_id, subdivision_name,
         source_pins, neighbor_count, anchor_lots, anchor_blocks, anchor_addresses
  FROM ranked
  WHERE rn <= 50
  ORDER BY subdivision_name, neighbor_count DESC;
$$;

-- Per-subdivision variant: same logic but scoped to one subdivision.
CREATE OR REPLACE FUNCTION find_research_candidates_for_subdivision(p_subdivision_id uuid)
RETURNS TABLE(
  candidate_pin              text,
  candidate_address          text,
  suspected_subdivision_id   uuid,
  suspected_subdivision_name text,
  source_pins                text[],
  neighbor_count             bigint,
  anchor_lots                text[],
  anchor_blocks              text[],
  anchor_addresses           text[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    candidates.pin_normalized,
    candidates.address,
    anchors.subdivision_id,
    anchors.subdivision_name,
    array_agg(DISTINCT anchors.anchor_pin)                                               AS source_pins,
    COUNT(DISTINCT anchors.anchor_pin)                                                   AS neighbor_count,
    array_agg(DISTINCT anchors.lot_number)   FILTER (WHERE anchors.lot_number   IS NOT NULL) AS anchor_lots,
    array_agg(DISTINCT anchors.block_number) FILTER (WHERE anchors.block_number IS NOT NULL) AS anchor_blocks,
    array_agg(DISTINCT anchors.anchor_address)                                            AS anchor_addresses
  FROM parcels candidates
  JOIN (
    SELECT
      p.pin_normalized    AS anchor_pin,
      p.address           AS anchor_address,
      p.geometry          AS anchor_geometry,
      psl.subdivision_id,
      s.name              AS subdivision_name,
      psl.lot_number,
      psl.block_number
    FROM   parcels p
    JOIN   property_subdivision_links psl ON psl.pin = p.pin_normalized
    JOIN   subdivisions               s   ON s.id   = psl.subdivision_id
    WHERE  psl.match_method = 'deed_legal_description'
      AND  p.geometry IS NOT NULL
      AND  psl.subdivision_id = p_subdivision_id
  ) anchors
    ON ST_DWithin(candidates.geometry, anchors.anchor_geometry, 0.0003)
  WHERE candidates.municipality = 'CITY OF PARK RIDGE'
    AND candidates.geometry IS NOT NULL
    AND candidates.pin_normalized != anchors.anchor_pin
    AND candidates.pin_normalized NOT IN (
          SELECT pin FROM property_subdivision_links
        )
    AND candidates.pin_normalized NOT IN (
          SELECT pin FROM deed_research_queue
          WHERE  status IN ('researched', 'not_found', 'skipped')
        )
  GROUP BY candidates.pin_normalized, candidates.address,
           anchors.subdivision_id, anchors.subdivision_name
  ORDER BY neighbor_count DESC
  LIMIT 50;
$$;
