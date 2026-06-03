import { CompareYearsPanel } from "./CompareYearsPanel";
import { HistoricalLayerToggle } from "./HistoricalLayerToggle";
import { ParcelChangeSummaryPanel } from "./ParcelChangeSummaryPanel";
import {
  historicalLayerGroupLabels,
  type HistoricalLayer,
  type HistoricalLayerGroup,
  type LoadedHistoricalLayer
} from "../lib/historicalLayerTypes";

type HistoricalLayerPanelProps = {
  layers: HistoricalLayer[];
  activeLayerIds: Set<string>;
  loadedLayers: Record<string, LoadedHistoricalLayer>;
  compareLayerIds: [string | null, string | null];
  onToggleLayer: (layer: HistoricalLayer) => void;
  onSetOpacity: (layerId: string, opacity: number) => void;
  onSetCompareLayerIds: (layerIds: [string | null, string | null]) => void;
};

const groupOrder: HistoricalLayerGroup[] = [
  "parcel_boundaries",
  "subdivision_plats",
  "aerial_imagery",
  "local_history",
  "survey_grid",
  "sanborn",
  "reference"
];

export function HistoricalLayerPanel({
  layers,
  activeLayerIds,
  loadedLayers,
  compareLayerIds,
  onToggleLayer,
  onSetOpacity,
  onSetCompareLayerIds
}: HistoricalLayerPanelProps) {
  const layersByGroup = groupOrder.map((group) => ({
    group,
    layers: layers.filter((layer) => layer.layerGroup === group)
  })).filter((entry) => entry.layers.length > 0);

  return (
    <section className="panel-section historical-panel" aria-label="Historical evidence layers">
      <h2>Historical Layers</h2>
      <p className="historical-note">
        Historical layers are evidence sources. Assessor year built helps date structures, but it is not a subdivision date.
      </p>
      <CompareYearsPanel
        layers={layers}
        compareLayerIds={compareLayerIds}
        onSetCompareLayerIds={onSetCompareLayerIds}
      />
      <ParcelChangeSummaryPanel
        activeLayerIds={activeLayerIds}
        loadedLayers={loadedLayers}
      />
      {layersByGroup.map(({ group, layers: groupLayers }) => (
        <div key={group} className="historical-group">
          <h3>{historicalLayerGroupLabels[group]}</h3>
          {groupLayers.map((layer) => (
            <HistoricalLayerToggle
              key={layer.id}
              layer={layer}
              active={activeLayerIds.has(layer.id)}
              loadedLayer={loadedLayers[layer.id]}
              onToggle={onToggleLayer}
              onSetOpacity={onSetOpacity}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
