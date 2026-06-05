import maplibregl, {
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type LayerSpecification
} from "maplibre-gl";
import {
  historicalLineColor,
  historicalLineDash,
  hargisHistoricSurveyFillColorExpression,
  historicCharacterFillColorExpression,
  lotCoverageFillColorExpression,
  parcelChangeFillColorExpression
} from "./historicalLayerStyles";
import type { HistoricalLayerRenderMode, LoadedHistoricalLayer } from "./historicalLayerTypes";
import { parcelChangePopupHtml } from "./mapPopups";
import type { ParcelChangeFeature, ParcelChangeType } from "./parcelChangeTypes";

type RenderHistoricalOverlayOptions = {
  map: maplibregl.Map;
  overlays: LoadedHistoricalLayer[];
  previousLayerIds: string[];
  registeredChangeLayerIds: Set<string>;
  visibleChangeTypes: Set<ParcelChangeType>;
  popupRef: { current: maplibregl.Popup | null };
  onSelectParcelChangeRef: { current: (feature: ParcelChangeFeature) => void };
};

type RenderHistoricalOverlayResult = {
  layerIds: string[];
  activeChangeLayerIds: Set<string>;
};

export function renderHistoricalOverlays({
  map,
  overlays,
  previousLayerIds,
  registeredChangeLayerIds,
  visibleChangeTypes,
  popupRef,
  onSelectParcelChangeRef
}: RenderHistoricalOverlayOptions): RenderHistoricalOverlayResult {
  const nextLayerIds = new Set(overlays.map((overlay) => overlay.layer.id));
  previousLayerIds
    .filter((layerId) => !nextLayerIds.has(layerId))
    .forEach((layerId) => removeHistoricalLayer(map, layerId));

  overlays.forEach((overlay) => {
    renderHistoricalOverlay(map, overlay, {
      registeredChangeLayerIds,
      visibleChangeTypes,
      popupRef,
      onSelectParcelChangeRef,
      rasterBeforeLayerId: "parcel-fill"
    });
  });

  return {
    layerIds: Array.from(nextLayerIds),
    activeChangeLayerIds: new Set(
      overlays
        .filter((overlay) => isChangeCandidateOverlay(overlay))
        .map((overlay) => historicalFillLayerId(overlay.layer.id))
    )
  };
}

export function updateSwipeHistoricalLayers(
  map: maplibregl.Map,
  overlays: LoadedHistoricalLayer[],
  registeredLayerIds: string[]
): void {
  const nextLayerIds = new Set(overlays.map((overlay) => overlay.layer.id));
  registeredLayerIds
    .filter((layerId) => !nextLayerIds.has(layerId))
    .forEach((layerId) => removeHistoricalLayer(map, layerId));

  overlays.forEach((overlay) => {
    renderHistoricalOverlay(map, overlay);
  });

  registeredLayerIds.splice(0, registeredLayerIds.length, ...Array.from(nextLayerIds));
}

export function raiseSelectionLayers(map: maplibregl.Map): void {
  [
    "selected-parcel-fill",
    "selected-parcel-outline",
    "selected-parcel-change-fill",
    "selected-parcel-change-outline"
  ].forEach((layerId) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  });
}

export function historicalFillLayerId(layerId: string): string {
  return `historical-fill-${layerId}`;
}

type RenderSingleOverlayOptions = {
  registeredChangeLayerIds?: Set<string>;
  visibleChangeTypes?: Set<ParcelChangeType>;
  popupRef?: { current: maplibregl.Popup | null };
  onSelectParcelChangeRef?: { current: (feature: ParcelChangeFeature) => void };
  rasterBeforeLayerId?: string;
};

