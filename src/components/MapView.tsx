import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type ExpressionSpecification,
  type GeoJSONSource
} from "maplibre-gl";
import { mapLibreFillColor, decadeColors } from "../lib/colorScales";
import {
  raiseSelectionLayers,
  renderHistoricalOverlays,
  updateSwipeHistoricalLayers
} from "../lib/historicalOverlayRenderer";
import { baseMapStyle, parkRidgeCenter } from "../lib/mapStyle";
import type { LoadedHistoricalLayer } from "../lib/historicalLayerTypes";
import type { AreaSignal, AreaSummaryCollection, AreaSummaryFeature } from "../lib/areaGroups";
import type { HotspotCollection, HotspotFeature, HotspotType } from "../lib/hotspots";
import { hotspotPopupHtml, roadHistoryPopupHtml } from "../lib/mapPopups";
import type { ParcelChangeFeature, ParcelChangeType } from "../lib/parcelChangeTypes";
import {
  permitPressureColors,
  permitPressureLegendOrder,
  permitStabilityColors,
  permitStabilityLegendOrder,
  type PermitPressureMapMode
} from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature, PermitPressureType, PermitStabilityType } from "../lib/parcelTypes";
import {
  historyPeriods,
  roadHistoryColor,
  type HistoryPeriodId,
  type RoadSegmentHistoryCollection,
  type RoadSegmentHistoryFeature
} from "../lib/roadParcelHistory";
import { parcelPopupHtml } from "./ParcelPopup";

type MapViewProps = {
  parcels: ParcelCollection | null;
  selectedParcel: ParcelFeature | null;
  selectedBlockParcels: ParcelCollection | null;
  boundary: GeoJSON.FeatureCollection | null;
  showOutlines: boolean;
  showBoundary: boolean;
  showPermitPressure: boolean;
  permitPressureMapMode: PermitPressureMapMode;
  visiblePermitPressureTypes: Set<PermitPressureType>;
  visiblePermitStabilityTypes: Set<PermitStabilityType>;
  historicalOverlays: LoadedHistoricalLayer[];
  swipeEnabled: boolean;
  swipePosition: number;
  hotspots: HotspotCollection;
  areaSummaries: AreaSummaryCollection;
  selectedHotspot: HotspotFeature | null;
  selectedArea: AreaSummaryFeature | null;
  selectedParcelChange: ParcelChangeFeature | null;
  roadHistory: RoadSegmentHistoryCollection | null;
  showRoadHistory: boolean;
  selectedHistoryPeriod: HistoryPeriodId;
  visibleChangeTypes: Set<ParcelChangeType>;
  onSelectParcel: (feature: ParcelFeature) => void;
  onSelectParcelChange: (feature: ParcelChangeFeature) => void;
  onSelectHotspot: (feature: HotspotFeature) => void;
  onSelectArea: (feature: AreaSummaryFeature) => void;
  onSelectRoadHistory: (feature: RoadSegmentHistoryFeature) => void;
};

const emptyCollection: ParcelCollection = {
  type: "FeatureCollection",
  features: []
} as const;

