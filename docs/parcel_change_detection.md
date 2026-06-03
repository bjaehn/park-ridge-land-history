# Parcel Change Detection

Parcel change detection produces candidates, not final historical conclusions.

The comparison script looks for:

- `unchanged`: same PIN and similar area.
- `geometry_or_area_changed`: same PIN with area change above the configured threshold.
- `likely_split`: one old parcel overlaps multiple later parcels.
- `likely_merge`: multiple old parcels overlap one later parcel.
- `retired_pin`: old PIN has no later match.
- `new_pin`: later PIN has no old match.

Candidate changes still need source verification. PIN reuse, condominium records, tax-only records, survey corrections, and boundary cleanup can all look like subdivision activity even when the legal history is different.

Run:

```bash
python -m scripts.historical_layers.compare_parcel_years OLD.geojson NEW.geojson OUTPUT.geojson --old-year 2000 --new-year 2021
```

The current Park Ridge output compares real Cook County 2000 and 2021 parcel layers:

```bash
python -m scripts.historical_layers.compare_parcel_years public/data/historical/cook_parcels_2000.geojson public/data/historical/cook_parcels_2021.geojson public/data/historical/parcel_changes_2000_2021.geojson --old-year 2000 --new-year 2021 --overlap-threshold-pct 20
```

Current candidate counts:

- `unchanged`: 12,789
- `likely_split`: 76
- `likely_merge`: 54
- `new_pin`: 520
- `retired_pin`: 227
- `geometry_or_area_changed`: 145
