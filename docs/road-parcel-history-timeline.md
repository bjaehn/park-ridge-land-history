# Road & Parcel History Timeline

## Product Goal

The Road & Parcel History Timeline helps users see how Park Ridge streets, parcels, and residential development emerged over time. It combines modern parcels, assessor building years, historical overlays, and road-segment evidence into one visual timeline.

The feature is intentionally evidence-led. It should say when a road or parcel is first observed in available sources, not when it was definitely built or legally created unless a direct source proves that.

## Reality Check

There is no known perfect public dataset that gives the exact construction date for every Park Ridge street. Road dates should be modeled as:

- `first_observed_year`
- `first_observed_period`
- `date_type: observed_not_constructed`
- `confidence`
- `evidence`
- `review_status`

Avoid product copy or data fields that imply exact construction dates for roads unless the evidence is direct and authoritative.

## MVP Periods

The MVP uses five broad periods:

1. `pre_1939`
2. `1939_to_1963`
3. `1963_to_1980`
4. `1980_to_2000`
5. `2000_to_present`

These periods match likely source availability: prewar aerial imagery, the 1963 USGS topo baseline, later aerial/parcel snapshots, and modern data.

## Current Implementation

The current MVP includes:

- Typed road-segment history, parcel-history, overlay metadata, and evidence models in `src/lib/roadParcelHistory.ts`.
- Sample data in `public/data/historical/road_parcel_history_sample.json`.
- A Park Ridge tab panel for choosing timeline periods and viewing evidence.
- A MapLibre road-history layer that filters roads by selected period.
- A click-through evidence panel and popup for road segments.

The current road segment dates are demo scaffolding. They are clearly marked with:

- `sample_data: true`
- `confidence: unknown`
- `review_status: unreviewed`
- placeholder evidence

They must not be treated as official historical road dates.

## How To Add A Historical Overlay

1. Add overlay metadata to the road/parcel history dataset or the historical layer registry.
2. Include source name, year, period, source type, coverage, license notes, and georeferencing status.
3. If the overlay is raster imagery, publish it as map tiles or an image overlay with bounds.
4. If the overlay is only a research reference, mark it as not georeferenced.
5. Do not expose an overlay as map-ready until use and redistribution terms are clear.

## How To Add Road Segment History

1. Start from modern road centerlines or a manually digitized segment.
2. Compare against one or more historical sources.
3. Record the earliest source where the segment is visible.
4. Set `first_observed_period` and `first_observed_year` if the source year is specific.
5. Add evidence records for each source checked.
6. Set confidence:
   - `high`: clear feature in a reliable source and independently checked.
   - `medium`: likely feature, but source quality or alignment is imperfect.
   - `low`: weak evidence or uncertain alignment.
   - `unknown`: placeholder, unreviewed, or insufficient evidence.
7. Set review status:
   - `unreviewed`
   - `machine_inferred`
   - `manually_reviewed`
   - `verified`

## How To Add Parcel History

Use current parcels as geometry, then attach historical evidence separately. Building year can come from assessor data, but that is not the same as parcel creation date.

Parcel-origin evidence can come from:

- historical parcel snapshots
- subdivision plats
- Sanborn maps
- aerial imagery showing subdivision pattern
- manually reviewed map overlays

## Limitations

- Current sample road segments are not authoritative.
- Current parcel geometry is modern, not a reconstructed historical parcel fabric.
- Building year is not parcel-subdivision year.
- Sanborn coverage may be partial.
- ILHAP aerials may require download, georeferencing, and tiling.
- Topographic maps are useful for context, not parcel-level proof.

## Expansion Path

1. Download and index Park Ridge-relevant ILHAP sheets.
2. Georeference a small 1938/1939 sample area.
3. Digitize 25 to 50 road segments from that area.
4. Add the 1963 USGS topo as a reference layer.
5. Compare modern road segments against historical overlays.
6. Add a manual review workflow for confidence and source notes.
7. Replace demo road records with reviewed records.
