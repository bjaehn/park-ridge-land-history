-- parcel_lot_relationships: spatial overlap results between tax parcels and plat lots.
--
-- Each row records one parcel-to-lot intersection event with full metrics.
-- A single parcel may have multiple rows (one per overlapping lot).
-- is_dominant_lot flags the best-matching lot for each parcel.
--
-- This table is populated by scripts/match-parcels-to-lots.py (Sprint B).
-- The matching RPC function is also defined here for PostGIS execution.

create table if not exists parcel_lot_relationships (
  id                        uuid primary key default gen_random_uuid(),
  parcel_id                 uuid references gis_parcels (id) on delete cascade,
  lot_id                    uuid references gis_lots (id) on delete cascade,
  pin_normalized            text not null,
  overlap_area_sqm          numeric,
  overlap_pct_of_parcel     numeric,
  overlap_pct_of_lot        numeric,
  relationship_type         text not null
                              check (relationship_type in (
                                'exact_or_near_exact',
                                'parcel_contains_lot',
                                'lot_contains_parcel',
                                'parcel_part_of_lot',
                                'parcel_spans_multiple_lots',
                                'ambiguous',
                                'no_clear_match'
                              )),
  match_confidence          text not null default 'unknown'
                              check (match_confidence in ('high','medium','low','unknown')),
  match_method              text not null default 'spatial'
                              check (match_method in ('spatial','deed_confirmed','manual')),
  is_dominant_lot           boolean not null default false,
  notes                     text,
  created_at                timestamptz not null default now(),
  unique (parcel_id, lot_id)
);

create index if not exists plr_pin_idx
  on parcel_lot_relationships (pin_normalized);
create index if not exists plr_parcel_id_idx
  on parcel_lot_relationships (parcel_id);
create index if not exists plr_lot_id_idx
  on parcel_lot_relationships (lot_id);
create index if not exists plr_relationship_type_idx
  on parcel_lot_relationships (relationship_type);
create index if not exists plr_confidence_idx
  on parcel_lot_relationships (match_confidence);
create index if not exists plr_dominant_idx
  on parcel_lot_relationships (pin_normalized, is_dominant_lot)
  where is_dominant_lot = true;

alter table parcel_lot_relationships enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parcel_lot_relationships' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on parcel_lot_relationships for select using (true)';
  end if;
end $$;

grant select on parcel_lot_relationships to anon, authenticated;

-- ─── RPC: get_land_ancestry_for_pin ──────────────────────────────────────────
-- Returns the dominant plat lot match for a given PIN, plus subdivision and
-- source details. Used by the property page Land Ancestry panel.
-- Returns null fields when no match exists (caller shows fallback state).

create or replace function get_land_ancestry_for_pin(p_pin text)
returns table (
  pin_normalized            text,
  lot_id                    uuid,
  lot_number                text,
  block_number              text,
  subdivision_name          text,
  normalized_subdivision_name text,
  subdivision_id            uuid,
  township                  text,
  range                     text,
  section                   text,
  plss_description          text,
  relationship_type         text,
  match_confidence          text,
  match_method              text,
  overlap_pct_of_parcel     numeric,
  overlap_pct_of_lot        numeric,
  source_name               text,
  source_url                text,
  source_retrieved_at       timestamptz,
  notes                     text
)
language sql
stable
security definer
as $$
  select
    plr.pin_normalized,
    l.id                          as lot_id,
    l.lot_number,
    l.block_number,
    l.subdivision_name,
    l.normalized_subdivision_name,
    l.subdivision_id,
    l.township,
    l.range,
    l.section,
    l.plss_description,
    plr.relationship_type,
    plr.match_confidence,
    plr.match_method,
    plr.overlap_pct_of_parcel,
    plr.overlap_pct_of_lot,
    sr.source_name,
    sr.source_url,
    sr.retrieved_at               as source_retrieved_at,
    plr.notes
  from parcel_lot_relationships plr
  join gis_lots l on l.id = plr.lot_id
  left join source_registry sr on sr.id = l.source_id
  where plr.pin_normalized = p_pin
    and plr.is_dominant_lot = true
  limit 1;
$$;

grant execute on function get_land_ancestry_for_pin(text) to anon, authenticated;

-- ─── RPC: get_all_lots_for_pin ────────────────────────────────────────────────
-- Returns all overlapping plat lots for a PIN (not just the dominant one).
-- Used when a parcel spans multiple historical lots.

create or replace function get_all_lots_for_pin(p_pin text)
returns table (
  lot_id                    uuid,
  lot_number                text,
  block_number              text,
  subdivision_name          text,
  subdivision_id            uuid,
  relationship_type         text,
  match_confidence          text,
  overlap_pct_of_parcel     numeric,
  overlap_pct_of_lot        numeric,
  is_dominant_lot           boolean
)
language sql
stable
security definer
as $$
  select
    l.id                      as lot_id,
    l.lot_number,
    l.block_number,
    l.subdivision_name,
    l.subdivision_id,
    plr.relationship_type,
    plr.match_confidence,
    plr.overlap_pct_of_parcel,
    plr.overlap_pct_of_lot,
    plr.is_dominant_lot
  from parcel_lot_relationships plr
  join gis_lots l on l.id = plr.lot_id
  where plr.pin_normalized = p_pin
  order by plr.is_dominant_lot desc, plr.overlap_pct_of_parcel desc nulls last;
$$;

grant execute on function get_all_lots_for_pin(text) to anon, authenticated;

-- ─── RPC: parcel_lot_match_summary ───────────────────────────────────────────
-- Aggregate stats for admin/QA dashboard.

create or replace function parcel_lot_match_summary()
returns json
language sql
stable
security definer
as $$
  select json_build_object(
    'total_gis_parcels',
      (select count(*) from gis_parcels),
    'total_gis_lots',
      (select count(*) from gis_lots),
    'total_relationships',
      (select count(*) from parcel_lot_relationships),
    'parcels_with_dominant_match',
      (select count(distinct pin_normalized) from parcel_lot_relationships where is_dominant_lot = true),
    'high_confidence',
      (select count(*) from parcel_lot_relationships where match_confidence = 'high' and is_dominant_lot = true),
    'medium_confidence',
      (select count(*) from parcel_lot_relationships where match_confidence = 'medium' and is_dominant_lot = true),
    'low_confidence',
      (select count(*) from parcel_lot_relationships where match_confidence = 'low' and is_dominant_lot = true),
    'relationship_type_counts',
      (select json_object_agg(relationship_type, cnt)
       from (
         select relationship_type, count(*) as cnt
         from parcel_lot_relationships
         where is_dominant_lot = true
         group by relationship_type
       ) t)
  );
$$;

grant execute on function parcel_lot_match_summary() to anon, authenticated;
