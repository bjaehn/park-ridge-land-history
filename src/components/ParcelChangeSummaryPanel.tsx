import type { LoadedHistoricalLayer } from "../lib/historicalLayerTypes";

type ParcelChangeSummaryPanelProps = {
  activeLayerIds: Set<string>;
  loadedLayers: Record<string, LoadedHistoricalLayer>;
};

type ChangeType =
  | "likely_split"
  | "likely_merge"
  | "new_pin"
  | "retired_pin"
  | "geometry_or_area_changed"
  | "unchanged"
  | "uncertain_change";

const changeLayerId = "parcel_changes_2000_2021";
const changeLabels: Record<ChangeType, string> = {
  likely_split: "Likely splits",
  likely_merge: "Likely merges",
  new_pin: "New PINs",
  retired_pin: "Retired PINs",
  geometry_or_area_changed: "Area changes",
  unchanged: "Unchanged",
  uncertain_change: "Uncertain"
};

const summaryOrder: ChangeType[] = [
  "likely_split",
  "likely_merge",
  "new_pin",
  "retired_pin",
  "geometry_or_area_changed",
  "unchanged"
];

export function ParcelChangeSummaryPanel({
  activeLayerIds,
  loadedLayers
}: ParcelChangeSummaryPanelProps) {
  const loadedLayer = loadedLayers[changeLayerId];
  const isActive = activeLayerIds.has(changeLayerId);
  const stats = loadedLayer?.data ? summarizeChanges(loadedLayer.data) : null;

  return (
    <div className="change-summary-panel">
      <h3>2000 to 2021 Change Summary</h3>
      {!isActive && <p>Turn on Parcel Changes 2000-2021 to load the computed candidate layer.</p>}
      {isActive && !stats && <p>Loading change candidates...</p>}
      {stats && (
        <>
          <dl className="change-summary-grid">
            {summaryOrder.map((changeType) => (
              <div key={changeType}>
                <dt>{changeLabels[changeType]}</dt>
                <dd>{formatNumber(stats.byType[changeType] ?? 0)}</dd>
              </div>
            ))}
          </dl>
          <p className="change-summary-footnote">
            {formatNumber(stats.changed)} of {formatNumber(stats.total)} candidates need historical verification.
          </p>
        </>
      )}
    </div>
  );
}

function summarizeChanges(data: GeoJSON.FeatureCollection) {
  const byType = data.features.reduce<Partial<Record<ChangeType, number>>>((counts, feature) => {
    const changeType = feature.properties?.change_type as ChangeType | undefined;
    if (!changeType) return counts;
    counts[changeType] = (counts[changeType] ?? 0) + 1;
    return counts;
  }, {});
  const total = data.features.length;
  const unchanged = byType.unchanged ?? 0;
  return {
    byType,
    total,
    changed: total - unchanged
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}
