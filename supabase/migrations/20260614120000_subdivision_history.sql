-- Subdivision History MVP schema.
--
-- Creates tables for subdivisions, lot-level data, property links,
-- historical land units, timeline events, sources, and map layers.
--
-- Also adds denormalized subdivision summary columns to the parcels table
-- so existing parcel queries can surface subdivision data without a join.
--
-- Tables:
--   subdivisions                – one row per recorded subdivision
--   subdivision_geometries      – geometry records (may have multiple per subdivision)
--   subdivision_lots            – individual lot/block records within a subdivision
--   property_subdivision_links  – FK links between parcels and subdivisions
--   historical_land_units       – pre-subdivision farms, tracts, and large parcels
--   subdivision_timeline_events – events in a subdivision's history
--   subdivision_sources         – source citations for subdivision records
--   historical_map_layers       – map layer registry for historical overlays
--
-- All tables use row-level security and allow public read access.

-- ─── Denormalized columns on parcels ─────────────────────────────────────────

alter table parcels
  add column if not exists subdivision_name         text,
  add column if not exists subdivision_id           uuid,
  add column if not exists subdivision_lot          text,
  add column if not exists subdivision_block        text,
  add column if not exists subdivision_match_method text,
  add column if not exists subdivision_confidence   text,
  add column if not exists subdivision_source       text;

create index if not exists parcels_subdivision_id_idx   on parcels (subdivision_id);
create index if not exists parcels_subdivision_name_idx on parcels (lower(subdivision_name));

-- ─── subdivisions ─────────────────────────────────────────────────────────────

