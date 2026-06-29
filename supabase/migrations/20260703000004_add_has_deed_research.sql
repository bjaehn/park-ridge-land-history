-- has_deed_research: broader "deed was directly examined" signal
--
-- has_deed_notes only fires when deed_notes text was manually written.
-- This new column also fires when a subdivision link was established via a
-- deed legal description (match_method = 'deed_legal_description'), covering
-- cases where the deed was researched but no notes text was recorded.

ALTER TABLE parcels ADD COLUMN IF NOT EXISTS has_deed_research boolean NOT NULL DEFAULT false;

-- Backfill: set true for any parcel that already has deed notes or a deed-method link
UPDATE parcels p
SET has_deed_research = true
WHERE p.has_deed_notes = true
   OR EXISTS (
     SELECT 1
     FROM property_subdivision_links psl
     WHERE psl.pin = p.pin_normalized
       AND psl.match_method = 'deed_legal_description'
   );

-- Trigger: keep has_deed_research in sync when deed_notes is written on a parcel
CREATE OR REPLACE FUNCTION trg_parcels_deed_research_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.deed_notes IS NOT NULL AND NEW.deed_notes != '' AND NOT NEW.has_deed_research THEN
    NEW.has_deed_research := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parcels_deed_research ON parcels;
CREATE TRIGGER trg_parcels_deed_research
BEFORE UPDATE ON parcels
FOR EACH ROW EXECUTE FUNCTION trg_parcels_deed_research_fn();

-- Trigger: keep has_deed_research in sync when a deed link is inserted or updated
CREATE OR REPLACE FUNCTION trg_psl_deed_research_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.match_method = 'deed_legal_description' AND NEW.pin IS NOT NULL THEN
    UPDATE parcels
    SET has_deed_research = true
    WHERE pin_normalized = NEW.pin
      AND has_deed_research = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_psl_deed_research ON property_subdivision_links;
CREATE TRIGGER trg_psl_deed_research
AFTER INSERT OR UPDATE ON property_subdivision_links
FOR EACH ROW EXECUTE FUNCTION trg_psl_deed_research_fn();
