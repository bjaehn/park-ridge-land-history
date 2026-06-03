import { parcelChangeLabels, type ParcelChangeFeature, type ParcelChangeType } from "../lib/parcelChangeTypes";

type ParcelChangeDetailPanelProps = {
  changeFeature: ParcelChangeFeature | null;
  onClearSelection: () => void;
};

export function ParcelChangeDetailPanel({
  changeFeature,
  onClearSelection
}: ParcelChangeDetailPanelProps) {
  const properties = changeFeature?.properties;
  const rows = properties
    ? [
        ["Old PIN", properties.old_pin || "None"],
        ["New PIN", properties.new_pin || "None"],
        ["Change type", formatChangeType(properties.change_type)],
        ["Confidence", formatConfidence(properties.confidence)],
        ["Years", formatYears(properties.old_year, properties.new_year)],
        ["Area change", formatAreaChange(properties.area_change_pct)]
      ]
    : [];

  return (
    <div className="change-detail-panel">
      <div className="section-heading">
        <h3>Change Candidate Details</h3>
        {properties && (
          <button className="text-button" type="button" onClick={onClearSelection}>
            Clear
          </button>
        )}
      </div>

      {!properties && <p>Click a colored parcel-change feature to inspect the candidate.</p>}

      {properties && (
        <dl className="detail-list change-detail-list">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function formatChangeType(changeType: ParcelChangeFeature["properties"]["change_type"]): string {
  if (!changeType) return "Unknown";
  return parcelChangeLabels[changeType as ParcelChangeType] ?? String(changeType);
}

function formatConfidence(confidence: string | null | undefined): string {
  if (!confidence) return "Unknown";
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function formatYears(oldYear: number | null | undefined, newYear: number | null | undefined): string {
  const oldLabel = typeof oldYear === "number" ? String(oldYear) : "Unknown";
  const newLabel = typeof newYear === "number" ? String(newYear) : "Unknown";
  return `${oldLabel} to ${newLabel}`;
}

function formatAreaChange(areaChangePct: number | null | undefined): string {
  if (typeof areaChangePct !== "number") return "Unknown";
  return `${areaChangePct.toLocaleString(undefined, {
    maximumFractionDigits: 2
  })}%`;
}

