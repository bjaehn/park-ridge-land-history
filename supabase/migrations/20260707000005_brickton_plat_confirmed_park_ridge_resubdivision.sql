-- Confirms the long-sought Brickton/Peeny-and-Meachem's plat recording and
-- adds the "Park Ridge" resubdivision it names, both sourced from a deed's
-- legal description provided by the user.
--
-- The deed identifies "Brickton, being Penny and Meacham's subdivision" of
-- the SE 1/4 of Section 26, Township 41 North, Range 12 East of the Third
-- Principal Meridian, recorded May 31, 1873 as Document No. 106031 in Book 4
-- of Plats, page 85 -- five weeks before the July 4, 1873 incorporation as
-- Park Ridge. This is the exact primary source two prior research tasks
-- (20260616120212, 20260703000011) asked someone to locate, so this
-- migration raises "Peeny and Meachem's Subdivision" from medium to high
-- confidence and closes both tasks.
--
-- The same deed also names a second, previously-untracked entity: "Park
-- Ridge, a resubdivision of Blocks 1, 3, 4, and 35 of Brickton" (its Parcel 1
-- is Lot 19, Block 4 of that resubdivision; Parcel 2 is a straight Brickton
-- lot, Lot 15, Block 4, not part of the resubdivision). This is added as a
-- new child subdivision entity, distinct from the already-tracked "Black's
-- Addition to Park Ridge" (which was carved directly from Block 1 of
-- Peeny and Meachem's Subdivision, not via this resubdivision).
--
-- No PIN/address was available for this deed, so no property_subdivision_links
-- or subdivision_lots rows are created here -- this is subdivision-level
-- history only. Safe to re-run (on conflict / where not exists guards).

-- ─── New entity: "Park Ridge" resubdivision of Brickton ──────────────────

insert into subdivisions
  (name, normalized_name, display_name, slug, entity_type, confidence_level,
   confidence_reason, notes, geometry_status, status, historical_summary)
select
  'Park Ridge (Resubdivision of Brickton)',
  'park_ridge_resubdivision_of_brickton',
  'Park Ridge (Resubdivision of Brickton)',
  'park-ridge-resubdivision-of-brickton',
  'subdivision',
  'medium',
  'Named directly in a deed''s legal description as a resubdivision of Brickton, but its own recorded plat (if one exists separately from the parent Brickton plat) has not been located, so this is treated as a research candidate distinct from the confirmed parent Brickton plat.',
  'Block 1 also appears in the separately-tracked "Black''s Addition to Park Ridge" lineage (carved from the north 468.6 feet of Block 1 of Peeny and Meachem''s Subdivision directly, not via this resubdivision). Whether this "Park Ridge" resubdivision and Black''s Addition represent overlapping, sequential, or unrelated treatments of Block 1 is not yet resolved and needs further deed/plat research.',
  'not_started',
  'research_candidate',
  'Deed language identifies "Park Ridge" as a resubdivision of Blocks 1, 3, 4, and 35 in Brickton (Peeny and Meachem''s Subdivision), re-platted under the village''s new name. Lot 19 in Block 4 of this resubdivision is cited in the same deed alongside a separate, un-resubdivided Brickton lot (Lot 15, Block 4), suggesting the resubdivision did not replace every original Brickton lot. No plat recording date or document number for this resubdivision itself has been located; the deed only names it in passing while citing the underlying 1873 Brickton plat.'
where not exists (
  select 1 from subdivisions where normalized_name = 'park_ridge_resubdivision_of_brickton'
);

update subdivisions
set parent_subdivision_id = (
  select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision' limit 1
)
where normalized_name = 'park_ridge_resubdivision_of_brickton'
  and parent_subdivision_id is null;

-- ─── Confirm the Brickton / Peeny and Meachem's plat ──────────────────────

update subdivisions
set
  recorded_date = '1873-05-31',
  recorded_year = 1873,
  document_number = '106031',
  plat_book = '4',
  plat_page = '85',
  confidence_level = 'high',
  historical_summary =
    'Deed language identifies this plat as "Brickton, being Penny and Meacham''s subdivision" of the Southeast 1/4 of Section 26, Township 41 North, Range 12 East of the Third Principal Meridian, and cites the actual recorded plat: Document No. 106031, Book 4 of Plats, page 85, recorded May 31, 1873 -- five weeks before the village incorporated as Park Ridge on July 4, 1873. This confirms the founding-history narrative already corroborated by the Park Ridge History Center and Encyclopedia of Chicago sources: George Penny and his business partner Robert Meacham (spelled "Penny and Meacham" in this deed, "Peeny and Meachem" in earlier deed-derived records for Black''s Addition to Park Ridge) platted the townsite first known as Pennyville, then Brickton, which incorporated as Park Ridge in 1873.',
  confidence_reason =
    'The recorded plat that earlier research tasks asked someone to locate has now been cited by a deed: Document No. 106031, Book 4 of Plats, page 85, recorded May 31, 1873. Combined with the two independently published secondary sources (Park Ridge History Center; Encyclopedia of Chicago) already corroborating the Penny/Meacham founding narrative, the subdivision record is raised to high confidence. Independent verification against the actual Cook County plat image has not been performed.',
  updated_at = now()
