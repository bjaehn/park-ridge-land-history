"use client";

import { useEffect, useRef, useState } from "react";
import { buildMapStyle, GEOJSON_FALLBACK_URL, MAP_CENTER, MAP_ZOOM_CITY } from "@/lib/mapConfig";

// Shared MapLibre map used by both the full plat-mapping map view
// (_PlatSectionMap) and the compact preview inside the suggestion queue.
// Renders a muted parcels base layer plus two optional colored overlays:
// "highlight" (the GIS page code cluster being considered) and "compare"
// (an already-confirmed subdivision's footprint, for visual comparison).

const HIGHLIGHT_COLOR = "#f59e0b";
const COMPARE_COLOR = "#14b8a6";

type HoverInfo = { pin: string; address: string; which: "highlight" | "compare" } | null;

export function ClusterMapCore({
  highlightPins,
  comparePins,
  highlightLabel,
  compareLabel,
  height = "420px",
}: {
  highlightPins: string[];
  comparePins?: string[];
  highlightLabel?: string;
  compareLabel?: string;
  height?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const isMapLoadedRef = useRef(false);
  const geojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const highlightPinsRef = useRef(highlightPins);
  const comparePinsRef = useRef(comparePins ?? []);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>(null);

  highlightPinsRef.current = highlightPins;
  comparePinsRef.current = comparePins ?? [];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cleanupFn: (() => void) | undefined;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (!containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: buildMapStyle("dark"),
        center: MAP_CENTER,
        zoom: MAP_ZOOM_CITY,
        attributionControl: false,
      });
      mapRef.current = map;

      map.on("load", async () => {
        map.addSource("parcels", { type: "geojson", data: GEOJSON_FALLBACK_URL });

        map.addLayer({
          id: "parcels-muted",
          type: "fill",
          source: "parcels",
          paint: { "fill-color": "#2a2a38", "fill-opacity": 0.4 },
        });
        map.addLayer({
          id: "parcels-muted-stroke",
          type: "line",
          source: "parcels",
          paint: { "line-color": "#3a3a50", "line-width": 0.4 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emptyFilter = ["in", ["get", "pin_normalized"], ["literal", []]] as any;
        map.addLayer({
          id: "compare-fill",
          type: "fill",
          source: "parcels",
          filter: emptyFilter,
          paint: { "fill-color": COMPARE_COLOR, "fill-opacity": 0.55 },
        });
        map.addLayer({
          id: "compare-stroke",
          type: "line",
          source: "parcels",
          filter: emptyFilter,
          paint: { "line-color": COMPARE_COLOR, "line-width": 1.2 },
        });
        map.addLayer({
          id: "highlight-fill",
          type: "fill",
          source: "parcels",
          filter: emptyFilter,
          paint: { "fill-color": HIGHLIGHT_COLOR, "fill-opacity": 0.8 },
        });
        map.addLayer({
          id: "highlight-stroke",
          type: "line",
          source: "parcels",
          filter: emptyFilter,
          paint: { "line-color": HIGHLIGHT_COLOR, "line-width": 1.5 },
        });
        map.addLayer({
          id: "labels-overlay",
          type: "raster",
          source: "osm-labels",
          paint: { "raster-opacity": 0.85 },
        });
        map.addControl(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new (maplibregl as any).NavigationControl({ visualizePitch: false }),
          "bottom-right"
        );

        try {
          const res = await fetch(GEOJSON_FALLBACK_URL);
          geojsonRef.current = await res.json();
        } catch {
          geojsonRef.current = null;
        }

        isMapLoadedRef.current = true;
        applyFilters(highlightPinsRef.current, comparePinsRef.current);
      });

      map.on("mousemove", (e: { point: { x: number; y: number } }) => {
        const layerIds = ["highlight-fill", "compare-fill"].filter((id) => map.getLayer(id));
        if (!layerIds.length) return setHoverInfo(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const features = map.queryRenderedFeatures((e as any).point, { layers: layerIds });
        if (!features.length) return setHoverInfo(null);
        const feat = features[0];
        const which = feat.layer.id === "highlight-fill" ? "highlight" : "compare";
        const props = feat.properties as Record<string, unknown>;
        setHoverInfo({
          pin: String(props.pin_normalized ?? ""),
          address: String(props.address ?? ""),
          which,
        });
      });
      containerRef.current?.addEventListener("mouseleave", () => setHoverInfo(null));

      cleanupFn = () => {
        map.remove();
        mapRef.current = null;
        isMapLoadedRef.current = false;
      };
    })();

    return () => cleanupFn?.();
  }, []);

  function applyFilters(hPins: string[], cPins: string[]) {
    const map = mapRef.current;
    if (!map || !isMapLoadedRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hFilter = ["in", ["get", "pin_normalized"], ["literal", hPins]] as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cFilter = ["in", ["get", "pin_normalized"], ["literal", cPins]] as any;

    if (map.getLayer("highlight-fill")) map.setFilter("highlight-fill", hFilter);
    if (map.getLayer("highlight-stroke")) map.setFilter("highlight-stroke", hFilter);
    if (map.getLayer("compare-fill")) map.setFilter("compare-fill", cFilter);
    if (map.getLayer("compare-stroke")) map.setFilter("compare-stroke", cFilter);

    const geojson = geojsonRef.current;
    if (!geojson) return;
    const pinSet = new Set([...hPins, ...cPins]);
    if (!pinSet.size) return;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    let found = false;
    for (const feature of geojson.features) {
      const pin = (feature.properties as Record<string, unknown> | null)?.pin_normalized;
      if (typeof pin !== "string" || !pinSet.has(pin)) continue;
      for (const [lng, lat] of flattenCoords(feature.geometry)) {
        found = true;
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
    }
    if (found) {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 60, maxZoom: 18, duration: 600 }
      );
    }
  }

  useEffect(() => {
    applyFilters(highlightPins, comparePins ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightPins, comparePins]);

  return (
    <div className="relative" style={{ height }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {(highlightLabel || compareLabel) && (
        <div className="absolute top-2 left-2 bg-surface-raised/95 backdrop-blur-sm border border-surface-border rounded-lg px-3 py-2 text-[11px] space-y-1 pointer-events-none shadow-lg">
          {highlightLabel && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: HIGHLIGHT_COLOR }}
              />
              <span className="text-text-secondary">
                {highlightLabel} ({highlightPins.length})
              </span>
            </div>
          )}
          {compareLabel && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: COMPARE_COLOR }}
              />
              <span className="text-text-secondary">
                {compareLabel} ({(comparePins ?? []).length})
              </span>
            </div>
          )}
        </div>
      )}

      {hoverInfo && (
        <div className="absolute bottom-2 left-2 bg-surface-raised/95 backdrop-blur-sm border border-surface-border rounded-lg px-3 py-2 text-xs pointer-events-none shadow-lg max-w-xs">
          <p className="text-text-secondary truncate">{hoverInfo.address}</p>
          <p className="text-text-muted font-mono">{hoverInfo.pin}</p>
        </div>
      )}

      {highlightPins.length === 0 && !comparePins?.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-surface-raised/90 backdrop-blur-sm border border-surface-border rounded-xl px-5 py-3 text-center">
            <p className="text-xs text-text-muted">Select a GIS page code to see it on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}

function flattenCoords(geometry: GeoJSON.Geometry): [number, number][] {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates as [number, number]];
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates as [number, number][];
    case "MultiLineString":
    case "Polygon":
      return (geometry.coordinates as [number, number][][]).flat();
    case "MultiPolygon":
      return (geometry.coordinates as [number, number][][][]).flat(2);
    default:
      return [];
  }
}
