-- Sprint C: RPC for the lookup script to find unmapped PAGE_SUBREF codes.
-- Used by scripts/lookup-page-subref-names.py to drive Assessor page scraping.

create or replace function get_unmapped_page_subrefs()
returns table(page_subref text, representative_pin text, lot_count bigint)
language sql
security definer
stable
as $$
  select
    gl.normalized_subdivision_name as page_subref,
    min(plr.pin_normalized)        as representative_pin,
    count(*)                       as lot_count
  from gis_lots gl
  join parcel_lot_relationships plr on plr.lot_id = gl.id
                                   and plr.is_dominant_lot = true
  where not exists (
    select 1
    from page_subref_map psm
    where lower(psm.page_subref) = lower(gl.normalized_subdivision_name)
      and psm.subdivision_name is not null
  )
  group by gl.normalized_subdivision_name
  order by lot_count desc
$$;

grant execute on function get_unmapped_page_subrefs() to service_role, authenticated;
