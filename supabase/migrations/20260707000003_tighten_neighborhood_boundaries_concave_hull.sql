-- The neighborhood boundary drawn on the map (official_planning type) is a
-- ST_ConvexHull over each neighborhood's assigned parcels (set in
-- 20260705000002). Because parcel assignment itself is done via axis-aligned
-- lat/lon band cuts (a documented low-confidence approximation) while real
-- neighborhoods are concave (following the diagonal railroad, Northwest
-- Highway, the Des Plaines River, etc.), the convex hull bulges outward and
-- visually "captures" neighboring parcels that were never assigned to that
-- neighborhood -- they render muted/grey on the map, looking like an
-- unexplained gap inside the boundary line.
--
-- Verified live before writing this: ST_ConcaveHull(ST_Collect(geometry), pct)
-- over the raw parcel polygons throws "Unable to find a convex corner" (a
-- GEOS limitation) for 4 of the 7 official_planning neighborhoods, regardless
-- of target_percent (0.3-0.7 all failed identically). Collecting parcel
-- CENTROIDS instead of full polygons avoids this failure entirely (all 7
-- succeed at every percent tested).
--
-- target_percent = 0.3 chosen after comparing against convex hull: it drops
-- "foreign" parcel containment (other-neighborhood parcels whose centroid
-- falls inside the hull) from as high as 537 (northeast_park) down to 0 for
-- ALL 7 neighborhoods, while keeping reasonable area (68-95% of the convex
-- hull's area for the least-affected neighborhoods, down to ~47-63% for the
-- most concave ones) and reasonable vertex counts (29-77 points) -- not a
-- degenerate or overly-jagged shape.
--
-- This only tightens the DRAWN boundary to better match the already-assigned
-- parcels; it does not change which parcels are assigned to which
-- neighborhood, and does not fix the deeper axis-aligned-band approximation
-- itself (still boundary_confidence = 'low' / review_status = 'needs_review').
--
-- Safe to re-run: pure UPDATE, idempotent.

UPDATE neighborhoods n
SET geometry = sub.hull,
    boundary_confidence = 'low',
    review_status = 'needs_review'
FROM (
  SELECT official_planning_neighborhood_id AS id,
         ST_Multi(ST_ConcaveHull(ST_Collect(ST_Centroid(geometry)), 0.3)) AS hull
  FROM parcels
  WHERE official_planning_neighborhood_id IS NOT NULL
  GROUP BY official_planning_neighborhood_id
) sub
WHERE n.id = sub.id;
