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
        <h4>Nearby activity</h4>
        <span>
          {summary.radiusFeet} ft - {summary.windowLabel}
        </span>
      </div>
      <p className="nearby-summary-text">{nearbySummaryText(summary.headline)}</p>
      <dl className="nearby-grid">
        <div>
          <dt>Properties</dt>
          <dd>{formatNumber(summary.nearbyParcelCount)}</dd>
        </div>
        <div>
          <dt>Recent permits</dt>
          <dd>{formatNumber(summary.directPermitParcels)}</dd>
        </div>
        <div>
          <dt>Changing homes</dt>
          <dd>{formatNumber(summary.changingParcels)}</dd>
        </div>
        <div>
          <dt>Teardown pressure</dt>
          <dd>{formatNumber(summary.teardownPressureParcels)}</dd>
        </div>
      </dl>
    </div>
  );
}

function nearbySummaryText(headline: string): string {
  return `${headline}. This separates surrounding permit and teardown pressure from the selected home's own history.`;
}
