-- Boundary edge detection for subdivision research queue.
-- Adds queue_type and adjacent_subdivision_names columns to deed_research_queue,
-- and a new RPC that finds unassigned properties sitting at the frontier between
-- two or more known subdivision territories.

ALTER TABLE deed_research_queue
  ADD COLUMN IF NOT EXISTS queue_type text NOT NULL DEFAULT 'neighbor'
       CHECK (queue_type IN ('neighbor', 'boundary_edge')),
  ADD COLUMN IF NOT EXISTS adjacent_subdivision_names text[];

-- find_boundary_edge_candidates: returns unassigned Park Ridge parcels that sit
-- at the boundary between two or more deed-verified subdivision territories.
-- Uses a wider radius (0.0006°, ~60 m) than find_research_candidates so it can
-- see across a residential street to the subdivision on the opposite side.
-- Also flags properties within 150 ft of a major road, since Park Ridge arterials
-- historically served as plat boundaries.
--
-- edge_score = (distinct_subdivision_count * 10)
--            + LEAST(total_deed_neighbor_count, 5)
--            + (3 if nearest_major_road_dist_ft < 150)
--
-- Only properties touching 2+ subdivisions, OR touching 1 subdivision while
-- adjacent to a major road, are returned.
CREATE OR REPLACE FUNCTION find_boundary_edge_candidates()
RETURNS TABLE(
  candidate_pin               text,
  candidate_address           text,
  suspected_subdivision_id    uuid,
  suspected_subdivision_name  text,
  source_pins                 text[],
  neighbor_count              bigint,
  anchor_lots                 text[],
  anchor_blocks               text[],
  anchor_addresses            text[],
  distinct_subdivision_count  bigint,
  adjacent_subdivision_names  text[],
  adjacent_subdivision_ids    uuid[],
  is_near_major_road          boolean,
  edge_score                  numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH per_sub AS (
    -- One row per (candidate, subdivision): count deed-verified neighbors for each pairing.
    SELECT
      candidates.pin_normalized,
      candidates.address,
      candidates.nearest_major_road_dist_ft,
      anchors.subdivision_id,
      anchors.subdivision_name,
      array_agg(DISTINCT anchors.anchor_pin)                                                     AS source_pins,
      COUNT(DISTINCT anchors.anchor_pin)                                                          AS neighbor_count,
      array_agg(DISTINCT anchors.lot_number)   FILTER (WHERE anchors.lot_number   IS NOT NULL)   AS anchor_lots,
      array_agg(DISTINCT anchors.block_number) FILTER (WHERE anchors.block_number IS NOT NULL)   AS anchor_blocks,
      array_agg(DISTINCT anchors.anchor_address)                                                  AS anchor_addresses
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
      ON ST_DWithin(candidates.geometry, anchors.anchor_geometry, 0.0006)
    WHERE  candidates.municipality = 'CITY OF PARK RIDGE'
      AND  candidates.geometry IS NOT NULL
      AND  candidates.pin_normalized != anchors.anchor_pin
      AND  candidates.pin_normalized NOT IN (
             SELECT pin FROM property_subdivision_links
           )
      AND  candidates.pin_normalized NOT IN (
             SELECT pin FROM deed_research_queue
             WHERE  status IN ('researched', 'not_found', 'skipped')
           )
    GROUP BY candidates.pin_normalized, candidates.address,
             candidates.nearest_major_road_dist_ft,
             anchors.subdivision_id, anchors.subdivision_name
  ),
  -- Collapse to one row per candidate: capture all adjacent subdivisions.
  multi_sub AS (
    SELECT
      pin_normalized,
      COUNT(DISTINCT subdivision_id)                                          AS distinct_subdivision_count,
      array_agg(DISTINCT subdivision_name ORDER BY subdivision_name)         AS adjacent_subdivision_names,
      array_agg(DISTINCT subdivision_id)                                     AS adjacent_subdivision_ids,
      SUM(neighbor_count)                                                     AS total_neighbor_count
    FROM per_sub
    GROUP BY pin_normalized
  ),
  -- Pick the dominant subdivision (most deed-verified neighbors) per candidate.
  best_sub AS (
    SELECT DISTINCT ON (pin_normalized)
      pin_normalized,
      address,
      nearest_major_road_dist_ft,
      subdivision_id,
      subdivision_name,
      source_pins,
      neighbor_count,
      anchor_lots,
      anchor_blocks,
      anchor_addresses
    FROM per_sub
    ORDER BY pin_normalized, neighbor_count DESC
  ),
  scored AS (
    SELECT
      bs.pin_normalized,
      bs.address,
      bs.subdivision_id,
      bs.subdivision_name,
      bs.source_pins,
      bs.neighbor_count,
      bs.anchor_lots,
      bs.anchor_blocks,
      bs.anchor_addresses,
      ms.distinct_subdivision_count,
      ms.adjacent_subdivision_names,
      ms.adjacent_subdivision_ids,
      COALESCE(bs.nearest_major_road_dist_ft, 9999) < 150         AS is_near_major_road,
      (ms.distinct_subdivision_count * 10)
        + LEAST(ms.total_neighbor_count, 5)
        + CASE WHEN COALESCE(bs.nearest_major_road_dist_ft, 9999) < 150 THEN 3 ELSE 0 END
                                                                   AS edge_score
    FROM best_sub bs
    JOIN multi_sub ms ON ms.pin_normalized = bs.pin_normalized
  )
  SELECT
    pin_normalized,
    address,
    subdivision_id,
    subdivision_name,
    source_pins,
    neighbor_count,
    anchor_lots,
    anchor_blocks,
    anchor_addresses,
    distinct_subdivision_count,
    adjacent_subdivision_names,
    adjacent_subdivision_ids,
    is_near_major_road,
    edge_score
  FROM scored
  WHERE distinct_subdivision_count >= 2
     OR (distinct_subdivision_count = 1 AND is_near_major_road)
  ORDER BY edge_score DESC
  LIMIT 100;
$$;
