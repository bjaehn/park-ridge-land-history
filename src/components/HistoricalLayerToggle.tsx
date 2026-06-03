import { HistoricalLayerInfo } from "./HistoricalLayerInfo";
import { LayerStatusBadge } from "./LayerStatusBadge";
import { OpacitySlider } from "./OpacitySlider";
import { layerCanToggle, layerNeedsOpacity, type HistoricalLayer, type LoadedHistoricalLayer } from "../lib/historicalLayerTypes";

type HistoricalLayerToggleProps = {
  layer: HistoricalLayer;
  active: boolean;
  loadedLayer?: LoadedHistoricalLayer;
  onToggle: (layer: HistoricalLayer) => void;
  onSetOpacity: (layerId: string, opacity: number) => void;
};

export function HistoricalLayerToggle({
  layer,
  active,
  loadedLayer,
  onToggle,
  onSetOpacity
}: HistoricalLayerToggleProps) {
  const canToggle = layerCanToggle(layer);
  const opacity = loadedLayer?.opacity ?? layer.opacityDefault ?? 0.75;

  return (
    <div className={`historical-layer-row ${active ? "is-active" : ""}`}>
      <div className="historical-layer-main">
        <label className={`check-row check-row-strong ${canToggle ? "" : "disabled-row"}`}>
          <input
            type="checkbox"
            checked={active}
            disabled={!canToggle}
            onChange={() => onToggle(layer)}
          />
          <span>{layer.name}</span>
        </label>
        <LayerStatusBadge status={layer.status} />
      </div>
      <p className="historical-layer-description">{layer.description}</p>
      {active && layerNeedsOpacity(layer) && (
        <OpacitySlider
          layerId={layer.id}
          value={opacity}
          onChange={(value) => onSetOpacity(layer.id, value)}
        />
      )}
      {!canToggle && <p className="historical-layer-note">Registered for the pipeline, not yet map-ready.</p>}
      {layer.syntheticSample && <p className="sample-historical-notice">Synthetic sample for workflow testing.</p>}
      <HistoricalLayerInfo layer={layer} loadError={loadedLayer?.loadError} />
    </div>
  );
}
