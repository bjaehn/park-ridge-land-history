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

