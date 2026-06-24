-- gis_parcels: raw Cook County GIS parcel geometries.
--
-- Stores the authoritative parcel polygon as downloaded from the Cook County GIS
-- FeatureServer, separate from the enriched `parcels` table which carries assessor
-- attribute data (year_built, permits, sales, assessments, etc.).
--
-- This table is the geometry source for spatial parcel-to-lot matching.
-- After matching, results flow into parcel_lot_relationships.

create table if not exists gis_parcels (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid references source_registry (id) on delete set null,
  source_year       integer,
  source_feature_id text,
  pin               text,
  pin_normalized    text,
  address           text,
  geometry          geometry(Geometry, 4326),
  raw_properties    jsonb,
  confidence        text not null default 'high'
                      check (confidence in ('high','medium','low','unknown')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (source_id, source_feature_id)
);

create index if not exists gis_parcels_geometry_idx
  on gis_parcels using gist (geometry);
create index if not exists gis_parcels_pin_normalized_idx
  on gis_parcels (pin_normalized)
  where pin_normalized is not null;
create index if not exists gis_parcels_pin_idx
  on gis_parcels (pin)
  where pin is not null;
create index if not exists gis_parcels_source_feature_idx
  on gis_parcels (source_feature_id);

alter table gis_parcels enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'gis_parcels' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on gis_parcels for select using (true)';
  end if;
end $$;

grant select on gis_parcels to anon, authenticated;
