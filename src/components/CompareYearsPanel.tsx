import { layerCanToggle, type HistoricalLayer } from "../lib/historicalLayerTypes";

type CompareYearsPanelProps = {
  layers: HistoricalLayer[];
  compareLayerIds: [string | null, string | null];
  onSetCompareLayerIds: (layerIds: [string | null, string | null]) => void;
};

export function CompareYearsPanel({
  layers,
  compareLayerIds,
  onSetCompareLayerIds
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
      <h3>Compare Parcel Years</h3>
      <div className="compare-grid">
        <label>
          <span>Earlier</span>
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
          <span>Later</span>
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
        <p className="compare-message">Ready sample years can be overlaid together. Change candidates are a separate evidence layer below.</p>
      ) : (
        <p className="compare-message">At least two parcel-year layers need data before comparison is map-ready.</p>
      )}
    </div>
  );
}
