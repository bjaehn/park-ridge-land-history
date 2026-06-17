-- Deed-derived subdivision lineage records.
--
-- Adds a dedicated relationship table for parent-child subdivision and
-- resubdivision chains where the source is a deed/legal description rather
-- than a verified recorded plat geometry. No polygons are created here.

create table if not exists historical_subdivision_lineage (
  id uuid primary key default gen_random_uuid(),
  lineage_key text not null unique,
  address text,
  pin text,
  child_subdivision_id uuid references subdivisions (id) on delete set null,
  parent_subdivision_id uuid references subdivisions (id) on delete set null,
  child_subdivision text not null,
  child_lot text,
  child_block text,
  parent_subdivision text,
  parent_lot text,
  parent_block text,
  parent_portion text,
  section text,
  township text,
  "range" text,
  meridian text,
  county text,
  state text,
  relationship_type text not null,
  development_chain jsonb not null default '[]'::jsonb,
  plain_english_summary text,
  development_interpretation text,
  source_type text not null,
  source_text text not null,
  source_publication text,
  source_document_number text,
  source_recorded_date date,
  source_page text,
  source_url text,
  confidence text not null default 'unknown'
    check (confidence in ('high', 'medium', 'low', 'unknown')),
  confidence_reason text,
  needs_verification boolean not null default true,
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hsl_address_idx
  on historical_subdivision_lineage (lower(address))
  where address is not null;
create index if not exists hsl_pin_idx
  on historical_subdivision_lineage (pin)
  where pin is not null;
create index if not exists hsl_child_subdivision_idx
  on historical_subdivision_lineage (lower(child_subdivision));
create index if not exists hsl_parent_subdivision_idx
  on historical_subdivision_lineage (lower(parent_subdivision))
  where parent_subdivision is not null;
create index if not exists hsl_relationship_type_idx
  on historical_subdivision_lineage (relationship_type);
create index if not exists hsl_child_subdivision_id_idx
  on historical_subdivision_lineage (child_subdivision_id);
create index if not exists hsl_parent_subdivision_id_idx
  on historical_subdivision_lineage (parent_subdivision_id);

alter table historical_subdivision_lineage enable row level security;
do $$ begin
  if not exists (
    select 1
    from pg_policies
    where tablename = 'historical_subdivision_lineage'
      and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on historical_subdivision_lineage for select using (true)';
  end if;
end $$;

grant select on historical_subdivision_lineage to anon, authenticated;

-- Seed subdivision entities referenced by the deed language.
insert into subdivisions
  (name, normalized_name, display_name, slug, entity_type, confidence_level,
   confidence_reason, notes, geometry_status, status, historical_summary)
select *
from (values
  (
    'Kulas'' Subdivision',
    'kulas_subdivision',
    'Kulas'' Subdivision',
    'kulas-subdivision',
    'subdivision',
    'medium',
    'Mortgage deed language identifies Kulas'' Subdivision as a subdivision of part of Lot 6 in Block 1 of Hodges and Murison''s Subdivision, but the recorded plat still needs review.',
    'Kulas'' Subdivision appears to be a later resubdivision of part of Lot 6 in Block 1 of Hodges and Murison''s Subdivision. The deed language excludes the west half of Lot 6, which means the newer subdivision likely covered only the remaining portion of that original lot.',
    'not_started',
    'research_candidate',
    'Kulas'' Subdivision appears in mortgage deed language as a later resubdivision of part of an older subdivision lot. Recorded plat verification is still needed.'
  ),
  (
    'Hodges and Murison''s Subdivision',
    'hodges_and_murisons_subdivision',
    'Hodges and Murison''s Subdivision',
    'hodges-and-murisons-subdivision',
    'parent_plat',
    'medium',
    'Mortgage deed language identifies this as the parent subdivision for Kulas'' Subdivision, but the recorded plat still needs review.',
    'Older plat named in the Kulas'' Subdivision deed language. Needs recorded plat verification.',
    'not_started',
    'research_candidate',
    'Hodges and Murison''s Subdivision is currently represented as an older parent plat named in deed language for Kulas'' Subdivision.'
  ),
  (
    'Black''s Addition to Park Ridge',
    'blacks_addition_to_park_ridge',
    'Black''s Addition to Park Ridge',
    'blacks-addition-to-park-ridge',
    'subdivision',
    'medium',
    'Mortgage deed language identifies Black''s Addition to Park Ridge as a subdivision of the north 468.6 feet of Block 1 of Peeny and Meachem''s Subdivision, but the recorded plat still needs review.',
    'Black''s Addition to Park Ridge appears to be a later addition or resubdivision created from the north 468.6 feet of Block 1 of Peeny and Meachem''s Subdivision. 526 N Washington Ave is identified as Lot 2 within that newer addition.',
    'not_started',
    'research_candidate',
    'Black''s Addition to Park Ridge appears in mortgage deed language as a later addition or resubdivision carved from an older subdivision block.'
  ),
  (
    'Peeny and Meachem''s Subdivision',
    'peeny_and_meachems_subdivision',
    'Peeny and Meachem''s Subdivision',
    'peeny-and-meachems-subdivision',
    'parent_plat',
    'medium',
    'Mortgage deed language identifies this as the parent subdivision for Black''s Addition to Park Ridge, but the recorded plat still needs review.',
    'Older plat named in the Black''s Addition to Park Ridge deed language. Needs recorded plat verification.',
    'not_started',
    'research_candidate',
    'Peeny and Meachem''s Subdivision is currently represented as an older parent plat named in deed language for Black''s Addition to Park Ridge.'
  )
) as v(name, normalized_name, display_name, slug, entity_type, confidence_level,
       confidence_reason, notes, geometry_status, status, historical_summary)
where not exists (
  select 1 from subdivisions s where s.normalized_name = v.normalized_name
);

update subdivisions
set display_name = coalesce(display_name, name),
    slug = coalesce(slug, case normalized_name
      when 'kulas_subdivision' then 'kulas-subdivision'
      when 'hodges_and_murisons_subdivision' then 'hodges-and-murisons-subdivision'
      when 'blacks_addition_to_park_ridge' then 'blacks-addition-to-park-ridge'
      when 'peeny_and_meachems_subdivision' then 'peeny-and-meachems-subdivision'
      else slug
    end),
    entity_type = coalesce(entity_type, case
      when normalized_name in ('hodges_and_murisons_subdivision', 'peeny_and_meachems_subdivision') then 'parent_plat'
      else 'subdivision'
    end),
    geometry_status = coalesce(geometry_status, 'not_started'),
    confidence_level = case when confidence_level = 'unknown' then 'medium' else confidence_level end,
    updated_at = now()
where normalized_name in (
  'kulas_subdivision',
  'hodges_and_murisons_subdivision',
  'blacks_addition_to_park_ridge',
  'peeny_and_meachems_subdivision'
);

update subdivisions
set parent_subdivision_id = (
  select id from subdivisions where normalized_name = 'hodges_and_murisons_subdivision' limit 1
)
where normalized_name = 'kulas_subdivision';

update subdivisions
set parent_subdivision_id = (
  select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision' limit 1
)
where normalized_name = 'blacks_addition_to_park_ridge';

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subdivision_sources_source_key_key'
  ) then
    alter table subdivision_sources
      add constraint subdivision_sources_source_key_key unique (source_key);
  end if;
end $$;

-- Citation/source rows for subdivision detail pages.
with child as (
  select id, normalized_name
  from subdivisions
  where normalized_name in ('kulas_subdivision', 'blacks_addition_to_park_ridge')
)
insert into subdivision_sources
  (subdivision_id, source_key, title, source_type, source_name, source_reference,
   access_notes, reliability_tier, notes)
select
  child.id,
  v.source_key,
  v.title,
  'mortgage deed legal description',
  'Mortgage deed language provided by user',
  v.source_text,
  'Exact deed language provided by user. Recorded plat verification still needed.',
  'research_lead',
  v.notes
from child
join (values
  (
    'kulas_subdivision',
    'mortgage-deed-kulas-subdivision-lineage',
    'Kulas'' Subdivision mortgage deed legal description',
    'lot 1 in kulas'' subdivision, being a subdivision of lot 6 (except the west 1/2 thereof) in block 1 in hodges and murison''s subdivision of part of the south 1/2 of section 26, township 41 north, range 12 east of the third principal meridian in cook county il',
    'Source text records the child subdivision and parent subdivision relationship, but not a verified plat document number or recording date.'
  ),
  (
    'blacks_addition_to_park_ridge',
    'mortgage-deed-blacks-addition-lineage',
    'Black''s Addition to Park Ridge mortgage deed legal description',
    'lot 2 in black''s addition to park ridge, being a subdivision of the north 468.6 feet of block 1 of peeny and meachem''s sub division',
    'Source text records the child subdivision, parent block, measured parent portion, and current lot relationship, but not a verified plat document number or recording date.'
  )
) as v(normalized_name, source_key, title, source_text, notes)
  on v.normalized_name = child.normalized_name
on conflict (source_key) do update set
  subdivision_id = excluded.subdivision_id,
  title = excluded.title,
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_reference = excluded.source_reference,
  access_notes = excluded.access_notes,
  reliability_tier = excluded.reliability_tier,
  notes = excluded.notes,
  updated_at = now();

-- Rich relationship records.
with refs as (
  select
    (select id from subdivisions where normalized_name = 'kulas_subdivision' limit 1) as kulas_id,
    (select id from subdivisions where normalized_name = 'hodges_and_murisons_subdivision' limit 1) as hodges_id,
    (select id from subdivisions where normalized_name = 'blacks_addition_to_park_ridge' limit 1) as blacks_id,
    (select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision' limit 1) as peeny_id
)
insert into historical_subdivision_lineage (
  lineage_key, address, pin, child_subdivision_id, parent_subdivision_id,
  child_subdivision, child_lot, parent_subdivision, parent_lot, parent_block,
  parent_portion, section, township, "range", meridian, county, state,
  relationship_type, development_chain, plain_english_summary,
  development_interpretation, source_type, source_text, confidence,
  confidence_reason, needs_verification, verification_notes
)
select
  v.lineage_key, v.address, v.pin,
  case v.lineage_key
    when 'kulas-subdivision-from-hodges-and-murison-lot-6' then refs.kulas_id
    else refs.blacks_id
  end,
  case v.lineage_key
    when 'kulas-subdivision-from-hodges-and-murison-lot-6' then refs.hodges_id
    else refs.peeny_id
  end,
  v.child_subdivision, v.child_lot, v.parent_subdivision, v.parent_lot,
  v.parent_block, v.parent_portion, v.section, v.township, v.range_text,
  v.meridian, v.county, v.state, v.relationship_type, v.development_chain,
  v.plain_english_summary, v.development_interpretation, v.source_type,
  v.source_text, 'medium', v.confidence_reason, true, v.verification_notes
from refs
cross join (values
  (
    'kulas-subdivision-from-hodges-and-murison-lot-6',
    null::text,
    null::text,
    'Kulas'' Subdivision',
    'Lot 1',
    'Hodges and Murison''s Subdivision',
    'Lot 6',
    'Block 1',
    'Lot 6 except the west 1/2 thereof',
    'Section 26',
    'Township 41 North',
    'Range 12 East',
    'Third Principal Meridian',
    'Cook County',
    'Illinois',
    'resubdivision',
    jsonb_build_array(
      'Cook County, IL',
      'Section 26, Township 41 North, Range 12 East',
      'South half of Section 26',
      'Hodges and Murison''s Subdivision',
      'Block 1',
      'Lot 6, excluding the west half',
      'Kulas'' Subdivision',
      'Lot 1'
    ),
    'Kulas'' Subdivision appears to be a later resubdivision of part of Lot 6 in Block 1 of Hodges and Murison''s Subdivision.',
    'Kulas'' Subdivision appears to be a later resubdivision of part of Lot 6 in Block 1 of Hodges and Murison''s Subdivision. The deed language excludes the west half of Lot 6, which means the newer subdivision likely covered only the remaining portion of that original lot.',
    'mortgage deed legal description',
    'lot 1 in kulas'' subdivision, being a subdivision of lot 6 (except the west 1/2 thereof) in block 1 in hodges and murison''s subdivision of part of the south 1/2 of section 26, township 41 north, range 12 east of the third principal meridian in cook county il',
    'Mortgage deed language clearly states the child subdivision and parent subdivision relationship, but the recorded plat should be reviewed to confirm exact geometry and recording details.',
    'Locate recorded plat for Kulas'' Subdivision. Locate recorded plat for Hodges and Murison''s Subdivision. Confirm document numbers, recording dates, lot geometry, and whether the current address/PIN maps exactly to the deed description.'
  ),
  (
    'blacks-addition-from-peeny-and-meachem-block-1-526-n-washington',
    '526 N Washington Ave, Park Ridge, IL',
    '09264090090000',
    'Black''s Addition to Park Ridge',
    'Lot 2',
    'Peeny and Meachem''s Subdivision',
    null::text,
    'Block 1',
    'North 468.6 feet of Block 1',
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    'addition/resubdivision',
    jsonb_build_array(
      'Peeny and Meachem''s Subdivision',
      'Block 1',
      'North 468.6 feet of Block 1',
      'Black''s Addition to Park Ridge',
      'Lot 2',
      '526 N Washington Ave'
    ),
    'This property is legally described as Lot 2 in Black''s Addition to Park Ridge. Black''s Addition was created from the north 468.6 feet of Block 1 of Peeny and Meachem''s Subdivision.',
    'Black''s Addition to Park Ridge appears to be a later addition or resubdivision created from the north 468.6 feet of Block 1 of Peeny and Meachem''s Subdivision. 526 N Washington Ave is identified as Lot 2 within that newer addition.',
    'mortgage deed legal description',
    'lot 2 in black''s addition to park ridge, being a subdivision of the north 468.6 feet of block 1 of peeny and meachem''s sub division',
    'Mortgage deed language clearly identifies the child subdivision, parent subdivision, parent block, and measured parent portion, but the recorded plat should be reviewed to confirm exact geometry and recording details.',
    'Locate recorded plat for Black''s Addition to Park Ridge. Locate recorded plat for Peeny and Meachem''s Subdivision. Confirm document numbers, recording dates, lot geometry, and whether the current address/PIN maps exactly to the deed description.'
  )
) as v(
  lineage_key, address, pin, child_subdivision, child_lot, parent_subdivision,
  parent_lot, parent_block, parent_portion, section, township, range_text,
  meridian, county, state, relationship_type, development_chain,
  plain_english_summary, development_interpretation, source_type, source_text,
  confidence_reason, verification_notes
)
on conflict (lineage_key) do update set
  address = excluded.address,
  pin = excluded.pin,
  child_subdivision_id = excluded.child_subdivision_id,
  parent_subdivision_id = excluded.parent_subdivision_id,
  child_subdivision = excluded.child_subdivision,
  child_lot = excluded.child_lot,
  parent_subdivision = excluded.parent_subdivision,
  parent_lot = excluded.parent_lot,
  parent_block = excluded.parent_block,
  parent_portion = excluded.parent_portion,
  section = excluded.section,
  township = excluded.township,
  "range" = excluded."range",
  meridian = excluded.meridian,
  county = excluded.county,
  state = excluded.state,
  relationship_type = excluded.relationship_type,
  development_chain = excluded.development_chain,
  plain_english_summary = excluded.plain_english_summary,
  development_interpretation = excluded.development_interpretation,
  source_type = excluded.source_type,
  source_text = excluded.source_text,
  confidence = excluded.confidence,
  confidence_reason = excluded.confidence_reason,
  needs_verification = excluded.needs_verification,
  verification_notes = excluded.verification_notes,
  updated_at = now();

-- Property-level and lot-level links for the known Black's Addition property.
with black as (
  select id from subdivisions where normalized_name = 'blacks_addition_to_park_ridge' limit 1
)
insert into property_subdivision_links
  (pin, address, subdivision_id, lot_number, block_number,
   match_method, confidence_level, confidence_reason, source_name, source_reference)
select
  '09264090090000',
  '526 N WASHINGTON AVE',
  black.id,
  '2',
  null,
  'deed_legal_description',
  'medium',
  'Mortgage deed language identifies 526 N Washington Ave as Lot 2 in Black''s Addition to Park Ridge; recorded plat verification still needed.',
  'Mortgage deed language provided by user',
  'lot 2 in black''s addition to park ridge, being a subdivision of the north 468.6 feet of block 1 of peeny and meachem''s sub division'
from black
on conflict (pin, subdivision_id) do update set
  address = excluded.address,
  lot_number = excluded.lot_number,
  block_number = excluded.block_number,
  match_method = excluded.match_method,
  confidence_level = excluded.confidence_level,
  confidence_reason = excluded.confidence_reason,
  source_name = excluded.source_name,
  source_reference = excluded.source_reference,
  updated_at = now();

with black as (
  select id from subdivisions where normalized_name = 'blacks_addition_to_park_ridge' limit 1
)
insert into subdivision_lots
  (subdivision_id, lot_number, block_number, current_pin, current_address,
   match_method, confidence_level, notes, source_type, source_name, data_quality_flags)
select
  black.id,
  '2',
  null,
  '09264090090000',
  '526 N WASHINGTON AVE',
  'deed_legal_description',
  'medium',
  'Lot 2 in Black''s Addition to Park Ridge, identified by mortgage deed legal description. Parent chain: north 468.6 feet of Block 1 of Peeny and Meachem''s Subdivision.',
  'mortgage deed legal description',
  'Mortgage deed language provided by user',
  array['has_parent_subdivision','needs_geometry','needs_plat_date','needs_document_number','needs_recorded_plat_verification']
from black
where not exists (
  select 1
  from subdivision_lots l
  where l.subdivision_id = black.id
    and l.current_pin = '09264090090000'
    and l.lot_number = '2'
);

with kulas as (
  select id from subdivisions where normalized_name = 'kulas_subdivision' limit 1
)
insert into subdivision_lots
  (subdivision_id, lot_number, block_number, current_pin, current_address,
   match_method, confidence_level, notes, source_type, source_name, data_quality_flags)
select
  kulas.id,
  '1',
  null,
  null,
  null,
  'deed_legal_description',
  'medium',
  'Lot 1 in Kulas'' Subdivision, identified by mortgage deed legal description. Parent chain: Lot 6 except the west 1/2 thereof, Block 1, Hodges and Murison''s Subdivision.',
  'mortgage deed legal description',
  'Mortgage deed language provided by user',
  array['has_parent_subdivision','needs_current_pin','needs_geometry','needs_plat_date','needs_document_number','needs_recorded_plat_verification']
from kulas
where not exists (
  select 1
  from subdivision_lots l
  where l.subdivision_id = kulas.id
    and l.current_pin is null
    and l.lot_number = '1'
);

-- Subdivision detail facts.
with source_rows as (
  select id, subdivision_id, source_key
  from subdivision_sources
  where source_key in (
    'mortgage-deed-kulas-subdivision-lineage',
    'mortgage-deed-blacks-addition-lineage'
  )
)
insert into subdivision_timeline_events
  (subdivision_id, event_type, title, description, source_name,
   source_reference, confidence_level, fact_type, direct_quote,
   source_id, confidence_reason, display_priority)
select
  source_rows.subdivision_id,
  'legal_description',
  v.title,
  v.description,
  'Mortgage deed language provided by user',
  v.source_text,
  'medium',
  'legal_description',
  v.source_text,
  source_rows.id,
  v.confidence_reason,
  20
from source_rows
join (values
  (
    'mortgage-deed-kulas-subdivision-lineage',
    'Deed language identifies Kulas'' Subdivision as a resubdivision',
    'Older plat: Hodges and Murison''s Subdivision. Parent block or lot: Block 1, Lot 6. Carved-out portion: Lot 6 except the west half. Later subdivision/addition: Kulas'' Subdivision. Current lot/property: Lot 1.',
    'lot 1 in kulas'' subdivision, being a subdivision of lot 6 (except the west 1/2 thereof) in block 1 in hodges and murison''s subdivision of part of the south 1/2 of section 26, township 41 north, range 12 east of the third principal meridian in cook county il',
    'Mortgage deed language clearly states the child subdivision and parent subdivision relationship, but the recorded plat should be reviewed to confirm exact geometry and recording details.'
  ),
  (
    'mortgage-deed-blacks-addition-lineage',
    'Deed language identifies Black''s Addition as a later addition',
    'Older plat: Peeny and Meachem''s Subdivision. Parent block or lot: Block 1. Carved-out portion: North 468.6 feet of Block 1. Later subdivision/addition: Black''s Addition to Park Ridge. Current lot/property: Lot 2 at 526 N Washington Ave.',
    'lot 2 in black''s addition to park ridge, being a subdivision of the north 468.6 feet of block 1 of peeny and meachem''s sub division',
    'Mortgage deed language clearly identifies the child subdivision, parent subdivision, parent block, and measured parent portion, but the recorded plat should be reviewed to confirm exact geometry and recording details.'
  )
) as v(source_key, title, description, source_text, confidence_reason)
  on v.source_key = source_rows.source_key
where not exists (
  select 1
  from subdivision_timeline_events e
  where e.subdivision_id = source_rows.subdivision_id
    and e.event_type = 'legal_description'
    and e.title = v.title
);

-- Research tasks for verification.
with targets as (
  select id, normalized_name
  from subdivisions
  where normalized_name in (
    'kulas_subdivision',
    'hodges_and_murisons_subdivision',
    'blacks_addition_to_park_ridge',
    'peeny_and_meachems_subdivision'
  )
)
insert into subdivision_research_tasks
  (subdivision_id, search_query, target_archive, reason, expected_source_type,
   status, priority, notes)
select
  targets.id,
  v.search_query,
  'Cook County Clerk / Recorder plat records',
  v.reason,
  'recorded subdivision plat',
  'pending',
  'high',
  'Confirm document number, recording date, lot geometry, and current PIN/address mapping. Do not create geometry until a reliable plat or GIS source is found.'
from targets
join (values
  ('kulas_subdivision', 'Locate recorded plat for Kulas'' Subdivision', 'Needed to verify the child subdivision geometry and recording details.'),
  ('hodges_and_murisons_subdivision', 'Locate recorded plat for Hodges and Murison''s Subdivision', 'Needed to verify the parent subdivision, Block 1, and Lot 6 geometry.'),
  ('blacks_addition_to_park_ridge', 'Locate recorded plat for Black''s Addition to Park Ridge', 'Needed to verify the child addition geometry, recording details, and Lot 2 mapping.'),
  ('peeny_and_meachems_subdivision', 'Locate recorded plat for Peeny and Meachem''s Subdivision', 'Needed to verify the parent subdivision, Block 1, and north 468.6-foot portion.')
) as v(normalized_name, search_query, reason)
  on v.normalized_name = targets.normalized_name
where not exists (
  select 1
  from subdivision_research_tasks t
  where t.subdivision_id = targets.id
    and t.search_query = v.search_query
);

update subdivisions s
set parcel_count = (
  select count(distinct pin)
  from property_subdivision_links l
  where l.subdivision_id = s.id
)
where s.normalized_name in (
  'kulas_subdivision',
  'blacks_addition_to_park_ridge'
);
