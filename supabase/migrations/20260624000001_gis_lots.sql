-- gis_lots: raw Cook County GIS plat lot geometries.
--
-- This is a raw-import staging table. Each row is one lot polygon as it appears
-- in the Cook County GIS Lots FeatureServer, plus normalized fields added during
-- ingestion (normalized_subdivision_name, subdivision_id FK).
--
-- Downstream tables (subdivision_lots, subdivision_geometries, parcel_lot_relationships)
-- are populated from this table after normalization and spatial matching.

create table if not exists gis_lots (
  id                          uuid primary key default gen_random_uuid(),
  source_id                   uuid references source_registry (id) on delete set null,
  source_year                 integer,
  source_feature_id           text,
  geometry                    geometry(Geometry, 4326),
  pin                         text,
  lot_number                  text,
  block_number                text,
  subdivision_name            text,
  normalized_subdivision_name text,
  subdivision_id              uuid references subdivisions (id) on delete set null,
  township                    text,
  range                       text,
  section                     text,
  plss_description            text,
  legal_context               text,
  raw_properties              jsonb,
  confidence                  text not null default 'medium'
                                check (confidence in ('high','medium','low','unknown')),
  notes                       text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (source_id, source_feature_id)
);

create index if not exists gis_lots_geometry_idx
  on gis_lots using gist (geometry);
create index if not exists gis_lots_subdivision_name_idx
  on gis_lots (lower(subdivision_name));
create index if not exists gis_lots_normalized_name_idx
  on gis_lots (normalized_subdivision_name);
create index if not exists gis_lots_lot_block_idx
  on gis_lots (lot_number, block_number);
create index if not exists gis_lots_source_feature_idx
  on gis_lots (source_feature_id);
create index if not exists gis_lots_subdivision_id_idx
  on gis_lots (subdivision_id);
create index if not exists gis_lots_pin_idx
  on gis_lots (pin)
  where pin is not null;

alter table gis_lots enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'gis_lots' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on gis_lots for select using (true)';
  end if;
end $$;

grant select on gis_lots to anon, authenticated;
