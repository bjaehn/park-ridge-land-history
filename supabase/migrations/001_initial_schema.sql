-- Park Ridge Land History — Initial Supabase Schema
-- Designed to mirror the existing flat-file data model and support
-- future real-time querying, AI summaries, and ranked insights.

-- ─── Extensions ───────────────────────────────────────────────────────────
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ─── Source Tracking ──────────────────────────────────────────────────────

create table if not exists data_import_runs (
  id             uuid primary key default gen_random_uuid(),
  run_at         timestamptz not null default now(),
  source_id      text not null,
  record_count   integer,
  status         text not null default 'pending', -- pending | success | error
  error_message  text,
  run_metadata   jsonb
);

-- ─── Spatial Reference ────────────────────────────────────────────────────

create table if not exists neighborhoods (
  id             text primary key,              -- e.g. "uptown", "south_park"
  label          text not null,
  description    text,
  bounds_json    jsonb,                         -- {min_lat, max_lat, min_lng, max_lng}
  geometry       geometry(multipolygon, 4326),
  created_at     timestamptz not null default now()
);

create table if not exists blocks (
  id             text primary key,             -- Census tabulation block GEOID or derived ID
  tract_id       text,
  neighborhood_id text references neighborhoods(id),
  geometry       geometry(multipolygon, 4326),
  parcel_count   integer,
  source_id      text,
  created_at     timestamptz not null default now()
);

-- ─── Properties ───────────────────────────────────────────────────────────