export function MapView({
  parcels,
  selectedParcel,
  selectedBlockParcels,
  boundary,
  showOutlines,
  showBoundary,
  showPermitPressure,
  permitPressureMapMode,
  visiblePermitPressureTypes,
  visiblePermitStabilityTypes,
  historicalOverlays,
  swipeEnabled,
  swipePosition,
  hotspots,
  areaSummaries,
  selectedHotspot,
  selectedArea,
  selectedParcelChange,
  roadHistory,
  showRoadHistory,
  selectedHistoryPeriod,
  visibleChangeTypes,
  onSelectParcel,
  onSelectParcelChange,
  onSelectHotspot,
  onSelectArea,
  onSelectRoadHistory
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const swipeContainerRef = useRef<HTMLDivElement | null>(null);
  const swipeMapRef = useRef<maplibregl.Map | null>(null);
  const swipeLayerIdsRef = useRef<string[]>([]);
  const historicalLayerIdsRef = useRef<string[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectParcelRef = useRef(onSelectParcel);
  const onSelectParcelChangeRef = useRef(onSelectParcelChange);
  const onSelectHotspotRef = useRef(onSelectHotspot);
  const onSelectAreaRef = useRef(onSelectArea);
  const onSelectRoadHistoryRef = useRef(onSelectRoadHistory);
  const registeredChangeLayerIdsRef = useRef<Set<string>>(new Set());
  const activeChangeLayerIdsRef = useRef<Set<string>>(new Set());
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const latestParcelsRef = useRef<ParcelCollection>(emptyCollection);
  const latestSelectedRef = useRef<GeoJSON.FeatureCollection>(emptyFeatureCollection());
  const latestSelectedBlockRef = useRef<ParcelCollection>(emptyCollection);
  const latestSelectedChangeRef = useRef<GeoJSON.FeatureCollection>(emptyFeatureCollection());
  const latestBoundaryRef = useRef<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: []
  });
  const latestHotspotsRef = useRef<HotspotCollection>(hotspots);
  const latestAreaSummariesRef = useRef<AreaSummaryCollection>(areaSummaries);
  const latestSelectedAreaRef = useRef<GeoJSON.FeatureCollection>(emptyFeatureCollection());
  const latestRoadHistoryRef = useRef<RoadSegmentHistoryCollection>(emptyRoadHistoryCollection());
  const latestHistoricalOverlaysRef = useRef<LoadedHistoricalLayer[]>([]);
  const hoveredRef = useRef<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: []
  });

  const visibleParcels = useMemo(() => parcels ?? emptyCollection, [parcels]);
  const mapSourceParcels = visibleParcels;
  const selectedBlockSourceParcels = selectedBlockParcels ?? emptyCollection;
  const mapSourceHotspots = useMemo(() => slimHotspotCollection(hotspots), [hotspots]);
  const mapSourceAreaSummaries = useMemo(() => slimAreaSummaryCollection(areaSummaries), [areaSummaries]);
  const mapSourceRoadHistory = useMemo(() => roadHistory ?? emptyRoadHistoryCollection(), [roadHistory]);
  const mapSourceSelectedArea = useMemo(
    () => (selectedArea ? featureCollectionFromGenericFeature(slimAreaSummaryFeature(selectedArea)) : emptyFeatureCollection()),
    [selectedArea]
  );
  latestParcelsRef.current = mapSourceParcels;
  latestSelectedRef.current = selectedParcel ? featureCollectionFromFeature(selectedParcel) : emptyFeatureCollection();
  latestSelectedBlockRef.current = selectedBlockSourceParcels;
  latestSelectedChangeRef.current = selectedParcelChange
    ? featureCollectionFromFeature(selectedParcelChange)
    : emptyFeatureCollection();
  latestBoundaryRef.current = boundary ?? { type: "FeatureCollection", features: [] };
  latestHotspotsRef.current = mapSourceHotspots;
  latestAreaSummariesRef.current = mapSourceAreaSummaries;
  latestSelectedAreaRef.current = mapSourceSelectedArea;
  latestRoadHistoryRef.current = mapSourceRoadHistory;
  latestHistoricalOverlaysRef.current = historicalOverlays;
  onSelectParcelRef.current = onSelectParcel;
  onSelectParcelChangeRef.current = onSelectParcelChange;
  onSelectHotspotRef.current = onSelectHotspot;
  onSelectAreaRef.current = onSelectArea;
  onSelectRoadHistoryRef.current = onSelectRoadHistory;

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

      map.addSource("selected-block", {
        type: "geojson",
        data: latestSelectedBlockRef.current
      });

      map.addSource("selected-parcel-change", {
        type: "geojson",
        data: latestSelectedChangeRef.current
      });

      map.addSource("boundary", {
        type: "geojson",
        data: latestBoundaryRef.current
      });

      map.addSource("hotspots", {
        type: "geojson",
        data: latestHotspotsRef.current
      });

      map.addSource("area-summaries", {
        type: "geojson",
        data: latestAreaSummariesRef.current
      });

      map.addSource("road-history", {
        type: "geojson",
        data: latestRoadHistoryRef.current,
        generateId: true
      });

      map.addSource("selected-area", {
        type: "geojson",
        data: latestSelectedAreaRef.current
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
          "fill-opacity": permitPressureFillOpacityExpression(
            true,
            "stability",
            new Set(permitPressureLegendOrder),
            new Set(permitStabilityLegendOrder)
          )
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
        id: "selected-block-fill",
        type: "fill",
        source: "selected-block",
        paint: {
          "fill-color": "#f1fbf9",
          "fill-opacity": 0.38
        }
      });

      map.addLayer({
        id: "selected-block-outline",
        type: "line",
        source: "selected-block",
        paint: {
          "line-color": "#0f766e",
          "line-width": 2.4,
          "line-opacity": 0.95
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

      map.addLayer({
        id: "area-summary-fill",
        type: "fill",
        source: "area-summaries",
        paint: {
          "fill-color": areaDisplayColorExpression(),
          "fill-opacity": 0.2
        }
      });

      map.addLayer({
        id: "area-summary-line",
        type: "line",
        source: "area-summaries",
        paint: {
          "line-color": areaDisplayColorExpression(),
          "line-width": 1.8,
          "line-opacity": 0.82
        }
      });

      map.addLayer({
        id: "selected-area-line",
        type: "line",
        source: "selected-area",
        paint: {
          "line-color": "#111827",
          "line-width": 3.6,
          "line-opacity": 0.9
        }
      });

      if (styleSupportsGlyphs(map)) {
        map.addLayer({
          id: "area-summary-label",
          type: "symbol",
          source: "area-summaries",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 12,
            "text-anchor": "center"
          },
          paint: {
            "text-color": "#172033",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.6
          }
        });
      }

      map.addLayer({
        id: "road-history-line",
        type: "line",
        source: "road-history",
        paint: {
          "line-color": roadHistoryColorExpression(),
          "line-width": 3,
          "line-opacity": showRoadHistory ? 0.58 : 0
        }
      });

      map.addLayer({
        id: "road-history-current-period",
        type: "line",
        source: "road-history",
        filter: ["==", ["get", "first_observed_period"], selectedHistoryPeriod],
        paint: {
          "line-color": roadHistoryColorExpression(),
          "line-width": 5.5,
          "line-opacity": showRoadHistory ? 0.95 : 0
        }
      });

      map.addLayer({
        id: "hotspot-circle",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-color": hotspotColorExpression(),
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "score"], 0],
            0,
            7,
            40,
            13
          ],
          "circle-opacity": 0.88,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2
        }
      });

      if (styleSupportsGlyphs(map)) {
        map.addLayer({
          id: "hotspot-label",
          type: "symbol",
          source: "hotspots",
          layout: {
            "text-field": ["get", "title"],
            "text-size": 11,
            "text-offset": [0, 1.25],
            "text-anchor": "top"
          },
          paint: {
            "text-color": "#172033",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.4
          }
        });
      }

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

    map.on("mousemove", "hotspot-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "hotspot-circle", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", "hotspot-circle", (event) => {
      const feature = event.features?.[0] as unknown as HotspotFeature | undefined;
      if (!feature) return;
      const coordinates = pointCoordinates(feature);
      if (!coordinates) return;
      onSelectHotspotRef.current(feature);
      popupRef.current
        ?.setLngLat(coordinates)
        .setHTML(hotspotPopupHtml(feature.properties))
        .addTo(map);
    });

    map.on("mousemove", "area-summary-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "area-summary-fill", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", "area-summary-fill", (event) => {
      const feature = event.features?.[0] as unknown as AreaSummaryFeature | undefined;
      if (!feature) return;
      onSelectAreaRef.current(feature);
    });

    map.on("mousemove", "road-history-line", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "road-history-line", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", "road-history-line", (event) => {
      const feature = event.features?.[0] as unknown as RoadSegmentHistoryFeature | undefined;
      if (!feature) return;
      onSelectRoadHistoryRef.current(feature);
      popupRef.current
        ?.setLngLat(event.lngLat)
        .setHTML(roadHistoryPopupHtml(feature.properties))
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
    const container = containerRef.current;
    const map = mapRef.current;
    if (!container || !map) return;

    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const mainOverlays = swipeEnabled ? [] : historicalOverlays;
    const result = renderHistoricalOverlays({
      map,
      overlays: mainOverlays,
      previousLayerIds: historicalLayerIdsRef.current,
      registeredChangeLayerIds: registeredChangeLayerIdsRef.current,
      visibleChangeTypes,
      popupRef,
      onSelectParcelChangeRef
    });

    activeChangeLayerIdsRef.current = result.activeChangeLayerIds;
    historicalLayerIdsRef.current = result.layerIds;
    raiseSelectionLayers(map);
  }, [historicalOverlays, isMapLoaded, swipeEnabled, visibleChangeTypes]);

  useEffect(() => {
    const mainMap = mapRef.current;
    const container = swipeContainerRef.current;
    if (!swipeEnabled || !container || !mainMap || swipeMapRef.current) return;

    const swipeMap = new maplibregl.Map({
      container,
      style: baseMapStyle,
      center: mainMap.getCenter(),
      zoom: mainMap.getZoom(),
      bearing: mainMap.getBearing(),
      pitch: mainMap.getPitch(),
      interactive: false,
      attributionControl: false
    });

    const syncSwipeMap = () => {
      if (!swipeMapRef.current || !mapRef.current) return;
      swipeMapRef.current.jumpTo({
        center: mapRef.current.getCenter(),
        zoom: mapRef.current.getZoom(),
        bearing: mapRef.current.getBearing(),
        pitch: mapRef.current.getPitch()
      });
    };

    mainMap.on("move", syncSwipeMap);
    swipeMap.on("load", () => {
      swipeMapRef.current = swipeMap;
      syncSwipeMap();
      updateSwipeHistoricalLayers(swipeMap, latestHistoricalOverlaysRef.current, swipeLayerIdsRef.current);
    });

    return () => {
      mainMap.off("move", syncSwipeMap);
      swipeLayerIdsRef.current = [];
      swipeMap.remove();
      swipeMapRef.current = null;
    };
  }, [swipeEnabled]);

  useEffect(() => {
    if (!swipeEnabled || !swipeMapRef.current) return;
    updateSwipeHistoricalLayers(swipeMapRef.current, historicalOverlays, swipeLayerIdsRef.current);
  }, [historicalOverlays, swipeEnabled]);

  useEffect(() => {
    const source = mapRef.current?.getSource("parcels") as GeoJSONSource | undefined;
    source?.setData(mapSourceParcels);
  }, [mapSourceParcels]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("selected-block") as GeoJSONSource | undefined;
    source?.setData(selectedBlockSourceParcels);

    if (!map || !selectedBlockParcels || selectedBlockParcels.features.length === 0) return;
    const bounds = boundsForFeatureCollection(selectedBlockParcels);
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: { top: 80, right: 430, bottom: 80, left: 80 },
      maxZoom: 16.2,
      duration: 700
    });
  }, [selectedBlockParcels, selectedBlockSourceParcels]);

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
    if (bounds && !selectedBlockParcels?.features.length) {
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
  }, [selectedBlockParcels, selectedParcel]);

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
    const source = mapRef.current?.getSource("hotspots") as GeoJSONSource | undefined;
    source?.setData(mapSourceHotspots);
  }, [mapSourceHotspots]);

  useEffect(() => {
    const source = mapRef.current?.getSource("area-summaries") as GeoJSONSource | undefined;
    source?.setData(mapSourceAreaSummaries);
  }, [mapSourceAreaSummaries]);

  useEffect(() => {
    const source = mapRef.current?.getSource("road-history") as GeoJSONSource | undefined;
    source?.setData(mapSourceRoadHistory);
  }, [mapSourceRoadHistory]);

  useEffect(() => {
    const source = mapRef.current?.getSource("selected-area") as GeoJSONSource | undefined;
    source?.setData(mapSourceSelectedArea);
  }, [mapSourceSelectedArea]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedHotspot) return;
    const coordinates = pointCoordinates(selectedHotspot);
    if (!coordinates) return;
    map.easeTo({
      center: coordinates,
      zoom: Math.max(map.getZoom(), 15),
      duration: 650
    });
    popupRef.current
      ?.setLngLat(coordinates)
      .setHTML(hotspotPopupHtml(selectedHotspot.properties))
      .addTo(map);
  }, [selectedHotspot]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedArea || selectedArea.geometry.type === "Point") return;
    const bounds = boundsForGenericFeature(selectedArea);
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: { top: 70, right: 430, bottom: 70, left: 70 },
      maxZoom: 14.6,
      duration: 650
    });
  }, [selectedArea]);

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
        permitPressureFillOpacityExpression(
          showPermitPressure,
          permitPressureMapMode,
          visiblePermitPressureTypes,
          visiblePermitStabilityTypes
        )
      );
    }
  }, [permitPressureMapMode, showPermitPressure, visiblePermitPressureTypes, visiblePermitStabilityTypes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("road-history-line")) {
      map.setPaintProperty("road-history-line", "line-opacity", showRoadHistory ? 0.58 : 0);
    }
    if (map.getLayer("road-history-current-period")) {
      map.setPaintProperty("road-history-current-period", "line-opacity", showRoadHistory ? 0.95 : 0);
      map.setFilter("road-history-current-period", ["==", ["get", "first_observed_period"], selectedHistoryPeriod]);
    }
  }, [selectedHistoryPeriod, showRoadHistory]);

  return (
    <>
      <div ref={containerRef} className="map-canvas" aria-label="Park Ridge parcel map" />
      {swipeEnabled && (
        <div
          className="swipe-map-shell"
          style={{ width: `${swipePosition}%` }}
          aria-hidden="true"
        >
          <div ref={swipeContainerRef} className="swipe-map-canvas" />
        </div>
      )}
      {swipeEnabled && (
        <div className="swipe-divider" style={{ left: `${swipePosition}%` }} aria-hidden="true">
          <span>Then</span>
          <span>Now</span>
        </div>
      )}
    </>
  );
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
  mapMode: PermitPressureMapMode,
  visiblePermitPressureTypes: Set<PermitPressureType>,
  visiblePermitStabilityTypes: Set<PermitStabilityType>
): ExpressionSpecification | number {
  if (!showPermitPressure) return 0;
  if (mapMode === "activity") {
    return [
      "case",
      [
        "!",
        ["in", ["get", "permit_pressure_type"], ["literal", Array.from(visiblePermitPressureTypes)]]
      ],
      0,
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
    [
      "!",
      ["in", ["get", "permit_stability_type"], ["literal", Array.from(visiblePermitStabilityTypes)]]
    ],
    0,
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

function hotspotColorExpression(): ExpressionSpecification {
  const colors: Record<HotspotType, string> = {
    teardown_cluster: "#b91c1c",
    changing_area: "#c65f2d",
    old_home_pocket: "#5f6f2e",
    stable_area: "#3f7d58"
  };
  const matchValues = Object.entries(colors).flatMap(([type, color]) => [type, color]);
  return ["match", ["get", "hotspot_type"], ...matchValues, "#246a73"] as unknown as ExpressionSpecification;
}

function roadHistoryColorExpression(): ExpressionSpecification {
  const matchValues = historyPeriods.flatMap((period) => [period.id, roadHistoryColor(period.id)]);
  return ["match", ["get", "first_observed_period"], ...matchValues, "#64748b"] as unknown as ExpressionSpecification;
}

function areaSignalColorExpression(): ExpressionSpecification {
  const colors: Record<AreaSignal, string> = {
    quiet: "#3f7d58",
    watch: "#c7912f",
    active: "#c65f2d",
    teardown_pressure: "#b91c1c",
    older_homes: "#5f6f2e"
  };
  const matchValues = Object.entries(colors).flatMap(([type, color]) => [type, color]);
  return ["match", ["get", "signal"], ...matchValues, "#246a73"] as unknown as ExpressionSpecification;
}

function areaDisplayColorExpression(): ExpressionSpecification {
  return ["coalesce", ["get", "displayColor"], areaSignalColorExpression()] as unknown as ExpressionSpecification;
}

function styleSupportsGlyphs(map: maplibregl.Map): boolean {
  return Boolean((map.getStyle() as { glyphs?: string }).glyphs);
}

function slimHotspotCollection(collection: HotspotCollection): HotspotCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => ({
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        parcelPins: []
      }
    }))
  };
}

