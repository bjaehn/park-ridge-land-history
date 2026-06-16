-- Land Lineage: schema extensions + starter dataset
--
-- Extends subdivisions and subdivision_lots to support deed-sourced legal
-- descriptions connecting modern parcels to historical lots, blocks, plats,
-- and parent estates.
--
-- No existing tables are dropped or structurally broken.

-- ─── Schema extensions ─────────────────────────────────────────────────────

-- entity_type: distinguishes subdivision, parent plat, estate, etc.
alter table subdivisions
  add column if not exists entity_type text default 'subdivision'
    check (entity_type in ('subdivision', 'estate', 'parent_plat', 'plat', 'unknown')),
  add column if not exists geometry_status text default 'not_started'
    check (geometry_status in ('not_started', 'needs_source', 'in_progress', 'complete', 'approximate'));

-- Lot-level detail from deed / legal description sources
alter table subdivision_lots
  add column if not exists document_date   text,
  add column if not exists source_type     text,
  add column if not exists source_name     text,
  add column if not exists data_quality_flags text[];

-- ─── Subdivision entities ───────────────────────────────────────────────────

-- Insert all 6 entities; set parent FKs in a follow-up UPDATE
insert into subdivisions
  (name, normalized_name, entity_type, confidence_level, notes, geometry_status)
values
  (
    'Kinsey''s Park Ridge Subdivision',
    'kinseys_park_ridge_subdivision',
    'subdivision',
    'medium',
    'Appears in deed/legal descriptions across multiple modern Park Ridge addresses and blocks, including Blocks 1, 14, 15, 16, and 17. This suggests it was a broad historical subdivision framework rather than a single small street segment.',
    'not_started'
  ),
  (
    'Arthur Dunas Subdivision',
    'arthur_dunas_subdivision',
    'subdivision',
    'medium',
    'Appears in deed/legal descriptions for properties on S Crescent Ave. Current sample ties it to Park Ridge Manor as a parent subdivision or earlier land framework.',
    'not_started'
  ),
  (
    'Park Ridge Manor',
    'park_ridge_manor',
    'parent_plat',
    'medium',
    'Appears as a parent or related historical plat for Arthur Dunas Subdivision. Needs additional source verification.',
    'not_started'
  ),
  (
    'Shannon and Canfields Subdivision',
    'shannon_and_canfields_subdivision',
    'subdivision',
    'medium',
    'Appears in deed/legal descriptions for 906 S Cumberland Ave. Current sample shows a modern parcel containing multiple historical lots.',
    'not_started'
  ),
  (
    'H. Roy Berry Co''s Devon Avenue Highlands',
    'h_roy_berry_cos_devon_avenue_highlands',
    'subdivision',
    'medium',
    'Appears in deed/legal descriptions for properties near S Delphia Ave and Park Ridge Blvd. Current sample ties it to the John Battcher Estate.',
    'not_started'
  ),
  (
    'John Battcher Estate',
    'john_battcher_estate',
    'estate',
    'medium',
    'Appears as a parent estate or earlier landholding associated with H. Roy Berry Co''s Devon Avenue Highlands. Needs additional source verification.',
    'not_started'
  )
on conflict do nothing;

-- Set parent_subdivision_id relationships
update subdivisions
  set parent_subdivision_id = (
    select id from subdivisions where normalized_name = 'park_ridge_manor' limit 1
  )
where normalized_name = 'arthur_dunas_subdivision'
  and parent_subdivision_id is null;

update subdivisions
  set parent_subdivision_id = (
    select id from subdivisions where normalized_name = 'john_battcher_estate' limit 1
  )
where normalized_name = 'h_roy_berry_cos_devon_avenue_highlands'
  and parent_subdivision_id is null;

-- ─── Property → subdivision links ──────────────────────────────────────────
-- One row per unique (PIN, subdivision) pair.
-- Multi-lot cases: lot_number is null here; detail lives in subdivision_lots.

with s as (
  select id, normalized_name from subdivisions
  where normalized_name in (
    'kinseys_park_ridge_subdivision',
    'arthur_dunas_subdivision',
    'shannon_and_canfields_subdivision',
    'h_roy_berry_cos_devon_avenue_highlands'
  )
)
insert into property_subdivision_links
  (pin, address, subdivision_id, lot_number, block_number,
   match_method, confidence_level, confidence_reason, source_name, source_reference)
