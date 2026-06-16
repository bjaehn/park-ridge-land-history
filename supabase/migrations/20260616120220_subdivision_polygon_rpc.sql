-- RPC function used by scripts/generate_subdivision_polygons.py to dissolve
-- parcel geometries into a subdivision MultiPolygon.
--
-- Prerequisites:
--   - PostGIS must be enabled.
--   - supabase/migrations/20260616120000_subdivision_historical_context.sql applied.
--   - parcels table must have a geometry column and pin_normalized column.

create or replace function generate_subdivision_polygon(
  p_subdivision_id uuid,
  p_pin_array text[]
)
returns json
language plpgsql
security definer
as $$
declare
  v_geom geometry;
  v_bbox jsonb;
  v_count integer;
  v_existing_id uuid;
begin
  -- Validate subdivision exists
  if not exists (select 1 from subdivisions where id = p_subdivision_id) then
    return json_build_object('success', false, 'error', 'Subdivision not found');
  end if;

  -- Count matched parcels with geometry
  select count(*) into v_count
  from parcels
  where pin_normalized = any(p_pin_array)
    and geometry is not null;

  if v_count = 0 then
    return json_build_object(
      'success', false,
      'error', 'No parcel geometries found for provided PINs',
      'pin_count', array_length(p_pin_array, 1)
    );
  end if;

  -- Dissolve parcel geometries into a single MultiPolygon
  select ST_Multi(ST_MakeValid(ST_Union(geometry)))
  into v_geom
  from parcels
  where pin_normalized = any(p_pin_array)
    and geometry is not null;

  if v_geom is null then
    return json_build_object('success', false, 'error', 'ST_Union produced null geometry');
  end if;

  -- Compute bounding box as JSON
  select json_build_object(
    'west',  ST_XMin(ST_Envelope(v_geom)),
    'south', ST_YMin(ST_Envelope(v_geom)),
    'east',  ST_XMax(ST_Envelope(v_geom)),
    'north', ST_YMax(ST_Envelope(v_geom))
  ) into v_bbox;

  -- Check for existing geometry record
  select id into v_existing_id
  from subdivision_geometries
  where subdivision_id = p_subdivision_id
  limit 1;

  if v_existing_id is not null then
    update subdivision_geometries set
      geometry = v_geom,
      geometry_source = 'dissolved_parcels',
      geometry_method = 'dissolved_parcels_by_subdivision_name',
      geometry_confidence = case
        when v_count >= 10 then 'medium'
        when v_count >= 3  then 'low'
        else 'unknown'
      end,
      geometry_confidence_reason = 'Dissolved from ' || v_count || ' matched parcel geometries',
      derived_from_pins = p_pin_array,
      bbox = v_bbox,
      visible_in_app = case when v_count >= 10 then true else false end,
      updated_at = now()
    where id = v_existing_id;

    return json_build_object(
      'success', true,
      'action', 'updated',
      'parcel_count', v_count,
      'id', v_existing_id
    );
  else
    insert into subdivision_geometries (
      subdivision_id,
      geometry,
      geometry_source,
      geometry_method,
      geometry_confidence,
      geometry_confidence_reason,
      derived_from_pins,
      bbox,
      visible_in_app
    ) values (
      p_subdivision_id,
      v_geom,
      'dissolved_parcels',
      'dissolved_parcels_by_subdivision_name',
      case
        when v_count >= 10 then 'medium'
        when v_count >= 3  then 'low'
        else 'unknown'
      end,
      'Dissolved from ' || v_count || ' matched parcel geometries',
      p_pin_array,
      v_bbox,
      case when v_count >= 10 then true else false end
    )
    returning id into v_existing_id;

    return json_build_object(
      'success', true,
      'action', 'inserted',
      'parcel_count', v_count,
      'id', v_existing_id
    );
  end if;
end;
$$;

grant execute on function generate_subdivision_polygon(uuid, text[]) to anon, authenticated;