create table if not exists subdivisions (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  normalized_name     text not null,
  alternate_names     text[],
  recorded_date       date,
  recorded_year       integer,
  plat_book           text,
  plat_page           text,
  document_number     text,
  original_owner      text,
  developer           text,
  surveyor            text,
  source_name         text,
  source_reference    text,
  source_url          text,
  confidence_level    text not null default 'unknown'
                        check (confidence_level in ('high','medium','low','unknown')),
  confidence_reason   text,
  notes               text,
  parcel_count        integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists subdivisions_normalized_name_idx on subdivisions (normalized_name);
create index if not exists subdivisions_recorded_year_idx   on subdivisions (recorded_year);
create index if not exists subdivisions_confidence_idx      on subdivisions (confidence_level);

alter table subdivisions enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'subdivisions' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on subdivisions for select using (true)';
  end if;
end $$;

-- ─── subdivision_geometries ───────────────────────────────────────────────────

create table if not exists subdivision_geometries (
  id                      uuid primary key default gen_random_uuid(),
  subdivision_id          uuid not null references subdivisions (id) on delete cascade,
  geometry                geometry(Geometry, 4326),
  geometry_source         text,
  geometry_method         text,
  georeference_confidence text,
  valid_from              date,
  valid_to                date,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists subdivision_geom_subdivision_id_idx on subdivision_geometries (subdivision_id);
create index if not exists subdivision_geom_geometry_idx       on subdivision_geometries using gist (geometry);

alter table subdivision_geometries enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'subdivision_geometries' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on subdivision_geometries for select using (true)';
  end if;
end $$;

-- ─── subdivision_lots ─────────────────────────────────────────────────────────

create table if not exists subdivision_lots (
  id                      uuid primary key default gen_random_uuid(),
  subdivision_id          uuid not null references subdivisions (id) on delete cascade,
  lot_number              text,
  block_number            text,
  original_geometry       geometry(Geometry, 4326),
  current_pin             text,
  current_address         text,
  current_parcel_geometry geometry(Geometry, 4326),
  lot_status              text,
  match_method            text,
  confidence_level        text not null default 'unknown'
                            check (confidence_level in ('high','medium','low','unknown')),
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists subdivision_lots_subdivision_id_idx on subdivision_lots (subdivision_id);
create index if not exists subdivision_lots_current_pin_idx    on subdivision_lots (current_pin);
create index if not exists subdivision_lots_block_lot_idx      on subdivision_lots (block_number, lot_number);

alter table subdivision_lots enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'subdivision_lots' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on subdivision_lots for select using (true)';
  end if;
end $$;

-- ─── property_subdivision_links ───────────────────────────────────────────────

create table if not exists property_subdivision_links (
  id                  uuid primary key default gen_random_uuid(),
  property_id         text,
  pin                 text,
  address             text,
  subdivision_id      uuid references subdivisions (id) on delete set null,
  lot_number          text,
  block_number        text,
  match_method        text not null,
  confidence_level    text not null default 'unknown'
                        check (confidence_level in ('high','medium','low','unknown')),
  confidence_reason   text,
  source_name         text,
  source_reference    text,
  generated_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (pin, subdivision_id)
);

create index if not exists psl_pin_idx            on property_subdivision_links (pin);
create index if not exists psl_subdivision_id_idx on property_subdivision_links (subdivision_id);
create index if not exists psl_confidence_idx     on property_subdivision_links (confidence_level);

alter table property_subdivision_links enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'property_subdivision_links' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on property_subdivision_links for select using (true)';
  end if;
end $$;

-- ─── historical_land_units ────────────────────────────────────────────────────

create table if not exists historical_land_units (
  id                  uuid primary key default gen_random_uuid(),
  name                text,
  owner_name          text,
  land_type           text,
  map_year            integer,
  acreage             numeric,
  source_map          text,
  source_reference    text,
  geometry            geometry(Geometry, 4326),
  geometry_method     text,
  confidence_level    text not null default 'unknown'
                        check (confidence_level in ('high','medium','low','unknown')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists hlu_geometry_idx on historical_land_units using gist (geometry);

alter table historical_land_units enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'historical_land_units' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on historical_land_units for select using (true)';
  end if;
end $$;

-- ─── subdivision_timeline_events ──────────────────────────────────────────────

create table if not exists subdivision_timeline_events (
  id                  uuid primary key default gen_random_uuid(),
  subdivision_id      uuid not null references subdivisions (id) on delete cascade,
  event_year          integer,
  event_date          date,
  event_type          text not null,
  title               text not null,
  description         text,
  source_name         text,
  source_reference    text,
  confidence_level    text not null default 'unknown'
                        check (confidence_level in ('high','medium','low','unknown')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists ste_subdivision_id_idx on subdivision_timeline_events (subdivision_id);
create index if not exists ste_event_year_idx     on subdivision_timeline_events (event_year);

alter table subdivision_timeline_events enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'subdivision_timeline_events' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on subdivision_timeline_events for select using (true)';
  end if;
end $$;

-- ─── subdivision_sources ──────────────────────────────────────────────────────

create table if not exists subdivision_sources (
  id                  uuid primary key default gen_random_uuid(),
  subdivision_id      uuid references subdivisions (id) on delete cascade,
  source_type         text,
  source_name         text not null,
  source_reference    text,
  source_url          text,
  retrieved_at        timestamptz,
  notes               text
);

create index if not exists ss_subdivision_id_idx on subdivision_sources (subdivision_id);

alter table subdivision_sources enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'subdivision_sources' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on subdivision_sources for select using (true)';
  end if;
end $$;

-- ─── historical_map_layers ────────────────────────────────────────────────────

create table if not exists historical_map_layers (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  year                integer,
  source_name         text,
  source_reference    text,
  tile_url_or_path    text,
  georeferenced       boolean not null default false,
  attribution         text,
  confidence_level    text not null default 'unknown'
                        check (confidence_level in ('high','medium','low','unknown')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table historical_map_layers enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'historical_map_layers' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on historical_map_layers for select using (true)';
  end if;
end $$;

-- ─── RPC helpers ─────────────────────────────────────────────────────────────

-- Returns summary stats about subdivision coverage.
create or replace function subdivision_qa_stats()
returns json
language sql
stable
security definer
as $$
  select json_build_object(
    'total_subdivisions',        (select count(*) from subdivisions),
    'with_recorded_year',        (select count(*) from subdivisions where recorded_year is not null),
    'high_confidence',           (select count(*) from subdivisions where confidence_level = 'high'),
    'medium_confidence',         (select count(*) from subdivisions where confidence_level = 'medium'),
    'low_confidence',            (select count(*) from subdivisions where confidence_level = 'low'),
    'unknown_confidence',        (select count(*) from subdivisions where confidence_level = 'unknown'),
    'total_links',               (select count(*) from property_subdivision_links),
    'linked_parcels',            (select count(distinct pin) from property_subdivision_links where pin is not null),
    'parcels_with_subdivision',  (select count(*) from parcels where subdivision_name is not null),
    'parcels_without_subdivision',(select count(*) from parcels where subdivision_name is null),
    'total_lots',                (select count(*) from subdivision_lots)
  );
$$;

grant execute on function subdivision_qa_stats() to anon, authenticated;

-- Returns subdivision decade distribution.
create or replace function subdivision_decade_distribution()
returns table (decade text, count bigint)
language sql
stable
security definer
as $$
  select
    case
      when recorded_year is null then 'Unknown'
      else (floor(recorded_year / 10) * 10)::text || 's'
    end as decade,
    count(*) as count
  from subdivisions
  group by 1
  order by
    case when recorded_year is null then 9999 else floor(recorded_year / 10) * 10 end;
$$;

grant execute on function subdivision_decade_distribution() to anon, authenticated;

-- Returns all subdivisions with linked parcel counts.
create or replace function subdivision_index_with_counts()
returns table (
  id                uuid,
  name              text,
  normalized_name   text,
  recorded_year     integer,
  confidence_level  text,
  confidence_reason text,
  source_name       text,
  original_owner    text,
  developer         text,
  parcel_count      integer,
  notes             text
)
language sql
stable
security definer
as $$
  select
    s.id,
    s.name,
    s.normalized_name,
    s.recorded_year,
    s.confidence_level,
    s.confidence_reason,
    s.source_name,
    s.original_owner,
    s.developer,
    coalesce(s.parcel_count, 0) as parcel_count,
    s.notes
  from subdivisions s
  order by s.recorded_year asc nulls last, s.normalized_name asc;
$$;

grant execute on function subdivision_index_with_counts() to anon, authenticated;
