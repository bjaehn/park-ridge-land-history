-- Sprint C: PAGE_SUBREF → subdivision name mapping infrastructure.
--
-- PAGE_SUBREF is Cook County's internal plat book page reference code
-- (e.g. "1202B_B" = Township 12, Section 02, Plat B, Part B).
-- This table maps those codes to human-readable subdivision names and links
-- them to the subdivisions table.
--
-- Populated by:
--   1. PIN bridge: subdivision_lots.current_pin → gis_parcels →
--      parcel_lot_relationships → gis_lots (deed-confirmed, high confidence)
--   2. Manual entry from Cook County Recorder plat index lookups
--   3. scripts/lookup-page-subref-names.py (automated Recorder/Assessor lookup)
--
-- Once a PAGE_SUBREF is mapped here, run update_gis_lots_subdivision_ids()
-- to propagate the subdivision_id into gis_lots and parcel_lot_relationships.

create table if not exists page_subref_map (
  id               uuid primary key default gen_random_uuid(),
  page_subref      text not null unique,
  subdivision_name text,
  subdivision_id   uuid references subdivisions (id) on delete set null,
  confidence       text not null default 'medium'
                     check (confidence in ('high','medium','low')),
  source           text not null default 'unknown',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists psm_page_subref_idx on page_subref_map (page_subref);
create index if not exists psm_subdivision_id_idx on page_subref_map (subdivision_id)
  where subdivision_id is not null;

alter table page_subref_map enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'page_subref_map' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on page_subref_map for select using (true)';
  end if;
end $$;

grant select on page_subref_map to anon, authenticated;
grant all    on page_subref_map to service_role;

-- Add plat_book_ref column to subdivisions so we can record the
-- Cook County plat book page reference for named subdivisions.
alter table subdivisions
  add column if not exists plat_book_ref text;

create index if not exists subdivisions_plat_book_ref_idx
  on subdivisions (plat_book_ref)
  where plat_book_ref is not null;

-- ─── Seed: PIN-bridge confirmed mappings ─────────────────────────────────────
-- Derived by joining subdivision_lots.current_pin → gis_parcels →
-- parcel_lot_relationships → gis_lots (is_dominant_lot = true, high confidence).
-- Each row is confirmed by a deed legal description on record.

insert into page_subref_map (page_subref, subdivision_name, subdivision_id, confidence, source, notes)
select
  m.page_subref,
  s.name,
  s.id,
  'high',
  'pin_bridge',
  'Confirmed via deed legal description in subdivision_lots'
from (
  values
    ('0935H_B', 'Arthur Dunas Subdivision'),
    ('0926H_F', 'Black''s Addition to Park Ridge'),
    ('1202C_B', 'H. Roy Berry Co''s Devon Avenue Highlands'),
    ('1202B_B', 'Kinsey''s Park Ridge Subdivision'),
    ('0935F_J', 'Shannon and Canfields Subdivision')
) as m(page_subref, subdivision_name)
join subdivisions s on s.name = m.subdivision_name
on conflict (page_subref) do update
  set subdivision_name = excluded.subdivision_name,
      subdivision_id   = excluded.subdivision_id,
      confidence       = excluded.confidence,
      source           = excluded.source,
      updated_at       = now();

-- Also record the plat_book_ref on the subdivisions rows.
update subdivisions s
set plat_book_ref = m.page_subref
from (
  values
    ('Arthur Dunas Subdivision',                  '0935H_B'),
    ('Black''s Addition to Park Ridge',            '0926H_F'),
    ('H. Roy Berry Co''s Devon Avenue Highlands',  '1202C_B'),
    ('Kinsey''s Park Ridge Subdivision',           '1202B_B'),
    ('Shannon and Canfields Subdivision',          '0935F_J')
) as m(name, page_subref)
where s.name = m.name;


-- ─── Function: update_gis_lots_subdivision_ids() ─────────────────────────────
-- Propagates confirmed subdivision_id values from page_subref_map into gis_lots.
-- Safe to call repeatedly; uses ON CONFLICT DO NOTHING logic via UPDATE.
-- Run after adding new rows to page_subref_map.

create or replace function update_gis_lots_subdivision_ids()
returns json
language plpgsql
security definer
as $$
declare
  v_updated_lots bigint;
begin
  -- Join on normalized_subdivision_name so this is safe to re-run after
  -- subdivision_name has already been overwritten with the human-readable name.
  update gis_lots gl
  set    subdivision_id   = psm.subdivision_id,
         subdivision_name = psm.subdivision_name
  from   page_subref_map psm
  where  lower(gl.normalized_subdivision_name) = lower(psm.page_subref)
    and  psm.subdivision_id  is not null
    and  (gl.subdivision_id is distinct from psm.subdivision_id);

  get diagnostics v_updated_lots = row_count;

  raise notice 'Updated % gis_lots rows with subdivision_id', v_updated_lots;

  return json_build_object(
    'gis_lots_updated', v_updated_lots
  );
end;
$$;

grant execute on function update_gis_lots_subdivision_ids() to service_role, authenticated;

-- Run immediately to propagate the seed mappings.
select update_gis_lots_subdivision_ids();
