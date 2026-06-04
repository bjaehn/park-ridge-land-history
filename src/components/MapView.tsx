import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type LayerSpecification
} from "maplibre-gl";
import { mapLibreFillColor, decadeColors } from "../lib/colorScales";
import { historicalLineColor, historicalLineDash, parcelChangeFillColorExpression } from "../lib/historicalLayerStyles";
import { baseMapStyle, parkRidgeCenter } from "../lib/mapStyle";
import type { LoadedHistoricalLayer } from "../lib/historicalLayerTypes";
import {
  parcelChangeLabels,
  type ParcelChangeFeature,
  type ParcelChangeType
} from "../lib/parcelChangeTypes";
import { permitPressureColors, permitStabilityColors, type PermitPressureMapMode } from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";
import { parcelPopupHtml } from "./ParcelPopup";

type MapViewProps = {
  parcels: ParcelCollection | null;
  selectedParcel: ParcelFeature | null;
  boundary: GeoJSON.FeatureCollection | null;
  showOutlines: boolean;
  showBoundary: boolean;
  showPermitPressure: boolean;
  permitPressureMapMode: PermitPressureMapMode;
  historicalOverlays: LoadedHistoricalLayer[];
  selectedParcelChange: ParcelChangeFeature | null;
  visibleChangeTypes: Set<ParcelChangeType>;
  onSelectParcel: (feature: ParcelFeature) => void;
  onSelectParcelChange: (feature: ParcelChangeFeature) => void;
};

const emptyCollection: ParcelCollection = {
  type: "FeatureCollection",
  features: []
} as const;

