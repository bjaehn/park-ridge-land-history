-- Add street_name_normalized and neighborhood_id to parcels.
-- street_name_normalized: lowercased street name extracted from address field.
-- neighborhood_id: one of five Park Ridge neighborhoods, mapped from census tract.

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS street_name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood_id TEXT;

CREATE INDEX IF NOT EXISTS idx_parcels_street_name    ON parcels (street_name_normalized);
CREATE INDEX IF NOT EXISTS idx_parcels_neighborhood   ON parcels (neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_parcels_year_built     ON parcels (year_built);

-- Populate street_name_normalized: strip leading house number, lowercase.
UPDATE parcels
   SET street_name_normalized = LOWER(TRIM(REGEXP_REPLACE(address, '^\d+\s+', '', 'g')))
 WHERE address IS NOT NULL;

-- Populate neighborhood_id from census tract (street_block_tract field).
UPDATE parcels SET neighborhood_id = 'neighborhood:northwest'
 WHERE street_block_tract IN ('806005','806004','806002','805901','805902','805801');

UPDATE parcels SET neighborhood_id = 'neighborhood:northeast'
 WHERE street_block_tract IN ('805501','805502');

UPDATE parcels SET neighborhood_id = 'neighborhood:central'
 WHERE street_block_tract IN ('805802');

UPDATE parcels SET neighborhood_id = 'neighborhood:uptown'
 WHERE street_block_tract IN ('805701','805600');

UPDATE parcels SET neighborhood_id = 'neighborhood:south'
 WHERE street_block_tract IN ('805702','810400');
