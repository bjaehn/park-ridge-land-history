-- Replace scalar gis_page_code with a text array to support
-- subdivisions that span multiple GIS plat pages.

ALTER TABLE recorder_plat_index DROP COLUMN IF EXISTS gis_page_code;
DROP INDEX IF EXISTS recorder_plat_index_gis_page_code_idx;

ALTER TABLE recorder_plat_index ADD COLUMN IF NOT EXISTS gis_page_codes text[];
CREATE INDEX IF NOT EXISTS recorder_plat_index_gis_page_codes_idx
  ON recorder_plat_index USING GIN (gis_page_codes);