export function MapView({
  parcels,
  selectedParcel,
  boundary,
  showOutlines,
  showBoundary,
  showPermitPressure,
  permitPressureMapMode,
  historicalOverlays,
  selectedParcelChange,
  visibleChangeTypes,
  onSelectParcel,
  onSelectParcelChange
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const historicalLayerIdsRef = useRef<string[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectParcelRef = useRef(onSelectParcel);
  const onSelectParcelChangeRef = useRef(onSelectParcelChange);
  const registeredChangeLayerIdsRef = useRef<Set<string>>(new Set());
  const activeChangeLayerIdsRef = useRef<Set<string>>(new Set());
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const latestParcelsRef = useRef<ParcelCollection>(emptyCollection);
  const latestSelectedRef = useRef<GeoJSON.FeatureCollection>(emptyFeatureCollection());
  const latestSelectedChangeRef = useRef<GeoJSON.FeatureCollection>(emptyFeatureCollection());
  const latestBoundaryRef = useRef<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: []
  });
  const hoveredRef = useRef<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: []
  });

  const visibleParcels = useMemo(() => parcels ?? emptyCollection, [parcels]);
  latestParcelsRef.current = visibleParcels;
  latestSelectedRef.current = selectedParcel ? featureCollectionFromFeature(selectedParcel) : emptyFeatureCollection();
  latestSelectedChangeRef.current = selectedParcelChange
    ? featureCollectionFromFeature(selectedParcelChange)
    : emptyFeatureCollection();
  latestBoundaryRef.current = boundary ?? { type: "FeatureCollection", features: [] };
  onSelectParcelRef.current = onSelectParcel;
  onSelectParcelChangeRef.current = onSelectParcelChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseMapStyle,
      center: parkRidgeCenter,
      zoom: 13.4,
      attributionControl: { compact: true }
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true });

    map.on("load", () => {
      map.addSource("parcels", {
        type: "geojson",
        data: latestParcelsRef.current,
        generateId: true
      });

      map.addSource("hovered-parcel", {
        type: "geojson",
        data: hoveredRef.current
      });

      map.addSource("selected-parcel", {
        type: "geojson",
        data: latestSelectedRef.current
      });

      map.addSource("selected-parcel-change", {
        type: "geojson",
        data: latestSelectedChangeRef.current
      });

      map.addSource("boundary", {
        type: "geojson",
        data: latestBoundaryRef.current
      });

      map.addLayer({
        id: "parcel-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": mapLibreFillColor(),
          "fill-opacity": 0.76
        }
      });

      map.addLayer({
        id: "parcel-outline",
        type: "line",
        source: "parcels",
        paint: {
          "line-color": "#1f2937",
          "line-width": 0.7,
          "line-opacity": 0.55
        }
      });

      map.addLayer({
        id: "permit-pressure-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": permitPressureFillColorExpression("stability"),
          "fill-opacity": permitPressureFillOpacityExpression(true, "stability")
        }
      });

      map.addLayer({
        id: "hovered-parcel-fill",
        type: "fill",
        source: "hovered-parcel",
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 0.32
        }
      });

      map.addLayer({
        id: "hovered-parcel-outline",
        type: "line",
        source: "hovered-parcel",
        paint: {
          "line-color": "#111827",
          "line-width": 2.4
        }
      });

      map.addLayer({
        id: "selected-parcel-fill",
        type: "fill",
        source: "selected-parcel",
        paint: {
          "fill-color": "#f8fafc",
          "fill-opacity": 0.46
        }
      });

      map.addLayer({
        id: "selected-parcel-outline",
        type: "line",
        source: "selected-parcel",
        paint: {
          "line-color": "#0f172a",
          "line-width": 3.5
        }
      });

      map.addLayer({
        id: "selected-parcel-change-fill",
        type: "fill",
        source: "selected-parcel-change",
        paint: {
          "fill-color": "#fef3c7",
          "fill-opacity": 0.34
        }
      });

      map.addLayer({
        id: "selected-parcel-change-outline",
        type: "line",
        source: "selected-parcel-change",
        paint: {
          "line-color": "#111827",
          "line-width": 3.2
        }
      });

      map.addLayer({
        id: "boundary-line",
        type: "line",
        source: "boundary",
        paint: {
          "line-color": decadeColors["Pre-1900"],
          "line-width": 2,
          "line-dasharray": [3, 2],
          "line-opacity": 0.9
        }
      });

      setIsMapLoaded(true);
    });

    map.on("mousemove", "parcel-fill", (event) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0] as unknown as ParcelFeature | undefined;
      hoveredRef.current = {
        type: "FeatureCollection",
        features: feature ? [feature] : []
      };
      (map.getSource("hovered-parcel") as GeoJSONSource | undefined)?.setData(hoveredRef.current);
    });

    map.on("mouseleave", "parcel-fill", () => {
      map.getCanvas().style.cursor = "";
      hoveredRef.current = { type: "FeatureCollection", features: [] };
      (map.getSource("hovered-parcel") as GeoJSONSource | undefined)?.setData(hoveredRef.current);
    });

    map.on("click", "parcel-fill", (event) => {
      const changeLayerIds = Array.from(activeChangeLayerIdsRef.current).filter((layerId) => map.getLayer(layerId));
      if (changeLayerIds.length > 0) {
        const changeFeatures = map.queryRenderedFeatures(event.point, { layers: changeLayerIds });
        if (changeFeatures.length > 0) return;
      }

      const feature = event.features?.[0] as unknown as ParcelFeature | undefined;
      if (!feature) return;
      onSelectParcelRef.current(feature);
      popupRef.current
        ?.setLngLat(event.lngLat)
        .setHTML(parcelPopupHtml(feature.properties))
        .addTo(map);
    });

    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const nextLayerIds = new Set(historicalOverlays.map((overlay) => overlay.layer.id));
    historicalLayerIdsRef.current
      .filter((layerId) => !nextLayerIds.has(layerId))
      .forEach((layerId) => removeHistoricalLayer(map, layerId));

    historicalOverlays.forEach((overlay) => {
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
          }, "parcel-fill");
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

      if (hasChangeType(overlay.data)) {
        const changeFilter = parcelChangeFilterExpression(visibleChangeTypes);
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
          registerParcelChangeInteractions(
            map,
            fillLayerId,
            registeredChangeLayerIdsRef.current,
            popupRef,
            onSelectParcelChangeRef
          );
        } else {
          map.setPaintProperty(fillLayerId, "fill-opacity", Math.min(0.62, overlay.opacity));
          map.setFilter(fillLayerId, changeFilter);
        }
        activeChangeLayerIdsRef.current.add(fillLayerId);
      }

      if (!map.getLayer(lineLayerId)) {
        const lineFilter = hasChangeType(overlay.data) ? parcelChangeFilterExpression(visibleChangeTypes) : undefined;
        addLayer(map, {
          id: lineLayerId,
          type: "line",
          source: sourceId,
          filter: lineFilter,
          paint: {
            "line-color": historicalLineColor(overlay.layer),
            "line-width": hasChangeType(overlay.data) ? 2.2 : 2,
            "line-opacity": overlay.opacity,
            "line-dasharray": historicalLineDash(overlay.layer)
          }
        });
      } else {
        map.setPaintProperty(lineLayerId, "line-opacity", overlay.opacity);
        if (hasChangeType(overlay.data)) map.setFilter(lineLayerId, parcelChangeFilterExpression(visibleChangeTypes));
      }
    });

    activeChangeLayerIdsRef.current = new Set(
      historicalOverlays
        .filter((overlay) => overlay.data && hasChangeType(overlay.data))
        .map((overlay) => historicalFillLayerId(overlay.layer.id))
    );
    historicalLayerIdsRef.current = Array.from(nextLayerIds);
    raiseSelectionLayers(map);
  }, [historicalOverlays, isMapLoaded, visibleChangeTypes]);

  useEffect(() => {
    const source = mapRef.current?.getSource("parcels") as GeoJSONSource | undefined;
    source?.setData(visibleParcels);
  }, [visibleParcels]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("selected-parcel") as GeoJSONSource | undefined;
    const selectedCollection = selectedParcel ? featureCollectionFromFeature(selectedParcel) : emptyFeatureCollection();
    source?.setData(selectedCollection);

    if (!map || !selectedParcel) {
      popupRef.current?.remove();
      return;
    }

    const bounds = boundsForFeature(selectedParcel);
    const center = centerForFeature(selectedParcel);
    if (bounds) {
      map.fitBounds(bounds, {
        padding: { top: 80, right: 430, bottom: 80, left: 80 },
        maxZoom: 17,
        duration: 700
      });
    }
    if (center) {
      popupRef.current
        ?.setLngLat(center)
        .setHTML(parcelPopupHtml(selectedParcel.properties))
        .addTo(map);
    }
  }, [selectedParcel]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("selected-parcel-change") as GeoJSONSource | undefined;
    const selectedCollection = selectedParcelChange
      ? featureCollectionFromFeature(selectedParcelChange)
      : emptyFeatureCollection();
    source?.setData(selectedCollection);
  }, [selectedParcelChange]);

  useEffect(() => {
    const source = mapRef.current?.getSource("boundary") as GeoJSONSource | undefined;
    source?.setData(boundary ?? { type: "FeatureCollection", features: [] });
  }, [boundary]);

  useEffect(() => {
    if (mapRef.current?.getLayer("parcel-outline")) {
      mapRef.current.setPaintProperty("parcel-outline", "line-opacity", showOutlines ? 0.55 : 0);
    }
  }, [showOutlines]);

  useEffect(() => {
    if (mapRef.current?.getLayer("boundary-line")) {
      mapRef.current.setPaintProperty("boundary-line", "line-opacity", showBoundary ? 0.9 : 0);
    }
  }, [showBoundary]);

  useEffect(() => {
    if (mapRef.current?.getLayer("permit-pressure-fill")) {
      mapRef.current.setPaintProperty(
        "permit-pressure-fill",
        "fill-color",
        permitPressureFillColorExpression(permitPressureMapMode)
      );
      mapRef.current.setPaintProperty(
        "permit-pressure-fill",
        "fill-opacity",
        permitPressureFillOpacityExpression(showPermitPressure, permitPressureMapMode)
      );
    }
  }, [permitPressureMapMode, showPermitPressure]);

  return <div ref={containerRef} className="map-canvas" aria-label="Park Ridge parcel map" />;
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

