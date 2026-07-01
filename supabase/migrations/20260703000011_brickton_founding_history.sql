-- Enrich "Peeny and Meachem's Subdivision" with corroborating founding
-- history (Brickton / Pennyville) from two independently published sources:
--   - Park Ridge History Center, "Early History"
--   - Encyclopedia of Chicago, Park Ridge entry
--
-- Both sources describe the same founding sequence: George Penny opened a
-- brickworks in 1854 (partnering with Robert Meacham, per the History
-- Center); the depot community was first called Pennyville, then renamed
-- Brickton; by 1873 the 405 residents incorporated as the Village of Park
-- Ridge. The existing deed-referenced "Peeny and Meachem's Subdivision"
-- record (parent of Black's Addition to Park Ridge) is name-matched to this
-- founding story, but the recorded plat itself has not been located, so the
-- subdivision's own confidence_level/status are left as-is; only the newly
-- corroborated historical facts and aliases are marked high confidence.
--
-- Safe to re-run: guarded by source_key uniqueness, alias uniqueness, and a
-- title-based existence check on timeline events.

-- ─── Sources ──────────────────────────────────────────────────────────────

with target as (
  select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision'
)
insert into subdivision_sources
  (subdivision_id, source_key, title, source_type, source_name, source_url,
   reliability_tier, notes)
select target.id, v.source_key, v.title, v.source_type, v.source_name, v.source_url,
       v.reliability_tier, v.notes
from target
cross join (values
  (
    'parkridgehistorycenter-early-history',
    'Early History',
    'historical society article',
    'Park Ridge History Center',
    'https://www.parkridgehistorycenter.org/history/early-history/',
    'official',
    'Local historical society''s published early-history narrative. Names George Penny''s brickyard partner as Robert Meacham and locates the brickyard near present-day Meacham, Elm, and Grand Blvd. Also names George Carpenter as the first village president in 1873.'
  ),
  (
    'encyclopedia-of-chicago-park-ridge',
    'Park Ridge, IL',
    'encyclopedia entry',
    'Encyclopedia of Chicago',
    'http://www.encyclopedia.chicagohistory.org/pages/2203.html',
    'secondary',
    'Chicago Historical Society / Newberry Library encyclopedia entry covering Park Ridge''s founding as Brickton through its 20th-century development.'
  )
) as v(source_key, title, source_type, source_name, source_url, reliability_tier, notes)
on conflict (source_key) do update set
  subdivision_id   = excluded.subdivision_id,
  title            = excluded.title,
  source_type      = excluded.source_type,
  source_name      = excluded.source_name,
  source_url       = excluded.source_url,
  reliability_tier = excluded.reliability_tier,
  notes            = excluded.notes,
  updated_at       = now();

-- ─── Aliases ──────────────────────────────────────────────────────────────

with target as (
  select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision'
), srcs as (
  select source_key, id as source_id from subdivision_sources
  where source_key in ('parkridgehistorycenter-early-history', 'encyclopedia-of-chicago-park-ridge')
)
insert into subdivision_aliases (subdivision_id, alias, alias_type, source_id, confidence)
select target.id, v.alias, 'historical_variant', srcs.source_id, 'high'
from target
cross join (values
  ('Brickton', 'encyclopedia-of-chicago-park-ridge'),
  ('Pennyville', 'parkridgehistorycenter-early-history')
) as v(alias, source_key)
join srcs on srcs.source_key = v.source_key
on conflict (subdivision_id, (lower(alias))) do update set
  alias_type = excluded.alias_type,
  source_id  = excluded.source_id,
  confidence = excluded.confidence;

-- ─── Timeline events ──────────────────────────────────────────────────────

with target as (
  select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision'
), srcs as (
  select source_key, id as source_id from subdivision_sources
  where source_key in ('parkridgehistorycenter-early-history', 'encyclopedia-of-chicago-park-ridge')
)
insert into subdivision_timeline_events
  (subdivision_id, event_year, event_type, title, description, fact_type,
   direct_quote, confidence_level, confidence_reason, source_id, source_name,
   source_reference, display_priority)
select
  target.id, v.event_year, v.event_type, v.title, v.description, v.fact_type,
  v.direct_quote, 'high', v.confidence_reason, srcs.source_id, v.source_name,
  v.source_reference, v.display_priority
from target
cross join (values
  (
    1854,
    'founding',
    'Brickyard opens; community first known as Pennyville',
    'George Penny opened a brickworks in 1854 near a new railroad depot (Chicago, St. Paul & Fond du Lac Railroad, later the Chicago & North Western). Penny partnered with Robert Meacham; the depot community that grew up around the brickyard, sited near present-day Meacham, Elm, and Grand Blvd, was first known as Pennyville.',
    'founding_event',
    'Early settler George Penny, along with business partner Robert Meacham, opened a brickyard in 1854 in the vicinity of Meacham, Elm and Grand Blvd, and the community was known as Pennyville.',
    'Corroborated independently by the Park Ridge History Center and the Encyclopedia of Chicago; the History Center additionally names Robert Meacham as Penny''s partner and gives the brickyard''s location.',
    'Park Ridge History Center',
    'https://www.parkridgehistorycenter.org/history/early-history/',
    10,
    'parkridgehistorycenter-early-history'
  ),
  (
    1857,
    'name_change',
    'Renamed Brickton',
    'At Penny''s suggestion the community was renamed Brickton. The Encyclopedia of Chicago attributes the new name directly to Penny; the Park Ridge History Center dates the change to 1857.',
    'name_change',
    'At Penny''s request, the name was changed to Brickton in 1857, and our community experienced growth when a new railroad depot opened and there was an influx of new residents in the aftermath of the Chicago Fire.',
    'Both sources agree on the Pennyville-to-Brickton sequence; treat 1857 as approximate pending a primary-source date for the rename itself.',
    'Encyclopedia of Chicago',
    'http://www.encyclopedia.chicagohistory.org/pages/2203.html',
    20,
    'encyclopedia-of-chicago-park-ridge'
  ),
  (
    1873,
    'incorporation',
    'Village incorporates as Park Ridge',
    'By 1873 the population of Brickton was 405. When residents voted to incorporate that year, the village was renamed Park Ridge, with George Carpenter as its first village president.',
    'incorporation_event',
    'By 1873 the population of Brickton was 405, and when the residents voted to incorporate that year, the village was renamed Park Ridge with George Carpenter as our first village president.',
    'Corroborated independently by both sources; the 1873 incorporation year and population of 405 agree exactly. George Carpenter as first village president is named by the Park Ridge History Center.',
    'Park Ridge History Center',
    'https://www.parkridgehistorycenter.org/history/early-history/',
    30,
    'parkridgehistorycenter-early-history'
  )
) as v(event_year, event_type, title, description, fact_type, direct_quote,
       confidence_reason, source_name, source_reference, display_priority, source_key)
join srcs on srcs.source_key = v.source_key
where not exists (
  select 1 from subdivision_timeline_events e
  where e.subdivision_id = target.id and e.title = v.title
);

-- ─── Subdivision record itself ────────────────────────────────────────────

update subdivisions
set
  historical_summary =
    'Deed language identifies this plat as "Peeny and Meachem''s Subdivision," parent of Black''s Addition to Park Ridge. That name closely matches George Penny and his business partner Robert Meacham, who opened a brickworks here in 1854; the depot community that grew up around it was first called Pennyville, then renamed Brickton. By 1873 the 405 residents voted to incorporate, renaming the village Park Ridge. This subdivision is therefore believed to be the founding Brickton/Pennyville townsite plat, though the actual recorded plat document has not yet been located to confirm the identity and boundaries match.',
  confidence_reason =
    'The Penny/Meacham-founded, Pennyville-then-Brickton-then-Park-Ridge narrative is now corroborated by two independent secondary sources (Park Ridge History Center; Encyclopedia of Chicago), so the historical facts and aliases attached to this record are high confidence. The subdivision record itself stays at medium confidence because the link between this specific deed-referenced plat and the founding townsite is still an inference from name matching, not a located recorded plat.',
  development_era_start_year = coalesce(development_era_start_year, 1854),
  development_era_end_year   = coalesce(development_era_end_year, 1873),
  updated_at = now()
where normalized_name = 'peeny_and_meachems_subdivision';

-- ─── Research task ────────────────────────────────────────────────────────

with target as (
  select id from subdivisions where normalized_name = 'peeny_and_meachems_subdivision'
)
insert into subdivision_research_tasks
  (subdivision_id, search_query, target_archive, reason, expected_source_type,
   status, priority, notes)
select
  target.id,
  'Locate recorded plat for Peeny and Meachem''s Subdivision / Brickton townsite',
  'Cook County Clerk / Recorder plat records; Park Ridge History Center archives',
  'Confirm whether the recorded plat for "Peeny and Meachem''s Subdivision" geographically and chronologically matches the Brickton/Pennyville townsite described in the Park Ridge History Center and Encyclopedia of Chicago sources, rather than a separate, later resubdivision that happened to reuse a similar name.',
  'recorded subdivision plat',
  'pending',
  'high',
  'If confirmed, raise confidence_level on the subdivision record from medium to high and consider setting recorded_year to 1854 (brickyard/Pennyville founding) or the actual plat recording date, whichever the located document supports.'
from target
where not exists (
  select 1 from subdivision_research_tasks t
  where t.subdivision_id = target.id
    and t.search_query = 'Locate recorded plat for Peeny and Meachem''s Subdivision / Brickton townsite'
);
