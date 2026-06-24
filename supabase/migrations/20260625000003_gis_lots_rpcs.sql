-- Sprint E: RPCs for subdivision lot table and lots GeoJSON map overlay.
--
-- get_gis_lots_for_subdivision  — tabular data for the lot table UI
-- get_lots_geojson_for_subdivision — FeatureCollection for the map overlay

create or replace function get_gis_lots_for_subdivision(p_subdivision_id uuid)
returns table(
  id               uuid,
  lot_number       text,
  block_number     text,
  pin_normalized   text,
  relationship_type text,
  overlap_pct_of_parcel numeric,
  match_confidence text
)
language sql
security definer
stable
as $$
  select
    gl.id,
    gl.lot_number,
    gl.block_number,
    plr.pin_normalized,
    plr.relationship_type,
    round(plr.overlap_pct_of_parcel::numeric, 1) as overlap_pct_of_parcel,
    plr.match_confidence
  from gis_lots gl
  left join parcel_lot_relationships plr
         on plr.lot_id = gl.id and plr.is_dominant_lot = true
  where gl.subdivision_id = p_subdivision_id
  order by
    gl.block_number nulls last,
    (case when gl.lot_number ~ '^\d+$' then gl.lot_number::integer else 999999 end),
    gl.lot_number nulls last
$$;

grant execute on function get_gis_lots_for_subdivision(uuid)
  to anon, authenticated, service_role;

-- Returns a GeoJSON FeatureCollection of all lot polygons for a subdivision.
-- Used by the /api/lots-geojson route to power the map overlay.

create or replace function get_lots_geojson_for_subdivision(p_subdivision_id uuid)
returns json
language sql
security definer
stable
as $$
  select json_build_object(
    'type',     'FeatureCollection',
    'features', coalesce(
      json_agg(
        json_build_object(
          'type',       'Feature',
          'geometry',   ST_AsGeoJSON(gl.geometry)::json,
          'properties', json_build_object(
            'id',              gl.id,
            'lot_number',      gl.lot_number,
            'block_number',    gl.block_number,
            'pin_normalized',  plr.pin_normalized,
            'match_confidence', plr.match_confidence
          )
        )
      ),
      '[]'::json
    )
  )
  from gis_lots gl
  left join parcel_lot_relationships plr
         on plr.lot_id = gl.id and plr.is_dominant_lot = true
  where gl.subdivision_id = p_subdivision_id
    and gl.geometry is not null
$$;

grant execute on function get_lots_geojson_for_subdivision(uuid)
  to anon, authenticated, service_role;