function historicalFillLayerId(layerId: string): string {
  return `historical-fill-${layerId}`;
}

function historicalLineLayerId(layerId: string): string {
  return `historical-line-${layerId}`;
}

function hasChangeType(data: GeoJSON.FeatureCollection): boolean {
  return data.features.some((feature) => Boolean(feature.properties?.change_type));
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

function permitPressureFillColorExpression(mapMode: PermitPressureMapMode): ExpressionSpecification {
  const colors = mapMode === "stability" ? permitStabilityColors : permitPressureColors;
  const propertyName = mapMode === "stability" ? "permit_stability_type" : "permit_pressure_type";
  const fallback = mapMode === "stability" ? permitStabilityColors.stable : "rgba(255,255,255,0)";
  const matchValues = Object.entries(colors).flatMap(([pressureType, color]) => [
    pressureType,
    color
  ]);
  return ["match", ["get", propertyName], ...matchValues, fallback] as unknown as ExpressionSpecification;
}

function permitPressureFillOpacityExpression(
  showPermitPressure: boolean,
  mapMode: PermitPressureMapMode
): ExpressionSpecification | number {
  if (!showPermitPressure) return 0;
  if (mapMode === "activity") {
    return [
      "case",
      ["==", ["get", "permit_pressure_type"], "none"],
      0,
      [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "permit_pressure_score"], 0],
        0,
        0.16,
        0.5,
        0.46,
        1,
        0.72
      ]
    ] as ExpressionSpecification;
  }
  return [
    "case",
    ["==", ["get", "permit_stability_type"], "stable"],
    0.24,
    [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "permit_pressure_score"], 0],
      0,
      0.16,
      0.5,
      0.46,
      1,
      0.72
    ]
  ] as ExpressionSpecification;
}

