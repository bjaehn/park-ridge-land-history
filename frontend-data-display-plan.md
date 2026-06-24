# Frontend Data Display Plan

Last inspected: 2026-06-23

## Product Rule

Do not dump raw records into public pages. Every fact should appear inside a story component with source, confidence, caveat, and unknown state when needed.

## Property Page Modules

Add or improve:

- Property identity: address, PIN, municipality, property class, source freshness.
- Address confidence: exact PIN match, address-only match, alias address, or missing address.
- Parcel facts: parcel size, geometry availability, PIN parts, current boundary caveat.
- Construction era: year built, decade, neighborhood or block context, assessor caveat.
- Building and lot comparison: compare to street, block, neighborhood, and city medians.
- Sale timeline: date, price, deed type, market sale caveat, document number when available.
- Assessment trend: assessed value chart, appeal markers, tax assessment caveat.
- Permit timeline: permit date, type, description, amount, and coverage caveat.
- Zoning snapshot: district, source link, ordinance link, legal caveat.
- Historic recognition: landmark, 100-year home, HARGIS, confidence and citation.
- Lead service record: material status when available, update date, infrastructure caveat.
- Related subdivision: plat name, recording date, lot and block, confidence, related page.
- Related neighborhood: planning, business district, local name, boundary caveat.
- Related block or street: link to street and block context.
- Source confidence panel: sources used, freshness, confidence, and open caveats.
- What this means summary: plain-language synthesis from verified facts only.
- Caveats and unknowns: explain missing fields and why they are missing.

## Block or Street Page Modules

Add or improve:

- Homes by decade
- Typical year built
- Typical lot size
- Typical home size
- Permit activity
- Sales turnover
- Oldest and newest homes
- Similar homes
- Landmark or 100-year homes nearby
- How this block developed
- Data coverage and caveats

Display pattern:

- Lead with a concise block profile.
- Use charts for distributions.
- Use sortable cards for properties.
- Keep raw parcel rows behind admin only.

## Subdivision Page Modules

Add or improve:

- Subdivision identity
- Plat date if known
- Document reference if known
- Parent tract if known
- Legal description if known
- Approximate polygon
- Lots and blocks
- Streets inside subdivision
- Homes by decade
- Original parcel pattern versus current parcel pattern
- Source confidence
- Needs research indicators
- Related properties

Display pattern:

- Separate verified plat facts from inferred spatial coverage.
- Show confidence badge near the subdivision identity.
- Show needs research as a productive unknown, not a broken state.

## Neighborhood Page Modules

Add or improve:

- Housing stock by decade
- Dominant construction eras
- Subdivisions inside neighborhood
- Landmarks
- Street pattern
- Typical lot size
- Permit activity
- Sales activity
- Development character
- Planning document references
- Boundary confidence caveat

Display pattern:

- Make boundary confidence visible.
- Avoid implying local neighborhood names are official unless sourced.

## City Page Modules

Add or improve:

- Population timeline
- Housing units over time
- Homes built by decade
- Subdivision growth timeline
- Street growth map
- Landmark timeline
- Planning timeline
- Historical map gallery
- Major development eras
- Source coverage dashboard

Display pattern:

- Tell the city growth story by era.
- Use source coverage as a visible methodology feature.

## Data Sources Page Modules

Add or improve:

- Source registry
- Source status
- Authority level
- Refresh frequency
- Last updated
- What each source is used for
- Limitations
- Citation rules
- Public methodology

Display pattern:

- Public users should see why a fact is trustworthy and what is missing.
- Show source freshness without exposing job logs.

## Admin Modules

Add or improve:

- Data coverage dashboard
- Job status dashboard
- Source freshness dashboard
- Queue summary
- Failed jobs
- Unmatched records
- Low-confidence matches
- Historical fact review
- User correction review
- Publish readiness checklist

Display pattern:

- Admin screens should be dense, filterable, and operational.
- Use tables for workflow management.
- Use detail panels for evidence, raw values, normalized values, and actions.

## Story Component Patterns

Recommended reusable components:

- `FactCard`: label, value, source, confidence, caveat.
- `FactTimeline`: dated source-backed events.
- `ComparisonModule`: property value versus block, street, neighborhood, city.
- `SourceConfidencePanel`: source list, freshness, confidence, limitations.
- `UnknownState`: field missing, why missing, next source that may fill it.
- `ReviewBadge`: verified, inferred, hidden, unreviewed, or needs review.
- `CaveatNote`: short warning tied to source type.
- `CoverageMeter`: percent coverage for a fact category.

## Source and Confidence Display Patterns

Every module should show source name, retrieved or last updated date when available, confidence label, link to source page or citation, and caveat when the source has known limitations.

Confidence labels:

- High: direct official record or reviewed evidence.
- Medium: official or strong source with match or interpretation step.
- Low: weak, incomplete, or conflicting source.
- Unknown: source exists but confidence has not been assessed.

## Caveat Display Patterns

Use short caveats near the fact, not buried in a global disclaimer.

Examples:

- Assessment values are tax assessment records, not appraisals.
- Year built is from assessor data and can lag actual construction.
- Permit records may not include all historical work.
- Neighborhood boundaries are approximate unless a source says otherwise.
- Lead service inventory records should be read as infrastructure inventory, not medical advice.
- Flood records are official map references, not insurance determinations.
- Historical maps show observed evidence, not necessarily construction dates.

## Empty and Unknown State Patterns

Unknown states should explain what is missing, why it may be missing, which source could fill it, and whether admin review is needed.

Examples:

- No permit records are in the current dataset. This may mean no digitally available permit was found, not that no work occurred.
- Subdivision not yet matched. Legal descriptions and plat references are still being reviewed.
- Lead service record not matched. Address matching for this source requires admin review.

## Mobile Display Considerations

- Prioritize property identity, construction era, timeline, and source confidence first.
- Collapse long timelines and raw details.
- Keep fact cards compact with stable dimensions.
- Avoid wide raw tables on mobile public pages.
- Admin tables may require horizontal scroll, but key filters and status counts should remain visible.
