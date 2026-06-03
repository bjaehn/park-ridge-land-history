import type { LoadedHistoricalLayer } from "../lib/historicalLayerTypes";
import {
  parcelChangeFilterOrder,
  parcelChangeLabels,
  parcelChangeLayerId,
  type ParcelChangeType
} from "../lib/parcelChangeTypes";

type ParcelChangeSummaryPanelProps = {
  activeLayerIds: Set<string>;
  loadedLayers: Record<string, LoadedHistoricalLayer>;
  visibleChangeTypes: Set<ParcelChangeType>;
  onToggleChangeType: (changeType: ParcelChangeType) => void;
  onSelectAllChangeTypes: () => void;
  onShowChangedOnly: () => void;
};

export function ParcelChangeSummaryPanel({
  activeLayerIds,
  loadedLayers,
  visibleChangeTypes,
  onToggleChangeType,
  onSelectAllChangeTypes,
  onShowChangedOnly
}: ParcelChangeSummaryPanelProps) {
  const loadedLayer = loadedLayers[parcelChangeLayerId];
  const isActive = activeLayerIds.has(parcelChangeLayerId);
  const stats = loadedLayer?.data ? summarizeChanges(loadedLayer.data) : null;
  const visibleCount = stats
    ? parcelChangeFilterOrder.reduce((sum, changeType) => {
        return visibleChangeTypes.has(changeType) ? sum + (stats.byType[changeType] ?? 0) : sum;
      }, 0)
    : 0;

  return (
    <div className="change-summary-panel">
      <h3>2000 to 2021 Change Summary</h3>
      {!isActive && <p>Turn on Parcel Changes 2000-2021 to load the computed candidate layer.</p>}
      {isActive && !stats && <p>Loading change candidates...</p>}
      {stats && (
        <>
          <dl className="change-summary-grid">
            {parcelChangeFilterOrder.map((changeType) => (
              <div key={changeType}>
                <dt>{pluralizeChangeLabel(changeType)}</dt>
                <dd>{formatNumber(stats.byType[changeType] ?? 0)}</dd>
              </div>
            ))}
          </dl>
          <div className="change-filter-header">
            <span>{formatNumber(visibleCount)} visible</span>
            <div className="mini-actions">
              <button type="button" onClick={onShowChangedOnly}>Changed</button>
              <button type="button" onClick={onSelectAllChangeTypes}>All</button>
            </div>
          </div>
          <div className="change-filter-grid" aria-label="Change type filters">
            {parcelChangeFilterOrder.map((changeType) => (
              <label className="check-row" key={changeType}>
                <input
                  type="checkbox"
                  checked={visibleChangeTypes.has(changeType)}
                  onChange={() => onToggleChangeType(changeType)}
                />
                <span>{pluralizeChangeLabel(changeType)}</span>
              </label>
            ))}
          </div>
          <p className="change-summary-footnote">
            {formatNumber(stats.changed)} of {formatNumber(stats.total)} candidates need historical verification.
          </p>
        </>
      )}
    </div>
  );
}

function summarizeChanges(data: GeoJSON.FeatureCollection) {
  const byType = data.features.reduce<Partial<Record<ParcelChangeType, number>>>((counts, feature) => {
    const changeType = feature.properties?.change_type as ParcelChangeType | undefined;
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

function pluralizeChangeLabel(changeType: ParcelChangeType): string {
  if (changeType === "unchanged") return parcelChangeLabels[changeType];
  return `${parcelChangeLabels[changeType]}s`;
}
