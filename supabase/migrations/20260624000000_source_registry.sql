-- source_registry: formal dataset tracking for every external source used in the app.
--
-- Replaces the ad-hoc source_name/source_url text columns scattered across
-- subdivision_sources, subdivision_lots, and property_subdivision_links with a
-- single FK-able registry entry. Existing tables keep their text columns for
-- backwards compatibility; new GIS tables (gis_lots, gis_parcels) will FK here.

create table if not exists source_registry (
  id                uuid primary key default gen_random_uuid(),
  source_key        text not null unique,
  source_name       text not null,
  source_type       text not null
                      check (source_type in (
                        'gis_feature_layer',
                        'bulk_download',
                        'web_api',
                        'recorded_document',
                        'manual_entry'
                      )),
  source_url        text,
  publisher         text,
  access_method     text
                      check (access_method in (
                        'arcgis_rest',
                        'socrata',
                        'bulk_download',
                        'manual',
                        'other'
                      )),
  retrieved_at      timestamptz,
  coverage_area     text,
  coverage_years    text,
  license_or_terms  text,
  notes             text,
  confidence_default text not null default 'medium'
                       check (confidence_default in ('high','medium','low','unknown')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists source_registry_source_key_idx on source_registry (source_key);
create index if not exists source_registry_source_type_idx on source_registry (source_type);

alter table source_registry enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'source_registry' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on source_registry for select using (true)';
  end if;
end $$;

grant select on source_registry to anon, authenticated;

-- Seed: Cook County GIS Lots (primary plat lot source).
-- URL confirmed by running script 07_inspect_cook_gis_lots_fields.py.
-- source_url and retrieved_at are updated by the ingestion script on each run.
insert into source_registry
  (source_key, source_name, source_type, publisher, access_method,
   coverage_area, confidence_default, notes)
values
  (
    'cook_county_gis_lots',
    'Cook County GIS -- Subdivision Lots',
    'gis_feature_layer',
    'Cook County GIS Department',
    'arcgis_rest',
    'Cook County, IL',
    'medium',
    'Polygon layer of subdivision plat lots derived from recorded plat documents. '
    'Primary source for matching modern parcels to original plat lots. '
    'URL confirmed by script 07_inspect_cook_gis_lots_fields.py before first ingestion.'
  ),
  (
    'cook_county_gis_parcels_current',
    'Cook County GIS -- Current Parcels',
    'gis_feature_layer',
    'Cook County GIS Department',
    'arcgis_rest',
    'Cook County, IL',
    'high',
    'Current tax parcel polygon layer. Used as the authoritative parcel geometry '
    'for spatial matching against plat lots. Separate from the enriched parcels '
    'table which carries assessor attribute data.'
  )
on conflict (source_key) do nothing;
