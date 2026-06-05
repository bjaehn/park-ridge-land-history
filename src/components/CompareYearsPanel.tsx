import { layerCanToggle, type HistoricalLayer } from "../lib/historicalLayerTypes";

type CompareYearsPanelProps = {
  layers: HistoricalLayer[];
  compareLayerIds: [string | null, string | null];
  swipeEnabled: boolean;
  swipePosition: number;
  onSetCompareLayerIds: (layerIds: [string | null, string | null]) => void;
  onSetSwipeEnabled: (enabled: boolean) => void;
  onSetSwipePosition: (position: number) => void;
};

export function CompareYearsPanel({
  layers,
  compareLayerIds,
  swipeEnabled,
  swipePosition,
  onSetCompareLayerIds,
  onSetSwipeEnabled,
  onSetSwipePosition
}: CompareYearsPanelProps) {
  const parcelYearLayers = layers
    .filter((layer) => layer.layerGroup === "parcel_boundaries" && typeof layer.year === "number")
    .sort((left, right) => (left.year ?? 0) - (right.year ?? 0));
  const readyParcelYearLayers = parcelYearLayers.filter(layerCanToggle);
  const [leftLayerId, rightLayerId] = compareLayerIds;

  function chooseLeft(layerId: string) {
    onSetCompareLayerIds([layerId || null, rightLayerId]);
  }

  function chooseRight(layerId: string) {
    onSetCompareLayerIds([leftLayerId, layerId || null]);
  }

  return (
    <div className="compare-panel">
      <h3>Compare Two Parcel Maps</h3>
      <div className="compare-grid">
        <label>
          <span>Older map</span>
          <select value={leftLayerId ?? ""} onChange={(event) => chooseLeft(event.target.value)}>
            <option value="">None</option>
            {parcelYearLayers.map((layer) => (
              <option key={layer.id} value={layer.id} disabled={!layerCanToggle(layer)}>
                {layer.year} {layerCanToggle(layer) ? "" : "(not ready)"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Newer map</span>
          <select value={rightLayerId ?? ""} onChange={(event) => chooseRight(event.target.value)}>
            <option value="">None</option>
            {parcelYearLayers.map((layer) => (
              <option key={layer.id} value={layer.id} disabled={!layerCanToggle(layer)}>
                {layer.year} {layerCanToggle(layer) ? "" : "(not ready)"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {readyParcelYearLayers.length >= 2 ? (
        <p className="compare-message">Pick two years to compare parcel shapes from different points in time.</p>
      ) : (
        <p className="compare-message">At least two parcel-year layers need data before comparison is map-ready.</p>
      )}
      <div className="swipe-controls">
        <label className="check-row check-row-strong">
          <input
            type="checkbox"
            checked={swipeEnabled}
            onChange={(event) => onSetSwipeEnabled(event.target.checked)}
          />
          <span>Drag a divider between the two maps</span>
        </label>
        <label className="range-control swipe-range">
          <span>Divider position: {swipePosition}%</span>
          <input
            type="range"
            min={20}
            max={80}
            step={1}
            value={swipePosition}
            onChange={(event) => onSetSwipePosition(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