select
  v.pin, v.address, s.id,
  v.lot_number, v.block_number,
  'deed_legal_description', v.confidence,
  'Sourced from deed / legal description',
  'Cook County Recorder of Deeds',
  v.source_ref
from (values
  -- Kinsey's Park Ridge Subdivision
  ('12-02-402-014-0000', '701 Peterson Ave',     'kinseys_park_ridge_subdivision', '1',    '16', 'high',   'Deed recorded 7/23/2004'),
  ('12-02-401-001-0000', '1801 Brophy Ave',      'kinseys_park_ridge_subdivision', '33',   '17', 'medium', null),
  ('12-02-404-013-0000', '1800 South Crescent',  'kinseys_park_ridge_subdivision', '1',    '14', 'medium', null),
  ('12-02-403-042-0000', '1900 Courtland Ave',   'kinseys_park_ridge_subdivision', '8',    '15', 'medium', null),
  ('12-02-208-015-0000', '428 Talcott Pl',       'kinseys_park_ridge_subdivision', '16',   '1',  'medium', null),
  -- Arthur Dunas Subdivision (multi-lot: lot_number null here)
  ('09-35-416-001-0000', '901 S Crescent Ave',   'arthur_dunas_subdivision',       null,   '2',  'medium', null),
  ('09-35-416-003-0000', '909 S Crescent Ave',   'arthur_dunas_subdivision',       '22',   '2',  'medium', null),
  -- Shannon and Canfields Subdivision (multi-lot: lot_number null here)
  ('09-35-311-067-0000', '906 S Cumberland Ave', 'shannon_and_canfields_subdivision', null, '6', 'medium', null),
  -- H. Roy Berry Co's Devon Avenue Highlands (lot/block not yet captured)
  ('12-02-104-034-0000', '1217 S Delphia Ave',   'h_roy_berry_cos_devon_avenue_highlands', null, null, 'medium', null),
  ('12-02-104-030-0000', '1212 Park Ridge Blvd', 'h_roy_berry_cos_devon_avenue_highlands', null, null, 'medium', null)
) as v(pin, address, normalized_name, lot_number, block_number, confidence, source_ref)
join s on s.normalized_name = v.normalized_name
on conflict (pin, subdivision_id) do nothing;

-- ─── Historical lots (subdivision_lots) ───────────────────────────────────
-- One row per historical lot assignment.
-- Multiple rows for the same PIN = modern parcel assembled from >1 historic lot.

with s as (
  select id, normalized_name from subdivisions
  where normalized_name in (
    'kinseys_park_ridge_subdivision',
    'arthur_dunas_subdivision',
    'shannon_and_canfields_subdivision',
    'h_roy_berry_cos_devon_avenue_highlands'
  )
)
insert into subdivision_lots
  (subdivision_id, lot_number, block_number,
   current_pin, current_address,
   match_method, confidence_level, notes,
   document_date, source_type, source_name, data_quality_flags)
select
  s.id,
  v.lot_number, v.block_number,
  v.pin, v.address,
  'deed_legal_description', v.confidence,
  v.notes,
  v.document_date, v.source_type, 'Cook County Recorder of Deeds',
  v.flags