function renderHistoricalOverlay(
  map: maplibregl.Map,
  overlay: LoadedHistoricalLayer,
  options: RenderSingleOverlayOptions = {}
): void {
  const sourceId = historicalSourceId(overlay.layer.id);
  const rasterLayerId = historicalRasterLayerId(overlay.layer.id);
  const fillLayerId = historicalFillLayerId(overlay.layer.id);
  const lineLayerId = historicalLineLayerId(overlay.layer.id);

  if (overlay.layer.tileUrl) {
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "raster",
        tiles: [overlay.layer.tileUrl],
        tileSize: 256,
        attribution: overlay.layer.attribution
      });
    }
    if (!map.getLayer(rasterLayerId)) {
      addLayer(map, {
        id: rasterLayerId,
        type: "raster",
        source: sourceId,
        paint: {
          "raster-opacity": overlay.opacity
        }
      }, options.rasterBeforeLayerId);
    } else {
      map.setPaintProperty(rasterLayerId, "raster-opacity", overlay.opacity);
    }
    return;
  }

  if (!overlay.data) return;

  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (source) {
    source.setData(overlay.data);
  } else {
    map.addSource(sourceId, {
      type: "geojson",
      data: overlay.data
    });
  }

  renderHistoricalFillLayer(map, overlay, fillLayerId, sourceId, options);
  renderHistoricalLineLayer(map, overlay, lineLayerId, sourceId, options.visibleChangeTypes);
}

function renderHistoricalFillLayer(
  map: maplibregl.Map,
  overlay: LoadedHistoricalLayer,
  fillLayerId: string,
  sourceId: string,
  options: RenderSingleOverlayOptions
): void {
  if (!overlay.data) return;
  const renderMode = overlayRenderMode(overlay);

  if (renderMode === "change_candidates" && options.visibleChangeTypes) {
    const changeFilter = parcelChangeFilterExpression(options.visibleChangeTypes);
    if (!map.getLayer(fillLayerId)) {
      addLayer(map, {
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        filter: changeFilter,
        paint: {
          "fill-color": parcelChangeFillColorExpression(),
          "fill-opacity": Math.min(0.62, overlay.opacity)
        }
      });
      if (options.registeredChangeLayerIds && options.popupRef && options.onSelectParcelChangeRef) {
        registerParcelChangeInteractions(
          map,
          fillLayerId,
          options.registeredChangeLayerIds,
          options.popupRef,
          options.onSelectParcelChangeRef
        );
      }
    } else {
      map.setPaintProperty(fillLayerId, "fill-opacity", Math.min(0.62, overlay.opacity));
      map.setFilter(fillLayerId, changeFilter);
    }
    return;
  }

  if (renderMode === "parcel_heat") {
    setOrAddFillLayer(map, fillLayerId, sourceId, {
      fillColor: lotCoverageFillColorExpression(),
      fillOpacity: Math.min(0.66, overlay.opacity)
    });
    return;
  }

  if (renderMode === "highlight") {
    setOrAddFillLayer(map, fillLayerId, sourceId, {
      fillColor: overlay.layer.id.includes("hargis")
        ? hargisHistoricSurveyFillColorExpression()
        : historicCharacterFillColorExpression(),
      fillOpacity: Math.min(0.54, overlay.opacity)
    });
  }
}

function renderHistoricalLineLayer(
  map: maplibregl.Map,
  overlay: LoadedHistoricalLayer,
  lineLayerId: string,
  sourceId: string,
  visibleChangeTypes: Set<ParcelChangeType> | undefined
): void {
  const lineFilter = isChangeCandidateOverlay(overlay) && visibleChangeTypes
    ? parcelChangeFilterExpression(visibleChangeTypes)
    : undefined;
  if (!map.getLayer(lineLayerId)) {
    addLayer(map, {
      id: lineLayerId,
      type: "line",
      source: sourceId,
      filter: lineFilter,
      paint: {
        "line-color": historicalLineColor(overlay.layer),
        "line-width": historicalLineWidth(overlay),
        "line-opacity": overlay.opacity,
        "line-dasharray": historicalLineDash(overlay.layer)
      }
    });
  } else {
    map.setPaintProperty(lineLayerId, "line-opacity", overlay.opacity);
    if (lineFilter) map.setFilter(lineLayerId, lineFilter);
  }
}

