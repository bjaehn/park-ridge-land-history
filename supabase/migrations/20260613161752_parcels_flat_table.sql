-- Flat parcels table used by the current app.
-- All enriched Cook County assessor fields in one row per parcel,
-- with PostGIS geometry and JSONB for timeline arrays.

create extension if not exists postgis;

create table if not exists parcels (
  pin_normalized            text primary key,
  pin_original              text,
  address                   text,
  municipality              text,
  property_class            text,
  year_built                integer,
  decade_built              text,
  building_sqft             numeric,
  land_sqft                 numeric,
  improvement_count         integer,
  primary_building_selection_method text,
  data_quality_flags        jsonb,
  source_note               text,

  permit_count              integer,
  latest_permit_year        integer,
  nearby_teardown_count     integer,

  permit_pressure_score     numeric,
  permit_pressure_type      text,
  permit_stability_type     text,
  recent_permit_count       integer,
  recent_teardown_count     integer,

  permit_pressure_1_type    text,
  permit_stability_1_type   text,
  permit_pressure_1_score   numeric,
  recent_permit_1_count     integer,
  recent_teardown_1_count   integer,

  permit_pressure_5_type    text,
  permit_stability_5_type   text,
  permit_pressure_5_score   numeric,
  recent_permit_5_count     integer,
  recent_teardown_5_count   integer,

  permit_pressure_10_type   text,
  permit_stability_10_type  text,
  permit_pressure_10_score  numeric,
  recent_permit_10_count    integer,
  recent_teardown_10_count  integer,

  permit_pressure_all_type  text,
  permit_stability_all_type text,
  permit_pressure_all_score numeric,
  recent_permit_all_count   integer,
  recent_teardown_all_count integer,

  sale_count                integer,
  latest_sale_year          integer,
  latest_sale_price         numeric,
  max_sale_price            numeric,

  assessed_year_count       integer,
  first_assessed_year       integer,
  first_assessed_total      numeric,
  latest_assessed_year      integer,
  latest_assessed_total     numeric,
  assessed_value_change_pct numeric,
  assessed_value_timeline   jsonb,

  appeal_count              integer,
  latest_appeal_year        integer,
  open_appeal_count         integer,
  total_assessment_reduction numeric,

  proximity_year            integer,
  nearest_park_name         text,
  nearest_park_dist_ft      numeric,
  nearest_metra_stop_name   text,
  nearest_metra_stop_dist_ft numeric,
  nearest_bike_trail_name   text,
  nearest_bike_trail_dist_ft numeric,
  foreclosure_count_half_mile_5yr  numeric,
  foreclosure_per_1000_half_mile_5yr numeric,
  nearest_major_road_name   text,
  nearest_major_road_dist_ft numeric,

  street_block_id           text,
  street_block_tract        text,
  street_block_source       text,

  hargis_record_count       integer,
  hargis_refnum             text,
  hargis_refnums            text,
  hargis_name               text,
  hargis_location           text,
  hargis_nr_eval            text,
  hargis_category           text,
  hargis_arch_class         text,
  hargis_current_function   text,
  hargis_historic_function  text,
  hargis_wall_materials     text,
  hargis_architect          text,
  hargis_builder            text,
  hargis_begin_year         integer,
  hargis_end_year           integer,
  hargis_survey_date        text,
  hargis_survey_year        integer,
  hargis_opinion_significance text,
  hargis_photo_count        integer,
  hargis_pdf_count          integer,
  hargis_photo_url          text,
  hargis_pdf_url            text,
  hargis_photos_json        jsonb,
  hargis_pdfs_json          jsonb,
  hargis_match_method       text,
  hargis_records_json       jsonb,

  civic_record_count        integer,
  civic_records_json        jsonb,
  directory_record_count    integer,
  directory_records_json    jsonb,
  sanborn_snapshot_count    integer,
  sanborn_snapshots_json    jsonb,
  paper_trail_record_count  integer,
  paper_trail_records_json  jsonb,
  recognized_history_count  integer,
  recognized_history_json   jsonb,
  land_family_record_count  integer,
  land_family_records_json  jsonb,

  house_evolution_timeline  jsonb,

  centroid_in_target_boundary boolean,
  intersects_target_boundary  boolean,

  geometry geometry(Geometry, 4326),

  imported_at timestamptz default now()
);

create index if not exists parcels_address_idx      on parcels (lower(address));
create index if not exists parcels_street_block_idx on parcels (street_block_id);
create index if not exists parcels_year_built_idx   on parcels (year_built);
create index if not exists parcels_geometry_idx     on parcels using gist (geometry);

alter table parcels enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'parcels' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on parcels for select using (true)';
  end if;
end $$;
