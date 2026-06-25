-- Ensure all neighborhoods have slug values matching the id suffix.
-- Derives slug from id when null (e.g. 'official_planning:south_park' -> 'south_park').

UPDATE neighborhoods
SET slug = split_part(id, ':', 2)
WHERE slug IS NULL AND id LIKE '%:%';
