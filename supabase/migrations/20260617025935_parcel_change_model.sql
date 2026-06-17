-- Temporal parcel change model + neighborhood schema
--
-- Adds the following new tables:
--   parcel_change_events        – one row per moment parcel boundaries legally changed
--   parcel_lineage_edges        – many-to-many predecessor/successor PIN mapping per event
--   parcel_change_sources       – links change events to subdivision_sources citations
--   parcel_addresses            – multiple addresses per PIN with optional date range
--   subdivision_constituent_lots – lots that *define* a child subdivision in a parent plat
--   neighborhoods               – canonical neighborhood entities
--   neighborhood_names          – historical/alternate names for a neighborhood
--   neighborhood_boundaries     – historical boundary polygons per neighborhood
--   parcel_neighborhood_links   – explicit historical parcel-to-neighborhood assignments
--
-- Extends existing tables:
--   property_subdivision_links  – valid_from, valid_to, source_id
--   subdivision_lots            – recorded_date, valid_from, valid_to, source_id
--
-- No existing tables are dropped or structurally broken.
-- No seed data – tables are populated as historical research proceeds.

-- ─── parcel_change_events ────────────────────────────────────────────────────

create table if not exists parcel_change_events (
  id               uuid primary key default gen_random_uuid(),
  event_type       text not null check (event_type in (
                     'subdivision',   -- one parcel split into many
                     'consolidation', -- many parcels merged into one
                     'resubdivision', -- boundary redrawn within a plat
                     'boundary_adj',  -- minor adjustment, no new plat
                     'creation',      -- initial parcel creation (no predecessor)
                     'annexation'     -- added to municipality
                   )),
  event_date       date,
  event_year       integer,
  date_precision   text not null default 'unknown'
                     check (date_precision in ('exact', 'year', 'approximate', 'unknown')),
  description      text,
  plat_book        text,
  plat_page        text,
  document_number  text,
  confidence_level text not null default 'unknown'
                     check (confidence_level in ('high', 'medium', 'low', 'unknown')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists parcel_change_events_year_idx on parcel_change_events (event_year);
create index if not exists parcel_change_events_type_idx on parcel_change_events (event_type);

alter table parcel_change_events enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parcel_change_events' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on parcel_change_events for select using (true)';
  end if;
end $$;

-- ─── parcel_lineage_edges ────────────────────────────────────────────────────
-- One row per (event, PIN, side) triple.
-- A split event: 1 predecessor row + N successor rows.
-- A consolidation event: N predecessor rows + 1 successor row.
-- No FK to parcels.pin_normalized because predecessor PINs are retired.

create table if not exists parcel_lineage_edges (
  id              uuid primary key default gen_random_uuid(),
  change_event_id uuid not null references parcel_change_events (id) on delete cascade,
  pin             text not null,
  side            text not null check (side in ('predecessor', 'successor')),
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists parcel_lineage_event_idx on parcel_lineage_edges (change_event_id);
create index if not exists parcel_lineage_pin_idx   on parcel_lineage_edges (pin);

alter table parcel_lineage_edges enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parcel_lineage_edges' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on parcel_lineage_edges for select using (true)';
  end if;
end $$;

-- ─── parcel_change_sources ───────────────────────────────────────────────────
-- One change event may be supported by multiple source citations.

create table if not exists parcel_change_sources (
  id              uuid primary key default gen_random_uuid(),
  change_event_id uuid not null references parcel_change_events (id) on delete cascade,
  source_id       uuid not null references subdivision_sources (id) on delete cascade,
  unique (change_event_id, source_id)
);

create index if not exists parcel_change_sources_event_idx  on parcel_change_sources (change_event_id);
create index if not exists parcel_change_sources_source_idx on parcel_change_sources (source_id);

alter table parcel_change_sources enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parcel_change_sources' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on parcel_change_sources for select using (true)';
  end if;
end $$;

-- ─── parcel_addresses ────────────────────────────────────────────────────────
-- Multiple addresses per PIN with optional temporal range.
-- The parcels.address column remains as a denormalized fast-lookup field;
-- this table is populated when multiple addresses or date ranges are needed.

create table if not exists parcel_addresses (
  id               uuid primary key default gen_random_uuid(),
  pin              text not null,
  address          text not null,
  is_primary       boolean not null default false,
  address_type     text not null default 'street'
                     check (address_type in ('street', 'mailing', 'aka')),
  valid_from       date,
  valid_to         date,
  source_id        uuid references subdivision_sources (id),
  confidence_level text not null default 'unknown'
                     check (confidence_level in ('high', 'medium', 'low', 'unknown')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists parcel_addresses_pin_idx on parcel_addresses (pin);

alter table parcel_addresses enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parcel_addresses' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on parcel_addresses for select using (true)';
  end if;
end $$;

-- ─── subdivision_constituent_lots ────────────────────────────────────────────
-- Records that a subdivision entity is *defined by* a named set of lots from
-- its parent subdivision. Answers: "what lots in the parent plat constitute
-- this child subdivision?"
--
-- Distinct from subdivision_lots, which maps modern PINs to historical lots.
-- Use lot_number for a single exact lot; use lot_range_start + lot_range_end
-- for a contiguous range (e.g. Lots 1-5 in Block 2).

create table if not exists subdivision_constituent_lots (
  id                    uuid primary key default gen_random_uuid(),
  subdivision_id        uuid not null references subdivisions (id) on delete cascade,
  parent_subdivision_id uuid not null references subdivisions (id),
  lot_number            text,
  lot_range_start       text,
  lot_range_end         text,
  block_number          text,
  source_id             uuid references subdivision_sources (id),
  confidence_level      text not null default 'unknown'
                          check (confidence_level in ('high', 'medium', 'low', 'unknown')),
  notes                 text,
  created_at            timestamptz not null default now()
);

create index if not exists subdiv_constituent_subdiv_idx on subdivision_constituent_lots (subdivision_id);
create index if not exists subdiv_constituent_parent_idx on subdivision_constituent_lots (parent_subdivision_id);

alter table subdivision_constituent_lots enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subdivision_constituent_lots' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on subdivision_constituent_lots for select using (true)';
  end if;
end $$;

-- ─── neighborhoods ───────────────────────────────────────────────────────────

create table if not exists neighborhoods (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text unique,
  description        text,
  historical_summary text,
  established_year   integer,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists neighborhoods_slug_idx on neighborhoods (slug);

alter table neighborhoods enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'neighborhoods' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on neighborhoods for select using (true)';
  end if;
end $$;

-- ─── neighborhood_names ──────────────────────────────────────────────────────
-- Historical and alternate names for a neighborhood, with date ranges.

create table if not exists neighborhood_names (
  id              uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods (id) on delete cascade,
  name            text not null,
  valid_from      date,
  valid_to        date,
  source_id       uuid references subdivision_sources (id),
  confidence_level text not null default 'unknown'
                    check (confidence_level in ('high', 'medium', 'low', 'unknown')),
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists neighborhood_names_neighborhood_idx on neighborhood_names (neighborhood_id);

alter table neighborhood_names enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'neighborhood_names' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on neighborhood_names for select using (true)';
  end if;
end $$;

-- ─── neighborhood_boundaries ─────────────────────────────────────────────────
-- Historical boundary polygons for a neighborhood.

create table if not exists neighborhood_boundaries (
  id              uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods (id) on delete cascade,
  geometry        geometry(Geometry, 4326),
  valid_from      date,
  valid_to        date,
  boundary_source text,
  source_id       uuid references subdivision_sources (id),
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists neighborhood_boundaries_neighborhood_idx
  on neighborhood_boundaries (neighborhood_id);
create index if not exists neighborhood_boundaries_geom_idx
  on neighborhood_boundaries using gist (geometry);

alter table neighborhood_boundaries enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'neighborhood_boundaries' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on neighborhood_boundaries for select using (true)';
  end if;
end $$;

-- ─── parcel_neighborhood_links ───────────────────────────────────────────────
-- Explicit historical parcel-to-neighborhood assignments.
-- Use when spatial inference from neighborhood_boundaries is insufficient
-- (boundary disputes, pre-definition historical records, manual overrides).

create table if not exists parcel_neighborhood_links (
  id               uuid primary key default gen_random_uuid(),
  pin              text not null,
  neighborhood_id  uuid not null references neighborhoods (id) on delete cascade,
  valid_from       date,
  valid_to         date,
  method           text check (method in ('spatial', 'manual', 'historical_record')),
  source_id        uuid references subdivision_sources (id),
  confidence_level text not null default 'unknown'
                     check (confidence_level in ('high', 'medium', 'low', 'unknown')),
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists parcel_neighborhood_links_pin_idx on parcel_neighborhood_links (pin);
create index if not exists parcel_neighborhood_links_nbhd_idx on parcel_neighborhood_links (neighborhood_id);

alter table parcel_neighborhood_links enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parcel_neighborhood_links' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on parcel_neighborhood_links for select using (true)';
  end if;
end $$;

-- ─── Extensions to existing tables ──────────────────────────────────────────

-- property_subdivision_links: add temporal range and source FK
alter table property_subdivision_links
  add column if not exists valid_from date,
  add column if not exists valid_to   date,
  add column if not exists source_id  uuid references subdivision_sources (id);

-- subdivision_lots: add typed date column alongside existing text document_date,
-- plus temporal range and source FK
alter table subdivision_lots
  add column if not exists recorded_date date,
  add column if not exists valid_from    date,
  add column if not exists valid_to      date,
  add column if not exists source_id     uuid references subdivision_sources (id);