function raiseSelectionLayers(map: maplibregl.Map): void {
  [
    "selected-parcel-fill",
    "selected-parcel-outline",
    "selected-parcel-change-fill",
    "selected-parcel-change-outline"
  ].forEach((layerId) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  });
}

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function featureCollectionFromFeature(
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [feature]
  };
}

function boundsForFeature(feature: ParcelFeature): maplibregl.LngLatBounds | null {
  const coordinates = flattenCoordinates(feature.geometry.coordinates);
  if (coordinates.length === 0) return null;
  const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
  coordinates.forEach((coordinate) => bounds.extend(coordinate));
  return bounds;
}

function centerForFeature(feature: ParcelFeature): [number, number] | null {
  const coordinates = flattenCoordinates(feature.geometry.coordinates);
  if (coordinates.length === 0) return null;
  const total = coordinates.reduce(
    (sum, coordinate) => {
      sum[0] += coordinate[0];
      sum[1] += coordinate[1];
      return sum;
    },
    [0, 0]
  );
  return [total[0] / coordinates.length, total[1] / coordinates.length];
}

function flattenCoordinates(coordinates: GeoJSON.Position[][] | GeoJSON.Position[][][]): [number, number][] {
  const positions: [number, number][] = [];
  collectPositions(coordinates, positions);
  return positions;
}

function collectPositions(value: unknown, positions: [number, number][]): void {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    positions.push([value[0], value[1]]);
    return;
  }
  value.forEach((item) => collectPositions(item, positions));
}

function parcelChangePopupHtml(properties: ParcelChangeFeature["properties"]): string {
  const changeType = properties.change_type as ParcelChangeType | undefined;
  const label = changeType ? parcelChangeLabels[changeType] ?? String(changeType) : "Unknown";
  return `
    <div class="parcel-popup">
      <h3>${escapeHtml(label)}</h3>
      <dl>
        ${popupRow("Old PIN", properties.old_pin || "None")}
        ${popupRow("New PIN", properties.new_pin || "None")}
        ${popupRow("Confidence", formatConfidence(properties.confidence))}
        ${popupRow("Years", formatChangeYears(properties.old_year, properties.new_year))}
        ${popupRow("Area change", formatAreaChange(properties.area_change_pct))}
      </dl>
    </div>
  `;
}

function popupRow(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function formatConfidence(confidence: string | null | undefined): string {
  if (!confidence) return "Unknown";
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function formatChangeYears(oldYear: number | null | undefined, newYear: number | null | undefined): string {
  const oldLabel = typeof oldYear === "number" ? String(oldYear) : "Unknown";
  const newLabel = typeof newYear === "number" ? String(newYear) : "Unknown";
  return `${oldLabel} to ${newLabel}`;
}

function formatAreaChange(areaChangePct: number | null | undefined): string {
  if (typeof areaChangePct !== "number") return "Unknown";
  return `${areaChangePct.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
