-- Live web research pass on the five subdivisions named in the Property
-- Story Sprint: Penny & Meacham, Hodges & Murison, Kinsey, Brickton Place,
-- Park Ridge Manor.
--
-- Findings:
--   - Penny & Meacham ("Peeny and Meachem's Subdivision") and Brickton Place
--     already had solid sourced coverage from prior work (see
--     20260703000011_brickton_founding_history.sql and earlier migrations).
--     Re-verified, nothing new added; nothing contradicted.
--   - Hodges and Murison's Subdivision: found one new corroborating fact
--     below, naming Leonard Hodges as "one of the first subdividers" in a
--     1926 locally published Park Ridge history book. This confirms
--     "Hodges" as a real early subdivider but does NOT confirm "Murison" or
--     this specific plat -- recorded honestly as medium confidence, with a
--     new research task to close that gap.
--   - Kinsey (3 records: Park Edge, Park Ridge, Talcott Road subdivisions)
--     and Park Ridge Manor: no citable primary or secondary source was found
--     via web search or the 1926 history book's full text. Per the
--     "do not invent facts" rule, nothing is added to their historical
--     summaries -- only research tasks documenting what was searched and
--     what to try next.
--
-- Safe to re-run: guarded by source_key uniqueness and a title-based
-- existence check on timeline events / research tasks.

-- ─── Source: 1926 Park Ridge history book ─────────────────────────────────

insert into subdivision_sources
  (subdivision_id, source_key, title, source_type, source_name, source_url,
   reliability_tier, notes)
values (
  null,
  'history-of-park-ridge-1841-1926',
  'The History of Park Ridge, 1841-1926',
  'local history book',
  'Park Ridge Public Library (digitized by University of Illinois Urbana-Champaign / Internet Archive)',
  'https://archive.org/details/historyofparkrid00park',
  'secondary',
  'Full-text OCR searched via archive.org. Locally published township/village history written in 1926, close in time to many of the events it describes. Confirms Leonard Hodges as an early subdivider (donor of the land for Hodges Park) and independently corroborates the Penny/Meacham/Brickton/Pennyville founding narrative already on file. No mentions found of "Kinsey", "Murison", or "Park Ridge Manor".'
)
on conflict (source_key) do update set
  title = excluded.title, source_url = excluded.source_url, notes = excluded.notes, updated_at = now();

-- ─── Hodges and Murison's Subdivision: new fact ───────────────────────────

with target as (
  select id from subdivisions where name = 'Hodges and Murison''s Subdivision'
), src as (
  select id as source_id from subdivision_sources where source_key = 'history-of-park-ridge-1841-1926'
)
insert into subdivision_timeline_events
  (subdivision_id, event_year, event_type, title, description, fact_type,
   direct_quote, confidence_level, confidence_reason, source_id, source_name,
   source_reference, display_priority)
select
  target.id, null, 'developer_identity',
  'Leonard Hodges named as an early Park Ridge subdivider',
  'A 1926 local history book names Leonard Hodges as one of Park Ridge''s first subdividers and records that he donated the land that became Hodges Park. This corroborates "Hodges" as a real, active early subdivider in Park Ridge, but does not by itself confirm the "Murison" partner name or that this specific deed-referenced plat is the Hodges/Murison plat -- that link is still an inference from the deed language.',
  'research_lead',
  'The ground for Hodge''s Park was given to Park Ridge by Leonard Hodges, one of the first subdividers.',
  'medium',
  'Confirms the "Hodges" half of the name from an independent, locally published source, but "Murison" does not appear anywhere in this source and the specific plat is still unlocated. Treat as supporting evidence for the developer''s identity, not confirmation of the subdivision record.',
  src.source_id,
  'The History of Park Ridge, 1841-1926',
  'https://archive.org/details/historyofparkrid00park',
  10
from target, src
where target.id is not null
  and not exists (
    select 1 from subdivision_timeline_events e
    where e.subdivision_id = target.id and e.title = 'Leonard Hodges named as an early Park Ridge subdivider'
  );

update subdivisions
set
  historical_summary =
    'Deed language identifies this plat as parent of Kulas'' Subdivision. A 1926 local history book independently names Leonard Hodges as one of Park Ridge''s first subdividers, who donated the land for what became Hodges Park -- corroborating "Hodges" as a real, active early subdivider in the village. The "Murison" partner name has not yet been found in any independent source, and the recorded plat itself has not been located, so the link between this deed-referenced name and a specific dated subdivision remains unconfirmed.',
  updated_at = now()
