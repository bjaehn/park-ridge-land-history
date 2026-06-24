-- Sprint B: parcel-to-lot spatial matching function.
--
-- Creates run_parcel_lot_matching() which populates parcel_lot_relationships
-- by spatially intersecting gis_parcels against gis_lots in PostGIS.
-- Call it once after ingesting both tables; safe to re-run (clears prior
-- spatial matches before re-inserting).
--
-- The function processes parcels in batches of v_batch_size to stay within
-- statement timeout limits. Each batch is committed independently.
--
-- Usage (via supabase MCP or SQL editor):
--   select run_parcel_lot_matching();
--   select run_parcel_lot_matching(min_overlap_sqm => 0.5, batch_size => 2000);

create or replace function run_parcel_lot_matching(
  min_overlap_sqm  numeric default 1.0,
  batch_size       integer default 2000
)
returns json
language plpgsql
security definer
set statement_timeout = '0'          -- disable timeout for this session
as $$
declare
  v_total_parcels  bigint;
  v_offset         bigint := 0;
  v_inserted       bigint := 0;
  v_batch_inserted bigint;
  v_start          timestamptz := now();
  v_dominant_marked bigint;
begin

  -- ── 0. Clear prior spatial matches (preserve deed_confirmed / manual) ────
  delete from parcel_lot_relationships
  where match_method = 'spatial';

  -- ── 1. Count parcels to process ──────────────────────────────────────────
  select count(*) into v_total_parcels
  from gis_parcels
  where pin_normalized is not null;

  raise notice 'Starting parcel-lot matching: % parcels, batch_size=%',
               v_total_parcels, batch_size;

  -- ── 2. Batch loop ─────────────────────────────────────────────────────────
  loop
    exit when v_offset >= v_total_parcels;

    with batch_parcels as (
      select id, pin_normalized, geometry
      from   gis_parcels
      where  pin_normalized is not null
      order  by id
      limit  batch_size
      offset v_offset
    ),
    intersections as (
      select
        p.id                                                         as parcel_id,
        l.id                                                         as lot_id,
        p.pin_normalized,
        ST_Area(ST_Intersection(p.geometry, l.geometry)::geography)  as overlap_sqm,
        ST_Area(p.geometry::geography)                               as parcel_sqm,
        ST_Area(l.geometry::geography)                               as lot_sqm
      from   batch_parcels p
      join   gis_lots l on ST_Intersects(p.geometry, l.geometry)
      where  ST_Area(ST_Intersection(p.geometry, l.geometry)::geography) >= min_overlap_sqm
    )
    insert into parcel_lot_relationships (
      parcel_id, lot_id, pin_normalized,
      overlap_area_sqm, overlap_pct_of_parcel, overlap_pct_of_lot,
      relationship_type, match_confidence, match_method, is_dominant_lot
    )
    select
      parcel_id,
      lot_id,
      pin_normalized,
      round(overlap_sqm::numeric,            2),
      round((overlap_sqm / nullif(parcel_sqm, 0) * 100)::numeric, 2),
      round((overlap_sqm / nullif(lot_sqm,    0) * 100)::numeric, 2),
      -- relationship_type
      case
        when (overlap_sqm / nullif(parcel_sqm, 0)) >= 0.90
         and (overlap_sqm / nullif(lot_sqm,    0)) >= 0.90
        then 'exact_or_near_exact'
        when (overlap_sqm / nullif(lot_sqm,    0)) >= 0.97
        then 'parcel_contains_lot'
        when (overlap_sqm / nullif(parcel_sqm, 0)) >= 0.90
        then 'lot_contains_parcel'
        when (overlap_sqm / nullif(parcel_sqm, 0)) >= 0.40
        then 'parcel_part_of_lot'
        else 'ambiguous'
      end,
      -- match_confidence
      case
        when (overlap_sqm / nullif(parcel_sqm, 0)) >= 0.85 then 'high'
        when (overlap_sqm / nullif(parcel_sqm, 0)) >= 0.40 then 'medium'
        else 'low'
      end,
      'spatial',
      false          -- is_dominant_lot assigned in step 3
    from intersections
    on conflict (parcel_id, lot_id) do nothing;

    get diagnostics v_batch_inserted = row_count;
    v_inserted := v_inserted + v_batch_inserted;
    v_offset   := v_offset   + batch_size;

    raise notice '  offset=% → +% pairs (total %)',
                 v_offset - batch_size, v_batch_inserted, v_inserted;
  end loop;

  -- ── 3. Label parcels that meaningfully span multiple lots ─────────────────
  -- A parcel "spans multiple lots" when it has >= 2 lots each covering
  -- at least 20 % of the parcel area.
  with multi as (
    select parcel_id
    from   parcel_lot_relationships
    where  match_method    = 'spatial'
      and  overlap_pct_of_parcel >= 20
    group  by parcel_id
    having count(*) >= 2
  )
  update parcel_lot_relationships plr
  set    relationship_type = 'parcel_spans_multiple_lots'
  from   multi
  where  plr.parcel_id = multi.parcel_id
    and  plr.match_method = 'spatial'
    and  plr.overlap_pct_of_parcel >= 20;

  -- ── 4. Mark dominant lot per parcel (highest overlap_pct_of_parcel) ───────
  with ranked as (
    select id,
           row_number() over (
             partition by parcel_id
             order by overlap_pct_of_parcel desc nulls last,
                      overlap_area_sqm      desc nulls last
           ) as rn
    from parcel_lot_relationships
    where match_method = 'spatial'
  )
  update parcel_lot_relationships plr
  set    is_dominant_lot = true
  from   ranked
  where  plr.id = ranked.id
    and  ranked.rn = 1;

  get diagnostics v_dominant_marked = row_count;

  raise notice 'Done: % pairs inserted, % dominant lots marked, elapsed %s',
               v_inserted, v_dominant_marked,
               round(extract(epoch from (now() - v_start))::numeric, 1);

  return json_build_object(
    'pairs_inserted',       v_inserted,
    'dominant_lots_marked', v_dominant_marked,
    'elapsed_seconds',      round(extract(epoch from (now() - v_start))::numeric, 1)
  );
end;
$$;

grant execute on function run_parcel_lot_matching(numeric, integer)
  to service_role, authenticated;
