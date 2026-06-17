"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as MaplibreMap, MapLayerMouseEvent, FilterSpecification, LayerSpecification } from "maplibre-gl";
import {
  buildMapStyle,
  eraFillExpression,
  PARCEL_FILL_OPACITY,
  PARCEL_FILL_OPACITY_HOVER,
  PARCEL_STROKE_COLOR,
  PARCEL_STROKE_WIDTH,
  PARCEL_STROKE_COLOR_SELECTED,
  PARCEL_STROKE_WIDTH_SELECTED,
  PARCEL_FILL_COLOR_MUTED,
  PARCEL_FILL_OPACITY_MUTED,
  PMTILES_URL,
  GEOJSON_FALLBACK_URL,
  MAP_CENTER,
  MAP_ZOOM_DEFAULT,
  MAP_ZOOM_PROPERTY,
  MAP_ZOOM_STREET,
  MAP_ZOOM_NEIGHBORHOOD,
  MAP_ZOOM_SUBDIVISION,
  MAP_ZOOM_CITY,
  MAP_LENSES,
  DEFAULT_LENS,
  ERA_ORDER,
  ERA_PALETTE,
  type MapLens,
  type MapScope,
} from "@/lib/mapConfig";
import { formatDecade } from "@/lib/formatters";
import { useRouter } from "next/navigation";

type TooltipState = {
  x: number;
  y: number;
  pin: string;
  address: string;
  decade: string;
} | null;

type Props = {
  scope: MapScope;
  height?: string;
  showExpand?: boolean;
  compactLegend?: boolean;
  hideLensSelector?: boolean;
};

const SOURCE_ID = "parcels";
const FILL_LAYER = "parcel-fill";
const STROKE_LAYER = "parcel-stroke";
const SELECTED_FILL_LAYER = "parcel-fill-selected";
const SELECTED_STROKE_LAYER = "parcel-stroke-selected";

/**
 * Single MapLibre GL map component for Park Ridge Land History.
 *
 * The `scope` prop controls initial extent and which parcels are emphasized.
 * Everything else -- style, palette, lenses, interactions, tooltip, legend,
 * loading skeleton -- is identical across all scopes.
 *
 * This is the ONLY place MapLibre is instantiated in this codebase.
 * grep for "new maplibregl.Map" should return exactly one result here.
 */