where name = 'Hodges and Murison''s Subdivision'
  and (historical_summary is null or historical_summary = 'Hodges and Murison''s Subdivision is currently represented as an older parent plat named in deed language for Kulas'' Subdivision.');

with target as (
  select id from subdivisions where name = 'Hodges and Murison''s Subdivision'
)
insert into subdivision_research_tasks
  (subdivision_id, search_query, target_archive, reason, expected_source_type,
   status, priority, notes)
select
  target.id,
  'Confirm "Murison" as Leonard Hodges'' subdivision partner and locate the recorded plat',
  'Park Ridge Historical Society archives; Cook County Recorder plat index (T41N R12E); Illinois Digital Newspaper Collections',
  'A 1926 local history book confirms Leonard Hodges as an early Park Ridge subdivider but never mentions a "Murison". Web search and the full text of that book turned up nothing further. Need a primary source (recorded plat, period newspaper, or historical society file) naming both Hodges and Murison together.',
  'recorded subdivision plat or period newspaper article',
  'pending',
  'medium',
  'Web search performed 2026-07-01: general search engines and the 1926 history book''s full OCR text produced no independent mention of "Murison". Next step is archival, not web search.'
from target
where not exists (
  select 1 from subdivision_research_tasks t
  where t.subdivision_id = target.id
    and t.search_query = 'Confirm "Murison" as Leonard Hodges'' subdivision partner and locate the recorded plat'
);

-- ─── Kinsey subdivisions + Park Ridge Manor: documented research gaps ─────
-- No citable source found for any of these four records. Recording the
-- negative result and next steps rather than guessing.

insert into subdivision_research_tasks
  (subdivision_id, search_query, target_archive, reason, expected_source_type, status, priority, notes)
select s.id, v.search_query, v.target_archive, v.reason, v.expected_source_type, 'pending', v.priority, v.notes
from subdivisions s
join (values
  (
    'Kinsey''s Park Edge Subdivision',
    'Identify Kinsey developer/family and recording date for Kinsey''s Park Edge Subdivision',
    'Park Ridge Historical Society; Cook County Recorder plat index (T41N R12E); Illinois Digital Newspaper Collections',
    'No web-searchable source names a "Kinsey" developer or gives a recording date for this plat. A sibling record, Kinsey''s Park Ridge Subdivision, is dated 1924 -- worth checking whether the same Kinsey platted both.',
    'recorded subdivision plat or period newspaper real-estate advertisement',
    'medium',
    'Web search performed 2026-07-01: no results specific to this subdivision. Cross-reference with Kinsey''s Park Ridge Subdivision (1924, partially_verified) once a primary source is found for either.'
  ),
  (
    'Kinsey''s Talcott Road Subdivision',
    'Identify Kinsey developer/family and recording date for Kinsey''s Talcott Road Subdivision',
    'Park Ridge Historical Society; Cook County Recorder plat index (T41N R12E); Illinois Digital Newspaper Collections',
    'No web-searchable source names a "Kinsey" developer or gives a recording date for this plat. Same open question as Kinsey''s Park Edge Subdivision -- likely the same family/developer platting multiple additions.',
    'recorded subdivision plat or period newspaper real-estate advertisement',
    'medium',
    'Web search performed 2026-07-01: no results specific to this subdivision.'
  ),
  (
    'Park Ridge Manor',
    'Identify original developer and recording date for Park Ridge Manor',
    'Park Ridge Historical Society; Cook County Recorder plat index (T41N R12E)',
    'Modern real-estate listing sites describe Park Ridge Manor as built out mostly 1926-2001 and located off Potter Road south of Farrell Avenue, but none name the original subdivider or give a recording date. The 1926 local history book predates most of this subdivision''s development and does not mention it.',
    'recorded subdivision plat',
    'medium',
    'Web search performed 2026-07-01: homesbymarco.com and parkridgecommunities.com describe the modern neighborhood boundary but not its platting history.'
  )
) as v(sub_name, search_query, target_archive, reason, expected_source_type, priority, notes)
  on s.name = v.sub_name
where not exists (
  select 1 from subdivision_research_tasks t
  where t.subdivision_id = s.id and t.search_query = v.search_query
);