from (values
  -- Kinsey's: five properties, each with a single identified lot
  ('12-02-402-014-0000','701 Peterson Ave',    'kinseys_park_ridge_subdivision','1', '16','high',
   'Lot 1 in Block 16, Kinsey''s Park Ridge Subdivision. Document recorded 7/23/2004.',
   '7/23/2004','Deed / legal description',
   array['needs_geometry','needs_plat_date']),

  ('12-02-401-001-0000','1801 Brophy Ave',     'kinseys_park_ridge_subdivision','33','17','medium',
   'Lot 33 in Block 17, Kinsey''s Park Ridge Subdivision.',
   null,'Deed / legal description',
   array['needs_geometry','needs_plat_date','needs_document_number']),

  ('12-02-404-013-0000','1800 South Crescent', 'kinseys_park_ridge_subdivision','1', '14','medium',
   'Deed/legal description ties this parcel to Lot 1, Block 14 of Kinsey''s Park Ridge Subdivision.',
   null,'Deed / legal description',
   array['needs_geometry','needs_plat_date','needs_document_number']),

  ('12-02-403-042-0000','1900 Courtland Ave',  'kinseys_park_ridge_subdivision','8', '15','medium',
   'Deed/legal description ties this parcel to Lot 8, Block 15 of Kinsey''s Park Ridge Subdivision.',
   null,'Deed / legal description',
   array['needs_geometry','needs_plat_date','needs_document_number']),

  ('12-02-208-015-0000','428 Talcott Pl',      'kinseys_park_ridge_subdivision','16','1', 'medium',
   'Deed/legal description ties this parcel to Lot 16, Block 1 of Kinsey''s Park Ridge Subdivision.',
   null,'Deed / legal description',
   array['needs_geometry','needs_plat_date','needs_document_number']),

  -- Arthur Dunas: 901 S Crescent has TWO lots (rows 6+7)
  ('09-35-416-001-0000','901 S Crescent Ave',  'arthur_dunas_subdivision','23','2','medium',
   'This modern parcel includes at least Lot 23, Block 2 in Arthur Dunas Subdivision, associated with Park Ridge Manor.',
   null,'Deed / legal description',
   array['multiple_historic_lots_for_pin','has_parent_subdivision','needs_geometry','needs_plat_date','needs_document_number']),

  ('09-35-416-001-0000','901 S Crescent Ave',  'arthur_dunas_subdivision','24','2','medium',
   'Same modern parcel as Lot 23 row. The modern parcel includes multiple historical lots: Lots 23 and 24, Block 2.',
   null,'Deed / legal description',
   array['multiple_historic_lots_for_pin','has_parent_subdivision','needs_geometry','needs_plat_date','needs_document_number']),

  -- Arthur Dunas: 909 S Crescent, single lot
  ('09-35-416-003-0000','909 S Crescent Ave',  'arthur_dunas_subdivision','22','2','medium',
   'Deed/legal description ties this parcel to Lot 22, Block 2 in Arthur Dunas Subdivision, associated with Park Ridge Manor.',
   null,'Deed / legal description',
   array['has_parent_subdivision','needs_geometry','needs_plat_date','needs_document_number']),

  -- Shannon and Canfields: 906 S Cumberland has TWO lots (rows 9+10)
  ('09-35-311-067-0000','906 S Cumberland Ave','shannon_and_canfields_subdivision','17','6','medium',
   'This modern parcel includes at least Lot 17, Block 6 in Shannon and Canfields Subdivision.',
   null,'Deed / legal description',
   array['multiple_historic_lots_for_pin','needs_geometry','needs_plat_date','needs_document_number']),

  ('09-35-311-067-0000','906 S Cumberland Ave','shannon_and_canfields_subdivision','18','6','medium',
   'Same modern parcel as Lot 17 row. The modern parcel includes multiple historical lots: Lots 17 and 18, Block 6.',
   null,'Deed / legal description',
   array['multiple_historic_lots_for_pin','needs_geometry','needs_plat_date','needs_document_number']),

  -- H. Roy Berry: lot/block not yet captured
  ('12-02-104-034-0000','1217 S Delphia Ave',  'h_roy_berry_cos_devon_avenue_highlands',null,null,'medium',
   'Deed/legal description identifies H. Roy Berry Co''s Devon Avenue Highlands and ties it to the John Battcher Estate. Lot and block are not yet captured.',
   null,'Deed / legal description',
   array['missing_lot_block','has_parent_subdivision','needs_geometry','needs_plat_date','needs_document_number']),

  ('12-02-104-030-0000','1212 Park Ridge Blvd','h_roy_berry_cos_devon_avenue_highlands',null,null,'medium',
   'Deed/legal description identifies H. Roy Berry Co''s Devon Avenue Highlands and ties it to the John Battcher Estate. Lot and block are not yet captured.',
   null,'Deed / legal description',
   array['missing_lot_block','has_parent_subdivision','needs_geometry','needs_plat_date','needs_document_number'])

) as v(pin, address, normalized_name, lot_number, block_number, confidence,
       notes, document_date, source_type, flags)
join s on s.normalized_name = v.normalized_name;

-- ─── Denormalize parcel_count on subdivision rows ─────────────────────────

update subdivisions s
set parcel_count = (
  select count(distinct pin) from property_subdivision_links l
  where l.subdivision_id = s.id
)
where s.normalized_name in (
  'kinseys_park_ridge_subdivision',
  'arthur_dunas_subdivision',
  'shannon_and_canfields_subdivision',
  'h_roy_berry_cos_devon_avenue_highlands'
);