export function MapView({ scope, height = "400px", showExpand = false, compactLegend = false, hideLensSelector = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [lens, setLens] = useState<MapLens>(DEFAULT_LENS);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const router = useRouter();

  const selectedPin = scope.kind === "property" ? scope.pin : null;

  const initMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;

    const maplibregl = (await import("maplibre-gl")).default;

    let usePmtiles = false;
    if (PMTILES_URL) {
      try {
        const { Protocol } = await import("pmtiles");
        const protocol = new Protocol();
        maplibregl.addProtocol("pmtiles", protocol.tile.bind(protocol));
        usePmtiles = true;
      } catch {
        // pmtiles package unavailable; fall back to GeoJSON
      }
    }

    const style = buildMapStyle();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: MAP_CENTER,
      zoom: MAP_ZOOM_DEFAULT,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on("load", () => {
      if (usePmtiles) {
        map.addSource(SOURCE_ID, {
          type: "vector",
          url: `pmtiles://${PMTILES_URL}`,
        });
      } else {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: GEOJSON_FALLBACK_URL,
        });
      }

      const sourceLayer = usePmtiles ? "parcels" : undefined;
      const sl = sourceLayer ? { "source-layer": sourceLayer } : {};
      const pinFilter = (pin: string): FilterSpecification =>
        ["==", ["get", "pin_normalized"], pin] as unknown as FilterSpecification;
      const noopFilter: FilterSpecification = ["==", "1", "0"] as unknown as FilterSpecification;

      map.addLayer({
        id: "parcel-fill-muted",
        type: "fill",
        source: SOURCE_ID,
        ...sl,
        paint: {
          "fill-color": PARCEL_FILL_COLOR_MUTED,
          "fill-opacity": scope.kind === "city" ? 0 : PARCEL_FILL_OPACITY_MUTED,
        },
      } as LayerSpecification);

      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        ...sl,
        filter: buildScopeFilter(scope) as FilterSpecification,
        paint: {
          "fill-color": eraFillExpression() as unknown as string,
          "fill-opacity": PARCEL_FILL_OPACITY,
        },
      } as LayerSpecification);

      map.addLayer({
        id: STROKE_LAYER,
        type: "line",
        source: SOURCE_ID,
        ...sl,
        filter: buildScopeFilter(scope) as FilterSpecification,
        paint: {
          "line-color": PARCEL_STROKE_COLOR,
          "line-width": PARCEL_STROKE_WIDTH,
        },
      } as LayerSpecification);

      map.addLayer({
        id: SELECTED_FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        ...sl,
        filter: selectedPin ? pinFilter(selectedPin) : noopFilter,
        paint: {
          "fill-color": eraFillExpression() as unknown as string,
          "fill-opacity": PARCEL_FILL_OPACITY_HOVER,
        },
      } as LayerSpecification);

      map.addLayer({
        id: SELECTED_STROKE_LAYER,
        type: "line",
        source: SOURCE_ID,
        ...sl,
        filter: selectedPin ? pinFilter(selectedPin) : noopFilter,
        paint: {
          "line-color": PARCEL_STROKE_COLOR_SELECTED,
          "line-width": PARCEL_STROKE_WIDTH_SELECTED,
        },
      } as LayerSpecification);

      map.on("mousemove", FILL_LAYER, (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) { setTooltip(null); return; }
        const props = feature.properties as Record<string, unknown>;
        setTooltip({
          x: e.point.x,
          y: e.point.y,
          pin: String(props.pin_normalized ?? props.pin_original ?? ""),
          address: String(props.address ?? "Address not on record"),
          decade: formatDecade(String(props.decade_built ?? "")),
        });
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", FILL_LAYER, () => {
        setTooltip(null);
        map.getCanvas().style.cursor = "";
      });

      map.on("click", FILL_LAYER, (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as Record<string, unknown>;
        const pin = String(props.pin_normalized ?? props.pin_original ?? "");
        if (pin) router.push(`/properties/${encodeURIComponent(pin)}`);
      });

      flyToScope(map, scope);
      setIsLoaded(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cleanup = initMap();
    return () => { cleanup?.then((fn) => fn?.()); };
  }, [initMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const color = lens === "era" ? eraFillExpression() : eraFillExpression();
    map.setPaintProperty(FILL_LAYER, "fill-color", color);
    map.setPaintProperty(SELECTED_FILL_LAYER, "fill-color", color);
  }, [lens, isLoaded]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-surface-border ${isFullscreen ? "fixed inset-0 z-[100] rounded-none" : ""}`}
      style={{ height: isFullscreen ? "100dvh" : height }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-surface-card flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
            <p className="text-xs text-text-muted">Loading map</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />

      {isLoaded && !hideLensSelector && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-surface-card/95 border border-surface-border rounded-lg p-1 shadow-lg">
            {MAP_LENSES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLens(l.id)}
                title={l.description}
                className={`block w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                  lens === l.id
                    ? "bg-accent-purple/20 text-accent-purple font-medium"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoaded && lens === "era" && <MapLegend compact={compactLegend} />}

      {tooltip && (
        <MapTooltip
          x={tooltip.x}
          y={tooltip.y}
          address={tooltip.address}
          decade={tooltip.decade}
          pin={tooltip.pin}
        />
      )}

      {showExpand && (
        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          aria-label={isFullscreen ? "Exit fullscreen" : "Expand map"}
          className="absolute top-3 right-3 z-10 bg-surface-card/95 border border-surface-border rounded p-1.5 text-text-secondary hover:text-text-primary transition-colors shadow"
        >
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
              <line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

function MapLegend({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="absolute bottom-3 right-3 z-10 bg-surface-card/95 border border-surface-border rounded-lg p-2 shadow-lg">
        <p className="text-[10px] font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Built era</p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {ERA_ORDER.map((decade) => (
            <li key={decade} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ERA_PALETTE[decade] }} aria-hidden="true" />
              <span className="text-[10px] text-text-muted">{formatDecade(decade)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="absolute bottom-6 right-3 z-10 bg-surface-card/95 border border-surface-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
        When it was built
      </p>
      <ul className="space-y-1">
        {ERA_ORDER.map((decade) => (
          <li key={decade} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: ERA_PALETTE[decade] }} aria-hidden="true" />
            <span className="text-xs text-text-secondary">{formatDecade(decade)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MapTooltip({ x, y, address, decade, pin }: { x: number; y: number; address: string; decade: string; pin: string }) {
  return (
    <div
      className="absolute z-20 pointer-events-none bg-surface-card border border-surface-border rounded-lg shadow-xl px-3 py-2 text-xs max-w-[200px]"
      style={{ left: x + 12, top: y - 8 }}
    >
      <p className="text-text-primary font-medium leading-snug">{address}</p>
      {decade !== "Unknown" && <p className="text-text-secondary mt-0.5">Built {decade}</p>}
      <p className="text-text-muted mt-0.5 truncate">PIN {pin}</p>
    </div>
  );
}

function buildScopeFilter(scope: MapScope): unknown[] {
  switch (scope.kind) {
    case "property":    return ["all"];
    case "street":      return ["==", ["get", "street_name_normalized"], scope.streetName];
    case "neighborhood": return ["==", ["get", "neighborhood_id"], scope.neighborhoodId];
    case "subdivision":
      if (scope.pins && scope.pins.length > 0) {
        return ["in", ["get", "pin_normalized"], ["literal", scope.pins]];
      }
      return ["==", ["get", "subdivision_id"], scope.subdivisionId];
    case "city":        return ["all"];
  }
}

function flyToScope(map: MaplibreMap, scope: MapScope) {
  switch (scope.kind) {
    case "property":
      map.flyTo({ center: [scope.lng, scope.lat], zoom: MAP_ZOOM_PROPERTY, animate: false });
      break;
    case "street":
      if (scope.bbox) {
        map.fitBounds([[scope.bbox[0], scope.bbox[1]], [scope.bbox[2], scope.bbox[3]]], { padding: 48, animate: false });
      } else {
        map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM_STREET, animate: false });
      }
      break;
    case "neighborhood":
      if (scope.bbox) {
        map.fitBounds([[scope.bbox[0], scope.bbox[1]], [scope.bbox[2], scope.bbox[3]]], { padding: 48, animate: false });
      } else {
        map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM_NEIGHBORHOOD, animate: false });
      }
      break;
    case "subdivision":
      if (scope.bbox) {
        map.fitBounds(
          [[scope.bbox[0], scope.bbox[1]], [scope.bbox[2], scope.bbox[3]]],
          { padding: 48, animate: false }
        );
      } else {
        map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM_SUBDIVISION, animate: false });
      }
      break;
    case "city":
      map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM_CITY, animate: false });
      break;
  }
}
