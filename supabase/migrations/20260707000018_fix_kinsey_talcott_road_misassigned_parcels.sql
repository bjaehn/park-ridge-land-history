-- Corrects 55 parcels whose direct admin-assigned subdivision_id pointed to
-- "Kinsey's Talcott Road Subdivision" but whose recorded plat, per Cook
-- County's own GIS lot data (the authoritative geometric source), is
-- actually "Kinsey's Park Ridge Subdivision," Block 2. Investigated and
-- reported to the user 2026-07-07; user approved the correction.
--
-- Evidence: all 55 parcels are tagged Block 2 in gis_lots.subdivision_name
-- under Kinsey's Park Ridge Subdivision's subdivision_id, with zero
-- exceptions. Kinsey's Talcott Road Subdivision has ZERO parcels matched via
-- the GIS-lot geometric source anywhere in the database -- its entire
-- footprint came only from this direct FK and deed-research links, never
-- from a matched plat boundary. One representative address in the set,
-- 515 S Talcott Rd, is the likely source of the original error: the
-- property sits ON Talcott Road street, which appears to have been
-- conflated with being IN the "Kinsey's Talcott Road Subdivision" plat.
--
-- Scope: only these 55 parcels (proven wrong by GIS plat evidence). Left
-- untouched: the other 36 parcels with subdivision_id = Talcott Road (no
-- contradicting GIS evidence either way) and the 10 parcels whose ONLY link
-- to Talcott Road is via deed research (property_subdivision_links), not
-- this direct FK -- those are a separate correction if warranted later.
--
-- Idempotent: re-running finds nothing to update once applied, since the
-- WHERE clause requires subdivision_id still equal to Talcott Road's id.

UPDATE parcels p
SET subdivision_id = 'f424e100-e2cf-4f92-a6eb-35943ccf51b0'::uuid  -- Kinsey's Park Ridge Subdivision
WHERE p.subdivision_id = '622df745-3e15-4673-8a0d-f1c96ef9101f'::uuid  -- Kinsey's Talcott Road Subdivision
  AND p.pin_normalized IN (
    SELECT DISTINCT plr.pin_normalized
    FROM parcel_lot_relationships plr
    JOIN gis_lots gl ON gl.id = plr.lot_id
    WHERE gl.subdivision_id = 'f424e100-e2cf-4f92-a6eb-35943ccf51b0'::uuid
  );
