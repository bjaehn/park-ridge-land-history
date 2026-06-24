ALTER TABLE recorder_plat_index ADD COLUMN IF NOT EXISTS gis_page_code text;
CREATE INDEX IF NOT EXISTS recorder_plat_index_gis_page_code_idx ON recorder_plat_index (gis_page_code);