where normalized_name = 'peeny_and_meachems_subdivision';

-- ─── Sources ──────────────────────────────────────────────────────────────

with refs as (
  select
    (select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision' limit 1) as peeny_id,
    (select id from subdivisions where normalized_name = 'park_ridge_resubdivision_of_brickton' limit 1) as park_ridge_id
)
insert into subdivision_sources
  (subdivision_id, source_key, title, source_type, source_name, source_reference,
   access_notes, reliability_tier, notes)
select
  case v.source_key
    when 'deed-brickton-plat-confirmation' then refs.peeny_id
    else refs.park_ridge_id
  end,
  v.source_key, v.title, 'deed legal description', 'Deed legal description provided by user',
  v.source_text, v.access_notes, 'primary', v.notes
from refs
cross join (values
  (
    'deed-brickton-plat-confirmation',
    'Deed citing the recorded Brickton / Peeny and Meachem''s Subdivision plat',
    'brickton, being penny and meacham''s subdivision of the southeast 1/4 of section 26, township 41 north, range 12 east of the third principal meridian, according to the plat thereof recorded may 31, 1873 as document no. 106031 in book 4 of plats, page 85, cook county, illinois',
    'Exact deed language provided by user, quoting the plat recording. Verification against the actual Cook County plat image still needed.',
    'Confirms the plat recording (document number, book, page, recorded date) that two prior research tasks asked someone to locate.'
  ),
  (
    'deed-park-ridge-resubdivision',
    'Deed citing the "Park Ridge" resubdivision of Brickton Blocks 1, 3, 4, and 35',
    'parcel 1: lot 19 in block 4 in park ridge, a resubdivision of blocks 1, 3, 4 and 35 in brickton aforesaid. parcel 2: the north 19 feet of the south 48 feet of lot 15 in block 4 in brickton aforesaid',
    'Exact deed language provided by user. No separate recorded-plat citation for the resubdivision itself was found in this deed.',
    'Names the "Park Ridge" resubdivision entity and its relationship to Brickton Blocks 1, 3, 4, and 35.'
  )
) as v(source_key, title, source_text, access_notes, notes)
on conflict (source_key) do update set
  subdivision_id   = excluded.subdivision_id,
  title            = excluded.title,
  source_type      = excluded.source_type,
  source_name      = excluded.source_name,
  source_reference = excluded.source_reference,
  access_notes     = excluded.access_notes,
  reliability_tier = excluded.reliability_tier,
  notes            = excluded.notes,
  updated_at       = now();

-- ─── Alias: deed's spelling variant ────────────────────────────────────────

with target as (
  select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision'
), src as (
  select id from subdivision_sources where source_key = 'deed-brickton-plat-confirmation'
)
insert into subdivision_aliases (subdivision_id, alias, alias_type, source_id, confidence)
select target.id, 'Penny and Meacham''s Subdivision', 'historical_variant', src.id, 'high'
from target, src
on conflict (subdivision_id, (lower(alias))) do update set
  alias_type = excluded.alias_type,
  source_id  = excluded.source_id,
  confidence = excluded.confidence;

-- ─── Lineage record ────────────────────────────────────────────────────────

with refs as (
  select
    (select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision' limit 1) as peeny_id,
    (select id from subdivisions where normalized_name = 'park_ridge_resubdivision_of_brickton' limit 1) as park_ridge_id
)
insert into historical_subdivision_lineage (
  lineage_key, child_subdivision_id, parent_subdivision_id,
  child_subdivision, parent_subdivision, parent_block,
  section, township, "range", meridian, county, state,
  relationship_type, development_chain, plain_english_summary,
  development_interpretation, source_type, source_text,
  source_document_number, source_recorded_date, source_page,
  confidence, confidence_reason, needs_verification, verification_notes
)
select
  'park-ridge-resubdivision-from-brickton-blocks-1-3-4-35',
  refs.park_ridge_id, refs.peeny_id,
  'Park Ridge', 'Peeny and Meachem''s Subdivision (Brickton)', 'Blocks 1, 3, 4, and 35',
  'Section 26', 'Township 41 North', 'Range 12 East', 'Third Principal Meridian', 'Cook County', 'Illinois',
  'resubdivision',
  jsonb_build_array(
    'Cook County, IL',
    'Section 26, Township 41 North, Range 12 East, Third Principal Meridian',
    'Southeast 1/4 of Section 26',
    'Peeny and Meachem''s Subdivision (Brickton)',
    'Blocks 1, 3, 4, and 35',
    'Park Ridge (resubdivision)'
  ),
  'Deed language identifies "Park Ridge" as a resubdivision of Blocks 1, 3, 4, and 35 of Brickton (Peeny and Meachem''s Subdivision), platted under the village''s new name after its 1873 incorporation.',
  'Deed language identifies "Park Ridge" as a resubdivision of Blocks 1, 3, 4, and 35 in Brickton. Lot 19 in Block 4 of this resubdivision is cited alongside a separate, un-resubdivided Brickton lot (Lot 15, Block 4) in the same deed, suggesting the resubdivision did not replace every original Brickton lot.',
  'deed legal description',
  'brickton, being penny and meacham''s subdivision of the southeast 1/4 of section 26, township 41 north, range 12 east of the third principal meridian, recorded may 31, 1873 as document no. 106031 in book 4 of plats, page 85, cook county, illinois. parcel 1: lot 19 in block 4 in park ridge, a resubdivision of blocks 1, 3, 4 and 35 in brickton aforesaid. parcel 2: the north 19 feet of the south 48 feet of lot 15 in block 4 in brickton aforesaid.',
  '106031', '1873-05-31', '85',
  'high',
  'Deed explicitly names the child resubdivision, its parent subdivision and blocks, and cites the parent plat''s exact recording (Document 106031, Book 4 of Plats, page 85, recorded 5/31/1873). The resubdivision''s own separate plat recording, if one exists, has not been located.',
  true,
  'Locate a recorded plat for the "Park Ridge" resubdivision itself (if a separate one exists) and confirm how it relates to Black''s Addition to Park Ridge, which also derives from Block 1 of the same parent subdivision.'
from refs
on conflict (lineage_key) do update set
  child_subdivision_id = excluded.child_subdivision_id,
  parent_subdivision_id = excluded.parent_subdivision_id,
  child_subdivision = excluded.child_subdivision,
  parent_subdivision = excluded.parent_subdivision,
  parent_block = excluded.parent_block,
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
  source_document_number = excluded.source_document_number,
  source_recorded_date = excluded.source_recorded_date,
  source_page = excluded.source_page,
  confidence = excluded.confidence,
  confidence_reason = excluded.confidence_reason,
  needs_verification = excluded.needs_verification,
  verification_notes = excluded.verification_notes,
  updated_at = now();

-- ─── Timeline event on the new "Park Ridge" resubdivision ─────────────────

with target as (
  select id from subdivisions where normalized_name = 'park_ridge_resubdivision_of_brickton'
), src as (
  select id from subdivision_sources where source_key = 'deed-park-ridge-resubdivision'
)
insert into subdivision_timeline_events
  (subdivision_id, event_year, event_type, title, description, fact_type,
   direct_quote, confidence_level, confidence_reason, source_id, source_name,
   source_reference, display_priority)
select
  target.id, 1873, 'platting',
  'Deed identifies "Park Ridge" resubdivision of Brickton Blocks 1, 3, 4, and 35',
  'A deed conveying Lot 19, Block 4 describes it as being within "Park Ridge, a resubdivision of Blocks 1, 3, 4 and 35 in Brickton" -- the same Brickton plat recorded May 31, 1873, five weeks before the village''s July 4, 1873 incorporation under the Park Ridge name. No separate recording date for the resubdivision itself was cited.',
  'legal_description',
  'lot 19 in block 4 in park ridge, a resubdivision of blocks 1, 3, 4 and 35 in brickton aforesaid',
  'medium',
  'The deed clearly names the resubdivision and its parent blocks, but does not cite a distinct plat document number or recording date for "Park Ridge" itself, unlike the confirmed 1873 Brickton plat.',
  src.id, 'Deed legal description provided by user',
  'lot 19 in block 4 in park ridge, a resubdivision of blocks 1, 3, 4 and 35 in brickton aforesaid',
  10
from target, src
where not exists (
  select 1 from subdivision_timeline_events e
  where e.subdivision_id = target.id
    and e.title = 'Deed identifies "Park Ridge" resubdivision of Brickton Blocks 1, 3, 4, and 35'
);

-- ─── Close the two open research tasks ─────────────────────────────────────

update subdivision_research_tasks t
set
  status = 'completed',
  completed_at = now(),
  notes = 'Resolved by a deed citing the recorded plat: Document No. 106031, Book 4 of Plats, page 85, recorded May 31, 1873, as "Brickton, being Penny and Meacham''s subdivision" of the SE 1/4 of Section 26, Township 41 North, Range 12 East of the Third Principal Meridian.'
from subdivisions s
where t.subdivision_id = s.id
  and s.normalized_name = 'peeny_and_meachems_subdivision'
  and t.search_query in (
    'Locate recorded plat for Peeny and Meachem''s Subdivision / Brickton townsite',
    'Locate recorded plat for Peeny and Meachem''s Subdivision'
  )
  and t.status <> 'completed';
