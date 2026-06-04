import { formatNumber } from "../lib/formatters";
import { summarizeNearbyActivity } from "../lib/nearbyActivity";
import type { PermitPressureWindow } from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";

type NearbyActivitySummaryProps = {
  parcel: ParcelFeature;
  parcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
};

export function NearbyActivitySummary({
  parcel,
  parcels,
  permitPressureWindow
}: NearbyActivitySummaryProps) {
  const summary = summarizeNearbyActivity(parcel, parcels, permitPressureWindow);
  if (!summary) return null;

  return (
    <div className={`nearby-activity nearby-${summary.signal}`} aria-label="Nearby activity summary">
      <div className="nearby-heading">
        <h4>{summary.headline}</h4>
        <span>
          {summary.radiusFeet} ft · {summary.windowLabel}
        </span>
      </div>
      <dl className="nearby-grid">
        <div>
          <dt>Nearby</dt>
          <dd>{formatNumber(summary.nearbyParcelCount)}</dd>
        </div>
        <div>
          <dt>Permits</dt>
          <dd>{formatNumber(summary.directPermitParcels)}</dd>
        </div>
        <div>
          <dt>Changing</dt>
          <dd>{formatNumber(summary.changingParcels)}</dd>
        </div>
        <div>
          <dt>Teardown</dt>
          <dd>{formatNumber(summary.teardownPressureParcels)}</dd>
        </div>
      </dl>
    </div>
  );
}