function slimAreaSummaryCollection(collection: AreaSummaryCollection): AreaSummaryCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.map(slimAreaSummaryFeature)
  };
}

function slimAreaSummaryFeature(feature: AreaSummaryFeature): AreaSummaryFeature {
  return {
    type: "Feature",
    geometry: feature.geometry,
    properties: {
      ...feature.properties,
      parcelPins: []
    }
  };
}

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function emptyRoadHistoryCollection(): RoadSegmentHistoryCollection {
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

function featureCollectionFromGenericFeature(feature: GeoJSON.Feature): GeoJSON.FeatureCollection {
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

function boundsForGenericFeature(feature: GeoJSON.Feature): maplibregl.LngLatBounds | null {
  if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") return null;
  const coordinates = flattenCoordinates(feature.geometry.coordinates);
  if (coordinates.length === 0) return null;
  const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
  coordinates.forEach((coordinate) => bounds.extend(coordinate));
  return bounds;
}

function boundsForFeatureCollection(collection: ParcelCollection): maplibregl.LngLatBounds | null {
  const coordinates = collection.features.flatMap((feature) => flattenCoordinates(feature.geometry.coordinates));
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

function pointCoordinates(feature: HotspotFeature): [number, number] | null {
  const [lng, lat] = feature.geometry.coordinates;
  return typeof lng === "number" && typeof lat === "number" ? [lng, lat] : null;
}