function setOrAddFillLayer(
  map: maplibregl.Map,
  layerId: string,
  sourceId: string,
  paint: {
    fillColor: ExpressionSpecification;
    fillOpacity: number;
  }
): void {
  if (!map.getLayer(layerId)) {
    addLayer(map, {
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": paint.fillColor,
        "fill-opacity": paint.fillOpacity
      }
    });
    return;
  }
  map.setPaintProperty(layerId, "fill-opacity", paint.fillOpacity);
}

function addLayer(
  map: maplibregl.Map,
  layer: LayerSpecification,
  beforeLayerId?: string
): void {
  if (beforeLayerId && map.getLayer(beforeLayerId)) {
    map.addLayer(layer, beforeLayerId);
    return;
  }
  map.addLayer(layer);
}

function registerParcelChangeInteractions(
  map: maplibregl.Map,
  layerId: string,
  registeredLayerIds: Set<string>,
  popupRef: { current: maplibregl.Popup | null },
  onSelectParcelChangeRef: { current: (feature: ParcelChangeFeature) => void }
): void {
  if (registeredLayerIds.has(layerId)) return;
  registeredLayerIds.add(layerId);

  map.on("mousemove", layerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("click", layerId, (event) => {
    const feature = event.features?.[0] as unknown as ParcelChangeFeature | undefined;
    if (!feature) return;
    onSelectParcelChangeRef.current(feature);
    popupRef.current
      ?.setLngLat(event.lngLat)
      .setHTML(parcelChangePopupHtml(feature.properties))
      .addTo(map);
  });
}

function removeHistoricalLayer(map: maplibregl.Map, layerId: string): void {
  [
    historicalRasterLayerId(layerId),
    historicalFillLayerId(layerId),
    historicalLineLayerId(layerId)
  ].forEach((mapLayerId) => {
    if (map.getLayer(mapLayerId)) map.removeLayer(mapLayerId);
  });

  const sourceId = historicalSourceId(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

function historicalSourceId(layerId: string): string {
  return `historical-source-${layerId}`;
}

function historicalRasterLayerId(layerId: string): string {
  return `historical-raster-${layerId}`;
}

function historicalLineLayerId(layerId: string): string {
  return `historical-line-${layerId}`;
}

function overlayRenderMode(overlay: LoadedHistoricalLayer): HistoricalLayerRenderMode {
  if (overlay.layer.renderMode) return overlay.layer.renderMode;
  if (!overlay.data) return "line";
  if (hasChangeType(overlay.data)) return "change_candidates";
  if (hasLotCoverage(overlay.data)) return "parcel_heat";
  if (hasHistoricCharacter(overlay.data)) return "highlight";
  return "line";
}

function isChangeCandidateOverlay(overlay: LoadedHistoricalLayer): boolean {
  return overlayRenderMode(overlay) === "change_candidates";
}

function hasChangeType(data: GeoJSON.FeatureCollection): boolean {
  return data.features.some((feature) => Boolean(feature.properties?.change_type));
}

function hasLotCoverage(data: GeoJSON.FeatureCollection): boolean {
  return data.features.some((feature) => feature.properties?.layer_kind === "lot_coverage");
}

function hasHistoricCharacter(data: GeoJSON.FeatureCollection): boolean {
  return data.features.some((feature) => feature.properties?.layer_kind === "historic_character");
}

function historicalLineWidth(overlay: LoadedHistoricalLayer): number {
  const renderMode = overlayRenderMode(overlay);
  if (renderMode === "change_candidates") return 2.2;
  if (renderMode === "footprint") return 0.8;
  if (renderMode === "parcel_heat") return 0.35;
  return 2;
}

function parcelChangeFilterExpression(visibleChangeTypes: Set<ParcelChangeType>): FilterSpecification {
  if (visibleChangeTypes.size === 0) {
    return ["==", ["get", "change_type"], "__no_visible_change_types__"] as FilterSpecification;
  }

  return [
    "in",
    ["get", "change_type"],
    ["literal", Array.from(visibleChangeTypes)]
  ] as FilterSpecification;
}
