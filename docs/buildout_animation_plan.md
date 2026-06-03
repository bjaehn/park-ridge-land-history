# Cumulative Build-Out Animation Plan

## Goal

Let users watch Park Ridge fill in over time by animating parcels whose primary assessor year-built is less than or equal to the current animation year.

## Data Inputs

- `public/data/park_ridge_parcels_enriched.geojson`
- Required fields: `year_built`, `decade_built`, `pin_normalized`
- Optional summary input: `data/processed/parcel_summary.json`

## Interaction Model

1. Add a play/pause button beside the existing built-by-year slider.
2. Animate from the earliest valid `year_built` to the latest valid `year_built`.
3. Advance by one year per tick, with speed presets such as slow, normal, and fast.
4. Keep the existing decade filters active, but make the animation year the upper bound.
5. Display a compact counter: visible parcels, current year, and percent of known-year parcels built.
6. Add reset and jump-to-decade controls once the basic animation works.

## Implemented Baseline

- Play/pause control beside the existing built-by-year slider.
- Reset control that returns the map to the earliest valid year.
- Slow, normal, and fast playback speeds.
- Cumulative parcel count and percent of known-year parcels built.
- Manual slider changes pause playback and immediately update the map.
- Existing decade filters remain active while the animation year acts as the upper bound.

## Future Implementation Steps

1. Extract timeline state into a small hook, for example `useBuildoutTimeline`, if timeline behavior grows.
2. Add jump-to-decade buttons.
3. Add a visual progress strip showing decade distribution rather than only cumulative percent.
4. Add tests for pure timeline helpers if year stepping or speed logic becomes non-trivial.

## Design Notes

- Keep the animation control compact; this is a map tool, not a landing-page feature.
- Avoid flashing effects. Parcels should appear steadily as the year advances.
- Keep unknown-year parcels controlled by the existing unknown toggle and excluded from cumulative percentage.
- Treat `year_built` as building construction year, not subdivision date, in the UI copy and docs.

## Acceptance Criteria

- Play starts from the current year, or restarts at the earliest valid year when already at the end.
- Pause freezes the map at the current year.
- Reset returns to the earliest valid year.
- Manual slider changes immediately update the map.
- The app remains usable with sample data and generated real data.
