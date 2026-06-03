import pandas as pd

from scripts.historical_layers.normalize_historical_parcels import normalize_historical_parcel_frame


def test_historical_parcel_normalization_adds_pin_and_year_fields():
    frame = pd.DataFrame({"pin": ["09-25-101-001-0000"], "name": ["sample parcel"]})

    result = normalize_historical_parcel_frame(frame, year=2000, pin_column="pin")

    assert result.loc[0, "pin_normalized"] == "09251010010000"
    assert result.loc[0, "source_year"] == 2000
    assert bool(result.loc[0, "synthetic_sample"]) is False
