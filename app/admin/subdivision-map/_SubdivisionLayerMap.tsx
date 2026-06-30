"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  buildMapStyle,
  GEOJSON_FALLBACK_URL,
  MAP_CENTER,
  MAP_ZOOM_CITY,
} from "@/lib/mapConfig";
import { fetchPinsForSubdivision } from "../_actions/subdivisionMap";
import type { SubdivisionListItem } from "./page";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAYER_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#f59e0b",
  "#a855f7", "#ec4899", "#06b6d4", "#f97316",
  "#84cc16", "#6366f1", "#14b8a6", "#e11d48",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveLayer = {
  name: string;
  color: string;
  pins: string[];
};

type HoverInfo = {
  pin: string;
  address: string;
  subdivision: string;
} | null;

type Props = {
  subdivisions: SubdivisionListItem[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubdivisionLayerMap({ subdivisions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const isMapLoadedRef = useRef(false);
  const availableColorIndicesRef = useRef<number[]>(LAYER_COLORS.map((_, i) => i));

  const [activeLayers, setActiveLayers] = useState<Map<string, ActiveLayer>>(new Map());
  const activeLayersRef = useRef<Map<string, ActiveLayer>>(new Map());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>(null);

  // Keep ref in sync so the map's mousemove handler can read current activeLayers
  // without a stale closure.
  useEffect(() => {
    activeLayersRef.current = activeLayers;
  }, [activeLayers]);

  const filteredSubdivisions = subdivisions.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Map initialization
  // ---------------------------------------------------------------------------

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

      map.on("load", () => {
        // Parcel source (GeoJSON for simplicity — same file MapView uses as fallback)
        map.addSource("parcels", {
          type: "geojson",
          data: GEOJSON_FALLBACK_URL,
        });

        // Muted base layer so unassigned parcels are faintly visible
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

        // Labels on top — subdivision fill layers are inserted before this
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

        isMapLoadedRef.current = true;
      });

      // Single mousemove handler that queries whichever subdivision layers are active
      map.on("mousemove", (e: { point: { x: number; y: number } }) => {
        const layers = activeLayersRef.current;
        const layerIds = [...layers.keys()]
          .map((id) => `sub-fill-${id}`)
          .filter((lid) => map.getLayer(lid));

        if (!layerIds.length) {
          setHoverInfo(null);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const features = map.queryRenderedFeatures((e as any).point, { layers: layerIds });
        if (!features.length) {
          setHoverInfo(null);
          return;
        }

        const feat = features[0];
        const subdivId = (feat.layer.id as string).replace(/^sub-fill-/, "");
        const layer = layers.get(subdivId);
        const props = feat.properties as Record<string, unknown>;

        setHoverInfo({
          pin: String(props.pin_normalized ?? props.pin_original ?? ""),
          address: String(props.address ?? ""),
          subdivision: layer?.name ?? "",
        });
      });

      // Clear hover when mouse leaves the map container
      containerRef.current?.addEventListener("mouseleave", () => setHoverInfo(null));

      cleanupFn = () => {
        map.remove();
        mapRef.current = null;
        isMapLoadedRef.current = false;
      };
    })();

    return () => cleanupFn?.();
  }, []);

  // ---------------------------------------------------------------------------
  // Layer toggle
  // ---------------------------------------------------------------------------

  const handleToggle = useCallback(
    async (subdivision: SubdivisionListItem) => {
      const map = mapRef.current;
      if (!map || !isMapLoadedRef.current) return;

      const fillId = `sub-fill-${subdivision.id}`;
      const strokeId = `sub-stroke-${subdivision.id}`;

      if (activeLayers.has(subdivision.id)) {
        // Remove layers
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getLayer(strokeId)) map.removeLayer(strokeId);

        // Free the color index slot
        const layer = activeLayers.get(subdivision.id)!;
        const colorIdx = LAYER_COLORS.indexOf(layer.color);
        if (colorIdx !== -1) availableColorIndicesRef.current.unshift(colorIdx);

        setActiveLayers((prev) => {
          const next = new Map(prev);
          next.delete(subdivision.id);
          return next;
        });
      } else {
        // Fetch pins then add layers
        setLoadingId(subdivision.id);
        try {
          const pins = await fetchPinsForSubdivision(subdivision.id);
          if (!pins.length) return;

          const colorIdx =
            availableColorIndicesRef.current.length > 0
              ? availableColorIndicesRef.current.shift()!
              : (activeLayers.size % LAYER_COLORS.length);
          const color = LAYER_COLORS[colorIdx % LAYER_COLORS.length];

          // Insert before the labels layer so street names stay readable
          map.addLayer(
            {
              id: fillId,
              type: "fill",
              source: "parcels",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              filter: ["match", ["get", "pin_normalized"], pins, true, false] as any,
              paint: { "fill-color": color, "fill-opacity": 0.78 },
            },
            "labels-overlay"
          );
          map.addLayer(
            {
              id: strokeId,
              type: "line",
              source: "parcels",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              filter: ["match", ["get", "pin_normalized"], pins, true, false] as any,
              paint: { "line-color": color, "line-width": 1.5 },
            },
            "labels-overlay"
          );

          setActiveLayers((prev) =>
            new Map(prev).set(subdivision.id, { name: subdivision.name, color, pins })
          );
        } finally {
          setLoadingId(null);
        }
      }
    },
    [activeLayers]
  );

  // ---------------------------------------------------------------------------
  // Clear all
  // ---------------------------------------------------------------------------

  const handleClearAll = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const id of activeLayers.keys()) {
      const fillId = `sub-fill-${id}`;
      const strokeId = `sub-stroke-${id}`;
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(strokeId)) map.removeLayer(strokeId);
    }

    availableColorIndicesRef.current = LAYER_COLORS.map((_, i) => i);
    setActiveLayers(new Map());
  }, [activeLayers]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="-mx-8 -mb-8 border-t border-surface-border">
      <div className="flex" style={{ height: "calc(100vh - 11rem)" }}>
        {/* Left panel — subdivision selector */}
        <div className="w-72 shrink-0 border-r border-surface-border flex flex-col bg-surface-raised">
          {/* Search */}
          <div className="p-3 border-b border-surface-border">
            <input
              type="search"
              placeholder="Filter subdivisions…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60"
            />
          </div>

          {/* Active layer legend */}
          {activeLayers.size > 0 && (
            <div className="px-3 pt-3 pb-2 border-b border-surface-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Active ({activeLayers.size})
                </p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-text-muted hover:text-accent-red transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-1">
                {[...activeLayers.entries()].map(([id, layer]) => (
                  <div key={id} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ background: layer.color }}
                    />
                    <span className="text-xs text-text-secondary truncate">{layer.name}</span>
                    <span className="text-xs text-text-muted ml-auto shrink-0">
                      {layer.pins.length}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subdivision list */}
          <div className="flex-1 overflow-y-auto">
            {filteredSubdivisions.length === 0 ? (
              <p className="text-sm text-text-muted p-4">No matches.</p>
            ) : (
              filteredSubdivisions.map((s) => {
                const isActive = activeLayers.has(s.id);
                const isLoading = loadingId === s.id;
                const layer = activeLayers.get(s.id);

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleToggle(s)}
                    disabled={isLoading}
                    className={`w-full text-left px-3 py-2.5 border-b border-surface-border flex items-center gap-2.5 transition-colors ${
                      isActive
                        ? "bg-surface-card"
                        : "hover:bg-surface-card/50"
                    } disabled:opacity-60`}
                  >
                    {/* Color swatch or toggle indicator */}
                    <span
                      className="w-3 h-3 rounded-sm shrink-0 border"
                      style={
                        isActive && layer
                          ? { background: layer.color, borderColor: layer.color }
                          : { background: "transparent", borderColor: "#4a4a5a" }
                      }
                    />
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block text-sm truncate ${
                          isActive ? "text-text-primary font-medium" : "text-text-secondary"
                        }`}
                      >
                        {s.name}
                      </span>
                      {(s.recorded_year || s.parcel_count) && (
                        <span className="block text-xs text-text-muted mt-0.5">
                          {[
                            s.recorded_year ? `platted ${s.recorded_year}` : null,
                            s.parcel_count ? `${s.parcel_count} parcels` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                    {isLoading && (
                      <span className="text-xs text-text-muted shrink-0 animate-pulse">…</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          <div className="p-3 border-t border-surface-border">
            <p className="text-xs text-text-muted">
              {subdivisions.length} subdivisions · {activeLayers.size} active
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

          {/* Hover tooltip */}
          {hoverInfo && (
            <div className="absolute top-3 left-3 bg-surface-raised/95 backdrop-blur-sm border border-surface-border rounded-lg px-3 py-2 text-xs pointer-events-none shadow-lg max-w-xs">
              <p className="font-semibold text-text-primary truncate">{hoverInfo.subdivision}</p>
              {hoverInfo.address && (
                <p className="text-text-secondary mt-0.5 truncate">{hoverInfo.address}</p>
              )}
              <p className="text-text-muted mt-0.5 font-mono">{hoverInfo.pin}</p>
            </div>
          )}

          {/* No layers hint */}
          {activeLayers.size === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-surface-raised/90 backdrop-blur-sm border border-surface-border rounded-xl px-6 py-4 text-center">
                <p className="text-sm font-medium text-text-secondary">Select a subdivision from the left panel</p>
                <p className="text-xs text-text-muted mt-1">Each will appear in a distinct color</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
