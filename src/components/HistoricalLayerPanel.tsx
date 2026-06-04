import { CompareYearsPanel } from "./CompareYearsPanel";
import { HistoricalLayerToggle } from "./HistoricalLayerToggle";
import { ParcelChangeDetailPanel } from "./ParcelChangeDetailPanel";
import { ParcelChangeSummaryPanel } from "./ParcelChangeSummaryPanel";
import {
  historicalLayerGroupLabels,
  type HistoricalLayer,
  type HistoricalLayerGroup,
  type LoadedHistoricalLayer
} from "../lib/historicalLayerTypes";
import type { ParcelChangeFeature, ParcelChangeType } from "../lib/parcelChangeTypes";

type HistoricalLayerPanelProps = {
  layers: HistoricalLayer[];
  activeLayerIds: Set<string>;
  loadedLayers: Record<string, LoadedHistoricalLayer>;
  compareLayerIds: [string | null, string | null];
  swipeEnabled: boolean;
  swipePosition: number;
  selectedParcelChange: ParcelChangeFeature | null;
  visibleChangeTypes: Set<ParcelChangeType>;
  onToggleLayer: (layer: HistoricalLayer) => void;
  onSetOpacity: (layerId: string, opacity: number) => void;
  onSetCompareLayerIds: (layerIds: [string | null, string | null]) => void;
  onSetSwipeEnabled: (enabled: boolean) => void;
  onSetSwipePosition: (position: number) => void;
  onClearParcelChangeSelection: () => void;
  onToggleChangeType: (changeType: ParcelChangeType) => void;
  onSelectAllChangeTypes: () => void;
  onShowChangedOnly: () => void;
};

const groupOrder: HistoricalLayerGroup[] = [
  "parcel_boundaries",
  "subdivision_plats",
  "aerial_imagery",
  "local_history",
  "built_environment",
  "survey_grid",
  "sanborn",
  "reference"
];

export function HistoricalLayerPanel({
  layers,
  activeLayerIds,
  loadedLayers,
  compareLayerIds,
  swipeEnabled,
  swipePosition,
  selectedParcelChange,
  visibleChangeTypes,
  onToggleLayer,
  onSetOpacity,
  onSetCompareLayerIds,
  onSetSwipeEnabled,
  onSetSwipePosition,
  onClearParcelChangeSelection,
  onToggleChangeType,
  onSelectAllChangeTypes,
  onShowChangedOnly
}: HistoricalLayerPanelProps) {
  const layersByGroup = groupOrder.map((group) => ({
    group,
    layers: layers.filter((layer) => layer.layerGroup === group)
  })).filter((entry) => entry.layers.length > 0);

  return (
    <section className="panel-section historical-panel" aria-label="Historical evidence layers">
      <h2>Optional Data Layers</h2>
      <p className="historical-note">
        Turn these on when you want extra evidence above the current map mode. Start with one or two layers at a time.
      </p>
      <CompareYearsPanel
        layers={layers}
        compareLayerIds={compareLayerIds}
        swipeEnabled={swipeEnabled}
        swipePosition={swipePosition}
        onSetCompareLayerIds={onSetCompareLayerIds}
        onSetSwipeEnabled={onSetSwipeEnabled}
        onSetSwipePosition={onSetSwipePosition}
      />
      <ParcelChangeSummaryPanel
        activeLayerIds={activeLayerIds}
        loadedLayers={loadedLayers}
        visibleChangeTypes={visibleChangeTypes}
        onToggleChangeType={onToggleChangeType}
        onSelectAllChangeTypes={onSelectAllChangeTypes}
        onShowChangedOnly={onShowChangedOnly}
      />
      <ParcelChangeDetailPanel
        changeFeature={selectedParcelChange}
        onClearSelection={onClearParcelChangeSelection}
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
