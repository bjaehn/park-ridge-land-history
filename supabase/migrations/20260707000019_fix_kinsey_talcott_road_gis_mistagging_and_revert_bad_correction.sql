-- Follow-up to 20260707000018. That migration corrected 55 parcels whose
-- direct FK wrongly said "Kinsey's Talcott Road Subdivision" when Cook
-- County's GIS plat data said "Kinsey's Park Ridge Subdivision," Block 2,
-- with NO deed evidence contradicting the GIS tag for any of those 55.
--
-- Investigating the 13 parcels that still overlapped after that fix found
-- something different: each one has a verbatim, high-confidence deed legal
-- description (property_subdivision_links.source_reference, from AI deed
-- analysis) explicitly naming "Kinsey's Talcott Road Subdivision" plus an
-- exact lot and block number -- e.g. "LOT 13 IN BLOCK 2 IN KINSEY'S
-- TALCOTT ROAD SUBDIVISION IN THE NORTHEAST 1/4 OF SECTION 2...". The
-- competing GIS tag for these same 13 lots is itself only rated
-- confidence='medium' in gis_lots, vs. 'high' confidence on the deed
-- extraction. A verbatim quote from an actual recorded legal document
-- naming the subdivision, lot, AND block is stronger evidence than an
-- approximate geometric plat-name match, so the deed evidence wins here --
-- unlike the other 55, where no such deed evidence existed at all.
--
-- This reveals 3 of the 55 parcels corrected in 20260707000018 were
-- actually WRONG to correct (12022040130000, 12022040160000, 12022080080000)
-- -- they have the same strong deed evidence for Talcott Road as the other
-- 10 already did. Reverting those 3 back to Talcott Road, and fixing the
-- underlying gis_lots mis-tagging for all 13 lots (2 in Block 2, 2 in
-- Block 1 covering pin 12022080080000, 4 more in Block 1, 6 in Block 3)
-- so the union RPC stops counting them under Park Ridge at all -- a direct
-- FK fix alone isn't enough, since get_linked_pins_for_subdivision unions
-- all 3 sources and the GIS source would keep pulling them into Park
-- Ridge's count regardless.
--
-- Idempotent: both UPDATEs' WHERE clauses require the pre-fix state.

-- Revert the 3 over-corrected parcels' direct FK back to Talcott Road.
UPDATE parcels
SET subdivision_id = '622df745-3e15-4673-8a0d-f1c96ef9101f'::uuid  -- Kinsey's Talcott Road Subdivision
WHERE subdivision_id = 'f424e100-e2cf-4f92-a6eb-35943ccf51b0'::uuid  -- Kinsey's Park Ridge Subdivision
  AND pin_normalized IN ('12022040130000', '12022040160000', '12022080080000');

-- Correct the GIS-lot mis-tagging for all 13 deed-verified Talcott Road lots.
UPDATE gis_lots
SET subdivision_id = '622df745-3e15-4673-8a0d-f1c96ef9101f'::uuid  -- Kinsey's Talcott Road Subdivision
WHERE subdivision_id = 'f424e100-e2cf-4f92-a6eb-35943ccf51b0'::uuid  -- Kinsey's Park Ridge Subdivision
  AND id IN (
    '60f4918a-49a5-48d2-a073-1e70d1afe71a', 'b2e821a8-27a9-4e6f-b052-8d786bf4ae78',
    'ae2e8b06-f042-4d62-a1bb-33b9e751ef32', 'c64b3549-e85a-441f-a2e2-59193734368d',
    '9f47547a-47bb-4db9-8729-f1c601bdd09d', '482c303f-df6a-4738-9ecf-ec9e7e515c6e',
    '8b8972cf-5eae-45b4-b962-57de5984423d', 'c0d20ee4-490e-4a6e-afa2-c954b7fa1259',
    'dede6bba-cc5c-42c9-abf8-c203fdc3fd5c', 'e18385e3-a05b-40c4-a57c-838004cbe31b',
    '2cc3d54a-8411-43f2-b3e3-3effbccacbf4', '7961810a-7d60-4af7-b617-bb8bab36ae80',
    '6f65fe34-3210-4c1c-8ecf-e871f65d854d'
  );
