-- Fix neighborhood slug assignments so page routes resolve to the correct typed neighborhood.
-- The old 'neighborhood:*' rows have slugs like 'south_park' but 0 parcels in the new FK system.
-- The new 'official_planning:*' rows have the real parcel counts but slug=NULL.
-- Step 1: Give official_planning neighborhoods a slug derived from their ID suffix.
UPDATE neighborhoods
SET slug = split_part(id, ':', 2)
WHERE id LIKE 'official_planning:%'
  AND slug IS NULL;

-- Step 2: Clear conflicting slugs from old 'neighborhood:*' rows so the new rows win.
UPDATE neighborhoods n
SET slug = NULL
WHERE id LIKE 'neighborhood:%'
  AND slug IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM neighborhoods op
    WHERE op.id LIKE 'official_planning:%'
      AND split_part(op.id, ':', 2) = n.slug
  );