create table if not exists properties (
  id                   uuid primary key default gen_random_uuid(),
  pin                  text not null unique,       -- 14-digit normalized PIN
  pin_formatted        text,                       -- 09-21-100-001-0000 format
  address              text,
  municipality         text default 'CITY OF PARK RIDGE',
  property_class       text,
  year_built           integer,
  decade_built         text,
  building_sqft        numeric,
  land_sqft            numeric,
  improvement_count    integer,
  block_id             text references blocks(id),
  neighborhood_id      text references neighborhoods(id),
  geometry             geometry(geometry, 4326),   -- parcel polygon
  data_quality_flags   text[],
  source_note          text,
  import_run_id        uuid references data_import_runs(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists properties_pin_idx on properties(pin);
create index if not exists properties_address_trgm on properties using gin(address gin_trgm_ops);
create index if not exists properties_neighborhood_idx on properties(neighborhood_id);
create index if not exists properties_block_idx on properties(block_id);
create index if not exists properties_geometry_idx on properties using gist(geometry);

-- ─── Sales ────────────────────────────────────────────────────────────────

create table if not exists sales (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid references properties(id) on delete cascade,
  pin            text not null,
  sale_date      date,
  sale_year      integer,
  sale_price     numeric,
  deed_type      text,
  is_market_sale boolean,
  document_number text,
  source_id      text default 'cook-county-assessor-sales',
  import_run_id  uuid references data_import_runs(id),
  raw_record     jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists sales_property_idx on sales(property_id);
create index if not exists sales_pin_idx on sales(pin);
create index if not exists sales_year_idx on sales(sale_year);

-- ─── Assessments ──────────────────────────────────────────────────────────

create table if not exists assessments (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid references properties(id) on delete cascade,
  pin            text not null,
  assessment_year integer not null,
  certified_total numeric,
  certified_land  numeric,
  certified_bldg  numeric,
  class_code     text,
  source_id      text default 'cook-county-assessor-values',
  import_run_id  uuid references data_import_runs(id),
  raw_record     jsonb,
  created_at     timestamptz not null default now(),
  unique(pin, assessment_year)
);

create index if not exists assessments_property_idx on assessments(property_id);
create index if not exists assessments_pin_idx on assessments(pin);

-- ─── Appeals ──────────────────────────────────────────────────────────────

create table if not exists appeals (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid references properties(id) on delete cascade,
  pin            text not null,
  appeal_year    integer,
  outcome        text,                            -- reduction | no_change | increase | pending
  reduction_amount numeric,
  assessable     text,
  source_id      text default 'cook-county-assessor-appeals',
  import_run_id  uuid references data_import_runs(id),
  raw_record     jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists appeals_property_idx on appeals(property_id);
create index if not exists appeals_pin_idx on appeals(pin);

-- ─── Permits ──────────────────────────────────────────────────────────────

create table if not exists permits (
  id                    uuid primary key default gen_random_uuid(),
  property_id           uuid references properties(id) on delete cascade,
  pin                   text not null,
  permit_number         text,
  local_permit_number   text,
  permit_type           text,                     -- demolition | new_construction | addition | remodel | other
  description           text,
  status                text,
  date_issued           date,
  estimated_completion  date,
  job_code              text,
  assessable            text,
  municipality          text,
  source_id             text default 'cook-county-assessor-permits',
  import_run_id         uuid references data_import_runs(id),
  raw_record            jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists permits_property_idx on permits(property_id);
create index if not exists permits_pin_idx on permits(pin);
create index if not exists permits_type_idx on permits(permit_type);
create index if not exists permits_date_idx on permits(date_issued);

-- ─── Property Events (Unified Timeline) ───────────────────────────────────

create table if not exists property_events (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid references properties(id) on delete cascade,
  pin            text not null,
  event_type     text not null,    -- original_build | sale | permit | assessment | appeal | historic_survey | ...
  event_year     integer,
  event_date     date,
  title          text not null,
  description    text,
  price          numeric,
  amount         numeric,
  source_record_id text,           -- FK to source table record
  source_id      text,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists property_events_property_idx on property_events(property_id);
create index if not exists property_events_pin_idx on property_events(pin);
create index if not exists property_events_year_idx on property_events(event_year);
create index if not exists property_events_type_idx on property_events(event_type);

-- ─── Historic Survey Records ──────────────────────────────────────────────

create table if not exists historic_survey_records (
  id                   uuid primary key default gen_random_uuid(),
  property_id          uuid references properties(id) on delete cascade,
  pin                  text,
  survey_name          text,        -- e.g. "Hargis Survey"
  refnum               text,
  record_name          text,
  location_text        text,
  nr_evaluation        text,
  category             text,
  arch_class           text,
  current_function     text,
  historic_function    text,
  wall_materials       text,
  architect            text,
  builder              text,
  begin_year           integer,
  end_year             integer,
  survey_date          date,
  opinion_significance text,
  match_method         text,
  photo_url            text,
  pdf_url              text,
  source_id            text default 'hargis-survey',
  import_run_id        uuid references data_import_runs(id),
  created_at           timestamptz not null default now()
);

create index if not exists historic_survey_property_idx on historic_survey_records(property_id);

-- ─── Map Layers ───────────────────────────────────────────────────────────

create table if not exists map_layers (
  id             text primary key,
  label          text not null,
  year           integer,
  status         text,              -- ready | needs_download | needs_georeferencing | manual_research_required
  layer_type     text,              -- parcel_snapshot | aerial | sanborn | building_footprints | ...
  description    text,
  data_url       text,
  tile_url       text,
  opacity_default numeric default 0.75,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

-- ─── Ranked Insights Cache ─────────────────────────────────────────────────

create table if not exists ranked_insights (
  id               uuid primary key default gen_random_uuid(),
  entity_type      text not null,   -- property | block | neighborhood | citywide
  metric_id        text not null,   -- most_sold | most_permits | oldest | ...
  entity_id        text,            -- pin for property, id for block/neighborhood
  rank_position    integer,
  metric_value     numeric,
  metric_label     text,
  display_label    text,
  secondary_label  text,
  computed_at      timestamptz not null default now(),
  data_version     text,
  unique(entity_type, metric_id, entity_id)
);

create index if not exists ranked_insights_type_metric on ranked_insights(entity_type, metric_id);

-- ─── AI Summaries Cache ────────────────────────────────────────────────────

create table if not exists ai_summaries (
  id               uuid primary key default gen_random_uuid(),
  entity_type      text not null,   -- property | block | neighborhood | citywide
  entity_id        text not null,
  prompt_version   text not null,
  data_version     text,
  source_ids       text[],
  model_id         text,
  overview         text,
  timeline_narrative text,
  changes_narrative  text,
  comparison_narrative text,
  notable_records  jsonb,
  open_questions   jsonb,
  citations        jsonb,
  confidence_notes text,
  generated_at     timestamptz not null default now(),
  expires_at       timestamptz,
  unique(entity_type, entity_id, prompt_version, data_version)
);

create index if not exists ai_summaries_entity on ai_summaries(entity_type, entity_id);

-- ─── Row-level timestamps ─────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger properties_updated_at
  before update on properties
  for each row execute function update_updated_at();
