"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  Map as MaplibreMap,
  MapLayerMouseEvent,
  FilterSpecification,
  LayerSpecification,
} from "maplibre-gl";
import {
  buildMapStyle,
  BASEMAP_CONFIGS,
  eraFillExpression,
  getLensFillExpression,
  buildNeighborhoodFillExpression,
  neighborhoodPropertyGetter,
  DEFAULT_NEIGHBORHOOD_TYPE,
  NEIGHBORHOOD_FALLBACK_COLOR,
  MAP_LENSES,
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
  BUILDINGS_GEOJSON_URL,
  GIS_BUILDINGS_STROKE_COLOR,
  GIS_BUILDINGS_STROKE_WIDTH,
  GIS_BUILDINGS_STROKE_OPACITY,
  MAP_CENTER,
  MAP_ZOOM_DEFAULT,
  MAP_ZOOM_PROPERTY,
  MAP_ZOOM_STREET,
  MAP_ZOOM_NEIGHBORHOOD,
  MAP_ZOOM_SUBDIVISION,
  MAP_ZOOM_CITY,
  ERA_ORDER,
  ERA_PALETTE,
  ERA_FILTER_MIN,
  ERA_FILTER_MAX,
  DEFAULT_LENS,
  type MapLens,
  type MapScope,
  type BasemapMode,
  type NeighborhoodLegendItem,
  type NeighborhoodLegendEntry,
} from "@/lib/mapConfig";
import { formatDecade } from "@/lib/formatters";
import { fetchNeighborhoodSummaries } from "@/lib/data/neighborhoods";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HoverFeature = {
  pin: string;
  address: string;
  decade: string;
  yearBuilt: number | null;
  permitCount: number | null;
  neighborhoodId: string | null;
} | null;

export type MapStats = {
  total: number;
  byDecade: Partial<Record<string, number>>;
  minYear: number | null;
  maxYear: number | null;
};

type LayerToggles = {
  boundary: boolean;
  permitHeatmap: boolean;
  gisBuildings: boolean;
};

type Props = {
  scope: MapScope;
  height?: string;
  showExpand?: boolean;
  /** @deprecated derived from scope internally; passing has no effect */
  compactLegend?: boolean;
  hideLensSelector?: boolean;
  defaultLens?: MapLens;
  /** Ordered district list for a "neighborhood-type-overview" scope — the
   *  calling page already has these from its own summaries fetch, so this
   *  avoids a redundant client fetch and guarantees the map/legend/card-list
   *  colors agree (same list, same order). Ignored for other scope kinds. */
  districts?: NeighborhoodLegendItem[];
};

// ---------------------------------------------------------------------------
// Layer IDs
// ---------------------------------------------------------------------------

const SOURCE_ID = "parcels";
const FILL_MUTED_LAYER = "parcel-fill-muted";
const FILL_LAYER = "parcel-fill";
const STROKE_LAYER = "parcel-stroke";
const SELECTED_FILL_LAYER = "parcel-fill-selected";
const SELECTED_STROKE_LAYER = "parcel-stroke-selected";
const PERMIT_HEATMAP_LAYER = "permit-heatmap";
const LABELS_LAYER = "labels-overlay";
const GIS_BUILDINGS_SOURCE = "gis-buildings";
const GIS_BUILDINGS_LAYER = "gis-buildings-stroke";
const NEIGHBORHOOD_BOUNDARY_SOURCE = "neighborhood-boundary";
const NEIGHBORHOOD_BOUNDARY_FILL_LAYER = "neighborhood-boundary-fill";
const NEIGHBORHOOD_BOUNDARY_STROKE_LAYER = "neighborhood-boundary-stroke";
const NEIGHBORHOOD_TYPE_OVERVIEW_SOURCE = "neighborhood-type-overview";
const NEIGHBORHOOD_TYPE_OVERVIEW_FILL_LAYER = "neighborhood-type-overview-fill";
const NEIGHBORHOOD_TYPE_OVERVIEW_STROKE_LAYER = "neighborhood-type-overview-stroke";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Single MapLibre GL map component for Park Ridge Land History.
 * The `scope` prop controls initial extent and which parcels are emphasized.
 * This is the ONLY place MapLibre is instantiated in this codebase.
 * grep for "new maplibregl.Map" should return exactly one result here.
 */
export function MapView({
  scope,
  height = "400px",
  showExpand = false,
  hideLensSelector = false,
  defaultLens,
  districts,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const statsCallbackRef = useRef<(() => void) | null>(null);

  const [lens, setLens] = useState<MapLens>(defaultLens ?? DEFAULT_LENS);
  const [hoverFeature, setHoverFeature] = useState<HoverFeature>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [basemap, setBasemap] = useState<BasemapMode>("dark");
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [layerToggles, setLayerToggles] = useState<LayerToggles>({
    boundary: true,
    permitHeatmap: false,
    gisBuildings: defaultGisBuildings(scope),
  });
  const gisBuildingsAddedRef = useRef(false);
  const neighborhoodBoundaryAddedRef = useRef(false);
  const neighborhoodTypeOverviewAddedRef = useRef(false);
  const officialPlanningDistrictsRef = useRef<NeighborhoodLegendItem[] | null>(null);
  const [eraFilter, setEraFilter] = useState<[number, number] | null>(null);
  const [stats, setStats] = useState<MapStats | null>(null);
  const [noDataLens, setNoDataLens] = useState(false);
  const [neighborhoodLegend, setNeighborhoodLegend] = useState<NeighborhoodLegendEntry[] | null>(null);
  const [animMode, setAnimMode] = useState(false);
  const [animYear, setAnimYear] = useState<number>(ERA_FILTER_MIN);
  const [animPlaying, setAnimPlaying] = useState(false);
  const [animSpeed, setAnimSpeed] = useState<"slow" | "normal" | "fast">("normal");

  const router = useRouter();
  const isPropertyScope = scope.kind === "property";
  const selectedPin = isPropertyScope ? scope.pin : null;

  // ---------------------------------------------------------------------------
  // Map initialization
  // ---------------------------------------------------------------------------

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
        // fall back to GeoJSON
      }
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle("dark"),
      center: MAP_CENTER,
      zoom: MAP_ZOOM_DEFAULT,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on("load", () => {
      // Navigation control (zoom + compass) at bottom-right
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addControl(new (maplibregl as any).NavigationControl({ visualizePitch: false }), "bottom-right");

      // Parcel source
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
      const scopeFilter = buildScopeFilter(scope) as FilterSpecification;

      // Muted parcels (out of scope - city scope shows all, so muted is hidden)
      map.addLayer({
        id: FILL_MUTED_LAYER,
        type: "fill",
        source: SOURCE_ID,
        ...sl,
        paint: {
          "fill-color": PARCEL_FILL_COLOR_MUTED,
          "fill-opacity": scope.kind === "city" ? 0 : PARCEL_FILL_OPACITY_MUTED,
        },
      } as LayerSpecification);

      // In-scope parcel fill
      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        ...sl,
        filter: scopeFilter,
        paint: {
          "fill-color": eraFillExpression() as unknown as string,
          "fill-opacity": PARCEL_FILL_OPACITY,
        },
      } as LayerSpecification);

      // In-scope parcel stroke
      map.addLayer({
        id: STROKE_LAYER,
        type: "line",
        source: SOURCE_ID,
        ...sl,
        filter: scopeFilter,
        paint: {
          "line-color": PARCEL_STROKE_COLOR,
          "line-width": PARCEL_STROKE_WIDTH,
        },
      } as LayerSpecification);

      // Selected parcel fill (property scope)
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

      // Selected parcel stroke (property scope)
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

      // Permit heatmap (toggled off by default)
      map.addLayer({
        id: PERMIT_HEATMAP_LAYER,
        type: "heatmap",
        source: SOURCE_ID,
        ...sl,
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": [
            "interpolate", ["linear"],
            ["coalesce", ["get", "permit_count"], 0],
            0, 0,
            5, 0.5,
            15, 1,
          ] as unknown as number,
          "heatmap-intensity": 0.8,
          "heatmap-radius": 18,
          "heatmap-opacity": 0.75,
          "heatmap-color": [
            "interpolate", ["linear"],
            ["heatmap-density"],
            0,   "rgba(31,41,55,0)",
            0.2, "rgba(120,53,15,0.6)",
            0.5, "rgba(234,88,12,0.8)",
            0.8, "rgba(220,38,38,0.9)",
            1,   "rgba(155,28,28,1)",
          ],
        },
      } as unknown as LayerSpecification);

      // CARTO labels overlay (on top of parcel layers)
      map.addLayer({
        id: LABELS_LAYER,
        type: "raster",
        source: "osm-labels",
        paint: { "raster-opacity": 0.85 },
      } as LayerSpecification);

      // Interactions
      map.on("mousemove", FILL_LAYER, (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) { setHoverFeature(null); return; }
        const props = feature.properties as Record<string, unknown>;
        setHoverFeature({
          pin: String(props.pin_normalized ?? props.pin_original ?? ""),
          address: String(props.address ?? "Address not on record"),
          decade: formatDecade(String(props.decade_built ?? "")),
          yearBuilt: typeof props.year_built === "number" ? props.year_built : null,
          permitCount: typeof props.permit_count === "number" ? props.permit_count : null,
          neighborhoodId: typeof props.neighborhood_id === "string" ? props.neighborhood_id : null,
        });
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", FILL_LAYER, () => {
        setHoverFeature(null);
        map.getCanvas().style.cursor = "";
      });

      map.on("click", FILL_LAYER, (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as Record<string, unknown>;
        const pin = String(props.pin_normalized ?? props.pin_original ?? "");
        if (pin) router.push(`/properties/${encodeURIComponent(pin)}`);
      });

      // Stats: recompute whenever the map settles
      const computeStats = () => {
        if (!map.getLayer(FILL_LAYER)) return;
        const features = map.queryRenderedFeatures(undefined, { layers: [FILL_LAYER] });
        const seen = new Set<string>();
        const byDecade: Partial<Record<string, number>> = {};
        let minYear: number | null = null;
        let maxYear: number | null = null;
        for (const f of features) {
          const pin = String(f.properties?.pin_normalized ?? "");
          if (!pin || seen.has(pin)) continue;
          seen.add(pin);
          const decade = String(f.properties?.decade_built ?? "Unknown");
          byDecade[decade] = (byDecade[decade] ?? 0) + 1;
          const yr = typeof f.properties?.year_built === "number" ? f.properties.year_built : null;
          if (yr) {
            if (!minYear || yr < minYear) minYear = yr;
            if (!maxYear || yr > maxYear) maxYear = yr;
          }
        }
        setStats({ total: seen.size, byDecade, minYear, maxYear });
      };
      statsCallbackRef.current = computeStats;
      map.on("idle", computeStats);

      // Initial fly-to
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

  // ---------------------------------------------------------------------------
  // Lens switching
  // ---------------------------------------------------------------------------

  const overviewTypesKey =
    scope.kind === "neighborhood-type-overview" ? scope.neighborhoodTypes.join(",") : null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const lensConfig = MAP_LENSES.find((l) => l.id === lens);
    if (!lensConfig?.hasData) {
      // No map-tile data for this lens: render as muted gray + show notice
      const muted = "#374151";
      map.setPaintProperty(FILL_LAYER, "fill-color", muted);
      map.setPaintProperty(SELECTED_FILL_LAYER, "fill-color", muted);
      setNoDataLens(true);
      setNeighborhoodLegend(null);
      return;
    }
    setNoDataLens(false);

    if (lens === "neighborhood") {
      let cancelled = false;
      (async () => {
        let types: string[];
        let districtList: NeighborhoodLegendItem[];
        if (scope.kind === "neighborhood-type-overview" && districts) {
          types = scope.neighborhoodTypes;
          districtList = districts;
        } else {
          types = [DEFAULT_NEIGHBORHOOD_TYPE];
          if (!officialPlanningDistrictsRef.current) {
            const summaries = await fetchNeighborhoodSummaries();
            officialPlanningDistrictsRef.current = summaries
              .filter((s) => s.neighborhoodType === "official_planning")
              .sort((a, b) => (a.earliestYear ?? 9999) - (b.earliestYear ?? 9999))
              .map((s) => ({ id: s.id, label: s.label, slug: s.slug }));
          }
          districtList = officialPlanningDistrictsRef.current;
        }
        if (cancelled || !map.getLayer(FILL_LAYER)) return;
        const { expression, legend } = buildNeighborhoodFillExpression(
          neighborhoodPropertyGetter(types),
          districtList
        );
        map.setPaintProperty(FILL_LAYER, "fill-color", expression as unknown as string);
        map.setPaintProperty(SELECTED_FILL_LAYER, "fill-color", expression as unknown as string);
        setNeighborhoodLegend(legend);
      })();
      return () => { cancelled = true; };
    }

    setNeighborhoodLegend(null);
    const expr = getLensFillExpression(lens);
    if (expr) {
      map.setPaintProperty(FILL_LAYER, "fill-color", expr);
      map.setPaintProperty(SELECTED_FILL_LAYER, "fill-color", expr);
    }
  }, [lens, isLoaded, overviewTypesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Basemap switching
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const cfg = BASEMAP_CONFIGS[basemap];
    (map.getSource("osm-base") as unknown as { setTiles: (t: string[]) => void })?.setTiles([cfg.base]);
    (map.getSource("osm-labels") as unknown as { setTiles: (t: string[]) => void })?.setTiles([cfg.labels]);
    map.setPaintProperty("base-tiles", "raster-opacity", cfg.rasterOpacity);
    if (map.getLayer(LABELS_LAYER)) {
      map.setPaintProperty(LABELS_LAYER, "raster-opacity", cfg.labelsOpacity);
    }
  }, [basemap, isLoaded]);

  // ---------------------------------------------------------------------------
  // Era range filter + animation filter (unified)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    if (animMode) {
      // Animation: show known-year parcels built up to animYear; unknown-year in muted grey
      const animFilter = [
        "all",
        ["!=", ["get", "decade_built"], "Unknown"],
        ["<=", ["get", "year_built"], animYear],
      ] as unknown as FilterSpecification;
      if (map.getLayer(FILL_LAYER)) map.setFilter(FILL_LAYER, animFilter);
      if (map.getLayer(STROKE_LAYER)) map.setFilter(STROKE_LAYER, animFilter);
      if (map.getLayer(FILL_MUTED_LAYER)) {
        map.setFilter(FILL_MUTED_LAYER, ["==", ["get", "decade_built"], "Unknown"] as unknown as FilterSpecification);
        map.setPaintProperty(FILL_MUTED_LAYER, "fill-opacity", 0.3);
      }
    } else {
      // Normal era range filter
      const base = buildScopeFilter(scope) as FilterSpecification;
      let combined: FilterSpecification;
      if (eraFilter) {
        const [lo, hi] = eraFilter;
        combined = [
          "all",
          base,
          [">=", ["get", "year_built"], lo],
          ["<=", ["get", "year_built"], hi],
        ] as unknown as FilterSpecification;
      } else {
        combined = base;
      }
      if (map.getLayer(FILL_LAYER)) map.setFilter(FILL_LAYER, combined);
      if (map.getLayer(STROKE_LAYER)) map.setFilter(STROKE_LAYER, combined);
      // Restore muted layer for city scope (opacity 0 = invisible)
      if (map.getLayer(FILL_MUTED_LAYER) && scope.kind === "city") {
        map.setFilter(FILL_MUTED_LAYER, null);
        map.setPaintProperty(FILL_MUTED_LAYER, "fill-opacity", 0);
      }
      statsCallbackRef.current?.();
    }
  }, [animMode, animYear, eraFilter, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Animation playback
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!animPlaying || !animMode) return;
    const ms = animSpeed === "slow" ? 200 : animSpeed === "fast" ? 20 : 80;
    const id = setInterval(() => {
      setAnimYear((y) => {
        if (y >= ERA_FILTER_MAX) {
          setAnimPlaying(false);
          return y;
        }
        return y + 1;
      });
    }, ms);
    return () => clearInterval(id);
  }, [animPlaying, animMode, animSpeed]);

  // ---------------------------------------------------------------------------
  // Layer toggles
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const vis = (v: boolean) => (v ? "visible" : "none") as "visible" | "none";
    if (map.getLayer("boundary-glow")) map.setLayoutProperty("boundary-glow", "visibility", vis(layerToggles.boundary));
    if (map.getLayer("boundary-line")) map.setLayoutProperty("boundary-line", "visibility", vis(layerToggles.boundary));
    if (map.getLayer(PERMIT_HEATMAP_LAYER)) map.setLayoutProperty(PERMIT_HEATMAP_LAYER, "visibility", vis(layerToggles.permitHeatmap));
  }, [layerToggles, isLoaded]);

  // GIS buildings overlay (all scopes — lazy-loaded on first enable)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const vis = (v: boolean) => (v ? "visible" : "none") as "visible" | "none";

    if (layerToggles.gisBuildings && !gisBuildingsAddedRef.current) {
      map.addSource(GIS_BUILDINGS_SOURCE, {
        type: "geojson",
        data: BUILDINGS_GEOJSON_URL,
      });
      map.addLayer(
        {
          id: GIS_BUILDINGS_LAYER,
          type: "line",
          source: GIS_BUILDINGS_SOURCE,
          paint: {
            "line-color": GIS_BUILDINGS_STROKE_COLOR,
            "line-width": GIS_BUILDINGS_STROKE_WIDTH,
            "line-opacity": GIS_BUILDINGS_STROKE_OPACITY,
          },
        } as LayerSpecification,
        LABELS_LAYER
      );
      gisBuildingsAddedRef.current = true;
    } else if (gisBuildingsAddedRef.current) {
      if (map.getLayer(GIS_BUILDINGS_LAYER))
        map.setLayoutProperty(GIS_BUILDINGS_LAYER, "visibility", vis(layerToggles.gisBuildings));
    }
  }, [layerToggles.gisBuildings, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Neighborhood boundary overlay — auto-loaded when scope is "neighborhood"
  const neighborhoodId = scope.kind === "neighborhood" ? scope.neighborhoodId : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !neighborhoodId) return;
    if (neighborhoodBoundaryAddedRef.current) return;

    map.addSource(NEIGHBORHOOD_BOUNDARY_SOURCE, {
      type: "geojson",
      data: `/api/neighborhood-boundary?id=${encodeURIComponent(neighborhoodId)}`,
    });
    map.addLayer(
      {
        id: NEIGHBORHOOD_BOUNDARY_FILL_LAYER,
        type: "fill",
        source: NEIGHBORHOOD_BOUNDARY_SOURCE,
        paint: { "fill-color": "#8b5cf6", "fill-opacity": 0.07 },
      } as LayerSpecification,
      FILL_MUTED_LAYER
    );
    map.addLayer(
      {
        id: NEIGHBORHOOD_BOUNDARY_STROKE_LAYER,
        type: "line",
        source: NEIGHBORHOOD_BOUNDARY_SOURCE,
        paint: {
          "line-color": "#8b5cf6",
          "line-width": 1.5,
          "line-opacity": 0.5,
          "line-dasharray": [4, 3],
        },
      } as LayerSpecification,
      FILL_LAYER
    );
    neighborhoodBoundaryAddedRef.current = true;
  }, [isLoaded, neighborhoodId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Multi-boundary overview — auto-loaded when scope is "neighborhood-type-overview".
  // Unlike the single-neighborhood overlay above, every parcel on the map is
  // in-scope here (buildScopeFilter returns "all"), so the stroke is anchored
  // ABOVE the parcel fill layer (before LABELS_LAYER) instead of below it,
  // or it would be hidden under the colored parcels. Deliberately has no
  // click/hover handler: every point inside a district also hits a parcel
  // underneath, which already navigates to /properties/{pin} on click --
  // the list below the map is the click-through path to each district's
  // detail page instead.
  //
  // Each boundary is colored per-district (matching the legend/parcel
  // colors) rather than a flat color, using the same districts list + fixed
  // palette as buildNeighborhoodFillExpression, keyed on each boundary
  // feature's "id" property (set by get_neighborhood_type_boundaries_geojson).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !overviewTypesKey) return;
    if (neighborhoodTypeOverviewAddedRef.current) return;

    const types = overviewTypesKey.split(",");
    const query = types.map((t) => `type=${encodeURIComponent(t)}`).join("&");

    const boundaryColor = districts && districts.length > 0
      ? (buildNeighborhoodFillExpression(["get", "id"], districts).expression as unknown as string)
      : NEIGHBORHOOD_FALLBACK_COLOR;

    map.addSource(NEIGHBORHOOD_TYPE_OVERVIEW_SOURCE, {
      type: "geojson",
      data: `/api/neighborhood-type-boundaries?${query}`,
    });
    map.addLayer(
      {
        id: NEIGHBORHOOD_TYPE_OVERVIEW_FILL_LAYER,
        type: "fill",
        source: NEIGHBORHOOD_TYPE_OVERVIEW_SOURCE,
        paint: { "fill-color": boundaryColor, "fill-opacity": 0.16 },
      } as LayerSpecification,
      FILL_MUTED_LAYER
    );
    map.addLayer(
      {
        id: NEIGHBORHOOD_TYPE_OVERVIEW_STROKE_LAYER,
        type: "line",
        source: NEIGHBORHOOD_TYPE_OVERVIEW_SOURCE,
        paint: {
          "line-color": boundaryColor,
          "line-width": 1.75,
          "line-opacity": 0.85,
          "line-dasharray": [4, 3],
        },
      } as LayerSpecification,
      LABELS_LAYER
    );
    neighborhoodTypeOverviewAddedRef.current = true;
  }, [isLoaded, overviewTypesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const showBelowMap = !isPropertyScope && isLoaded && !isFullscreen;
  const eraFilterActive = eraFilter !== null;

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[100] flex flex-col bg-surface-base" : "flex flex-col"}>
      {/* Map container */}
      <div
        className={`relative overflow-hidden border border-surface-border ${
          isFullscreen ? "flex-1 rounded-none border-0" : "rounded-lg"
        }`}
        style={{ height: isFullscreen ? undefined : height }}
      >
        {/* Loading skeleton */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-surface-card flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
              <p className="text-xs text-text-muted">Loading map</p>
            </div>
          </div>
        )}

        {/* MapLibre canvas */}
        <div ref={containerRef} className="w-full h-full" />

        {/* No-data lens notice */}
        {isLoaded && noDataLens && (
          <div className="absolute inset-x-0 top-14 flex justify-center z-10 pointer-events-none">
            <div className="bg-surface-card/95 border border-surface-border rounded-lg px-3 py-1.5 shadow-lg text-xs text-text-muted">
              Map tile data for this lens is being added in a future build
            </div>
          </div>
        )}

        {/* Lens tabs (top-left) */}
        {isLoaded && !hideLensSelector && (
          <div className="absolute top-3 left-3 z-10">
            <div className="flex flex-wrap items-center gap-1">
              {MAP_LENSES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => { setAnimMode(false); setAnimPlaying(false); setLens(l.id); }}
                  title={l.description}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors shadow-sm ${
                    !animMode && lens === l.id
                      ? "bg-accent-purple text-white border-accent-purple/50 font-medium"
                      : l.hasData
                      ? "bg-surface-card/95 text-text-secondary border-surface-border hover:text-text-primary hover:border-accent-purple/40"
                      : "bg-surface-card/80 text-text-muted border-surface-border/50 opacity-60"
                  }`}
                >
                  <LensIcon id={l.id} />
                  {l.label}
                </button>
              ))}
              {scope.kind === "city" && (
                <>
                  <span className="w-px h-3.5 bg-white/20 mx-0.5 shrink-0" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => {
                      if (animMode) {
                        setAnimMode(false);
                        setAnimPlaying(false);
                      } else {
                        setAnimMode(true);
                        setAnimYear(ERA_FILTER_MIN);
                        setAnimPlaying(false);
                        setLens("era");
                        setEraFilter(null);
                      }
                    }}
                    title="Watch Park Ridge build out over time"
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors shadow-sm ${
                      animMode
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium"
                        : "bg-surface-card/95 text-text-secondary border-surface-border hover:text-text-primary hover:border-amber-500/30"
                    }`}
                  >
                    <AnimateIcon />
                    Timeline
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Top-right controls */}
        {isLoaded && (
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end">
            {showExpand && (
              <button
                type="button"
                onClick={() => setIsFullscreen((f) => !f)}
                aria-label={isFullscreen ? "Exit fullscreen" : "Expand map"}
                className="bg-surface-card/95 border border-surface-border rounded p-1.5 text-text-secondary hover:text-text-primary transition-colors shadow"
              >
                {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowLayersPanel((v) => !v)}
              aria-label="Toggle layers panel"
              aria-expanded={showLayersPanel}
              className={`bg-surface-card/95 border rounded px-2 py-1.5 text-xs font-medium transition-colors shadow flex items-center gap-1.5 ${
                showLayersPanel
                  ? "border-accent-purple/50 text-accent-purple"
                  : "border-surface-border text-text-secondary hover:text-text-primary"
              }`}
            >
              <LayersIcon />
              Layers
            </button>

            {/* Layers panel */}
            {showLayersPanel && (
              <div className="bg-surface-card/98 border border-surface-border rounded-lg shadow-xl p-3 w-52">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Basemap</p>
                <div className="flex gap-1 mb-3">
                  {(["dark", "light", "satellite"] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBasemap(b)}
                      className={`flex-1 py-1 text-xs rounded border transition-colors capitalize ${
                        basemap === b
                          ? "bg-accent-purple/20 text-accent-purple border-accent-purple/40 font-medium"
                          : "text-text-secondary border-surface-border hover:text-text-primary"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Overlays</p>
                <div className="space-y-1.5">
                  <LayerToggle
                    label="City boundary"
                    checked={layerToggles.boundary}
                    onChange={(v) => setLayerToggles((t) => ({ ...t, boundary: v }))}
                  />
                  <LayerToggle
                    label="Permit activity"
                    checked={layerToggles.permitHeatmap}
                    onChange={(v) => setLayerToggles((t) => ({ ...t, permitHeatmap: v }))}
                  />
                  <LayerToggle
                    label="Building outlines"
                    checked={layerToggles.gisBuildings}
                    onChange={(v) => setLayerToggles((t) => ({ ...t, gisBuildings: v }))}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hover feature card (pinned bottom-left) */}
        {isLoaded && hoverFeature && (
          <div className="absolute bottom-10 left-3 z-10 bg-surface-card/98 border border-surface-border rounded-lg shadow-xl p-3 max-w-[240px] pointer-events-none">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ERA_PALETTE[hoverFeature.decade] ?? "#9ca3af" }}
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold text-text-secondary">{hoverFeature.decade}</span>
              {hoverFeature.yearBuilt && (
                <span className="text-[11px] text-text-muted">· {hoverFeature.yearBuilt}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-text-primary leading-tight">{hoverFeature.address}</p>
            {hoverFeature.permitCount !== null && hoverFeature.permitCount > 0 && (
              <p className="text-xs text-text-muted mt-0.5">
                {hoverFeature.permitCount} permit{hoverFeature.permitCount !== 1 ? "s" : ""} on record
              </p>
            )}
            <p className="text-[10px] text-text-muted mt-1 font-mono">
              PIN {hoverFeature.pin}
            </p>
            <p className="text-xs text-accent-purple mt-1">View property →</p>
          </div>
        )}

        {/* Timeline mode badge — bottom-center of canvas */}
        {isLoaded && animMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[5] pointer-events-none">
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-3 py-1 text-[11px] text-amber-300 font-medium backdrop-blur-sm shadow">
              <AnimateIcon />
              Build-out Timeline
            </div>
          </div>
        )}

        {/* Neighborhood district legend — pinned directly on the map canvas
            (bottom-right) rather than below it, so it reads unambiguously as
            "this is what the colors on THIS map mean" instead of a
            disconnected block underneath. */}
        {isLoaded && lens === "neighborhood" && neighborhoodLegend && neighborhoodLegend.length > 0 && (
          <div className="absolute bottom-3 right-3 z-10 max-w-[220px]">
            <NeighborhoodLegendPanel entries={neighborhoodLegend} />
          </div>
        )}

      </div>

      {/* Below-map: animation controls OR era filter + legend bar + stats */}
      {showBelowMap && (
        <div className="mt-3 space-y-3">
          {animMode ? (
            <BuildoutAnimationControls
              year={animYear}
              playing={animPlaying}
              speed={animSpeed}
              onYearChange={(y) => { setAnimYear(y); setAnimPlaying(false); }}
              onPlayPause={() => setAnimPlaying((p) => !p)}
              onReset={() => { setAnimYear(ERA_FILTER_MIN); setAnimPlaying(false); }}
              onSpeedChange={setAnimSpeed}
            />
          ) : (
            <>
              <EraRangeFilter
                eraFilter={eraFilter}
                onFilter={setEraFilter}
              />
              {lens === "era" && (
                <MapLegendBar byDecade={stats?.byDecade ?? {}} eraFilter={eraFilter} />
              )}
              {stats && stats.total > 0 && (
                <MapStatsPanel stats={stats} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Era range filter
// ---------------------------------------------------------------------------

function EraRangeFilter({
  eraFilter,
  onFilter,
}: {
  eraFilter: [number, number] | null;
  onFilter: (f: [number, number] | null) => void;
}) {
  const lo = eraFilter?.[0] ?? ERA_FILTER_MIN;
  const hi = eraFilter?.[1] ?? ERA_FILTER_MAX;
  const isActive = eraFilter !== null;
  const totalRange = ERA_FILTER_MAX - ERA_FILTER_MIN;
  const loPercent = ((lo - ERA_FILTER_MIN) / totalRange) * 100;
  const hiPercent = ((hi - ERA_FILTER_MIN) / totalRange) * 100;

  const handleLoChange = (v: number) => {
    const clamped = Math.min(v, hi - 5);
    onFilter([clamped, hi]);
  };
  const handleHiChange = (v: number) => {
    const clamped = Math.max(v, lo + 5);
    onFilter([lo, clamped]);
  };

  return (
    <div className={`px-3 py-2.5 rounded-lg border text-sm transition-colors ${
      isActive ? "bg-accent-purple/5 border-accent-purple/30" : "bg-surface-raised border-surface-border"
    }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-text-secondary tracking-wide">
          Filter by era
        </span>
        {isActive && (
          <button
            type="button"
            onClick={() => onFilter(null)}
            className="text-[10px] text-text-muted hover:text-text-primary transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-secondary w-10 shrink-0 tabular-nums">{lo}</span>
        {/* Dual range slider */}
        <div className="relative flex-1 h-5 flex items-center">
          {/* Track */}
          <div className="absolute w-full h-1.5 rounded-full bg-surface-border">
            <div
              className={`absolute h-full rounded-full bg-accent-purple/60 transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`}
              style={{ left: `${loPercent}%`, width: `${hiPercent - loPercent}%` }}
            />
          </div>
          {/* Min thumb */}
          <input
            type="range"
            min={ERA_FILTER_MIN}
            max={ERA_FILTER_MAX}
            step={5}
            value={lo}
            onChange={(e) => handleLoChange(+e.target.value)}
            className="map-range-input absolute w-full"
            aria-label="Minimum year"
          />
          {/* Max thumb */}
          <input
            type="range"
            min={ERA_FILTER_MIN}
            max={ERA_FILTER_MAX}
            step={5}
            value={hi}
            onChange={(e) => handleHiChange(+e.target.value)}
            className="map-range-input absolute w-full"
            aria-label="Maximum year"
          />
        </div>
        <span className="text-xs text-text-secondary w-10 shrink-0 tabular-nums text-right">{hi}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buildout animation controls
// ---------------------------------------------------------------------------

function BuildoutAnimationControls({
  year,
  playing,
  speed,
  onYearChange,
  onPlayPause,
  onReset,
  onSpeedChange,
}: {
  year: number;
  playing: boolean;
  speed: "slow" | "normal" | "fast";
  onYearChange: (y: number) => void;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (s: "slow" | "normal" | "fast") => void;
}) {
  const totalRange = ERA_FILTER_MAX - ERA_FILTER_MIN;
  const percent = ((year - ERA_FILTER_MIN) / totalRange) * 100;
  const atEnd = year >= ERA_FILTER_MAX;

  return (
    <div className="px-3 py-2.5 rounded-lg border bg-amber-500/5 border-amber-500/25 text-sm">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-semibold text-amber-300 tracking-wide">Build-out timeline</span>
        <div className="flex items-center gap-1">
          {(["slow", "normal", "fast"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors capitalize ${
                speed === s
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "text-text-muted border-surface-border hover:text-text-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-text-primary tabular-nums">{year}</span>
        <span className="text-xs text-text-muted">and earlier</span>
      </div>

      <div className="relative flex items-center gap-3 mb-2.5">
        <div className="relative flex-1 h-5 flex items-center">
          <div className="absolute w-full h-1.5 rounded-full bg-surface-border">
            <div
              className="absolute h-full rounded-full bg-amber-500/60"
              style={{ width: `${percent}%` }}
            />
          </div>
          <input
            type="range"
            min={ERA_FILTER_MIN}
            max={ERA_FILTER_MAX}
            step={1}
            value={year}
            onChange={(e) => onYearChange(+e.target.value)}
            className="map-range-input absolute w-full"
            aria-label="Animation year"
          />
        </div>
        <span className="text-xs text-text-muted w-10 text-right tabular-nums shrink-0">{ERA_FILTER_MAX}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] px-2 py-1 rounded border border-surface-border text-text-muted hover:text-text-secondary transition-colors"
          aria-label="Reset to earliest year"
        >
          ↺ Reset
        </button>
        <button
          type="button"
          onClick={onPlayPause}
          disabled={atEnd}
          className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition-colors font-medium ${
            atEnd
              ? "opacity-40 cursor-not-allowed border-surface-border text-text-muted"
              : playing
              ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
              : "bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
          }`}
          aria-label={playing ? "Pause animation" : "Play animation"}
        >
          {playing ? (
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="3" y="3" width="4" height="10" rx="1" />
              <rect x="9" y="3" width="4" height="10" rx="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <polygon points="4,2 14,8 4,14" />
            </svg>
          )}
          {playing ? "Pause" : atEnd ? "Done" : "Play"}
        </button>
        <span className="text-[10px] text-text-muted ml-auto">
          Properties with unknown build date shown in grey
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MapLegendBar
// ---------------------------------------------------------------------------

export function MapLegendBar({
  byDecade,
  eraFilter,
}: {
  byDecade: Partial<Record<string, number>>;
  eraFilter: [number, number] | null;
}) {
  const total = Object.values(byDecade).reduce((s: number, v) => s + (v ?? 0), 0);
  const hasData = total > 0;

  return (
    <div
      className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2.5"
      aria-label="Construction era legend"
    >
      <div className="flex items-stretch gap-0.5">
        {ERA_ORDER.map((decade) => {
          const count = byDecade[decade] ?? 0;
          const pct = hasData ? (count / total) * 100 : 0;
          const inRange = isDecadeInFilter(decade, eraFilter);
          const color = ERA_PALETTE[decade];
          return (
            <div
              key={decade}
              className="flex flex-col items-center gap-1 min-w-0"
              style={{ flexBasis: `${Math.max(pct, 2)}%`, flexShrink: 1, flexGrow: 0 }}
            >
              <div
                className="w-full rounded-sm transition-opacity"
                style={{
                  height: "12px",
                  backgroundColor: color,
                  opacity: eraFilter && !inRange ? 0.25 : 1,
                }}
              />
              <span
                className="text-[9px] leading-tight text-text-muted truncate w-full text-center"
                style={{ opacity: eraFilter && !inRange ? 0.4 : 1 }}
              >
                {decade === "Pre-1900" ? "<1900" : decade === "Unknown" ? "?" : decade}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isDecadeInFilter(decade: string, filter: [number, number] | null): boolean {
  if (!filter) return true;
  if (decade === "Unknown" || decade === "Pre-1900") {
    return filter[0] <= 1900;
  }
  const year = parseInt(decade, 10);
  if (isNaN(year)) return true;
  return year >= filter[0] && year <= filter[1] + 9;
}

// ---------------------------------------------------------------------------
// NeighborhoodLegendPanel — district color swatch + name, each linking to
// that district's detail page. One color per entry, assigned by
// buildNeighborhoodFillExpression in the same fixed order used to paint
// the map, so this legend can never disagree with what's on screen.
// ---------------------------------------------------------------------------

export function NeighborhoodLegendPanel({ entries }: { entries: NeighborhoodLegendEntry[] }) {
  return (
    <div
      className="bg-surface-card/95 border border-surface-border rounded-lg shadow-xl p-3"
      aria-label="Neighborhood district legend"
    >
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
        Map colors
      </p>
      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/neighborhoods/${encodeURIComponent(entry.slug)}`}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="truncate">{entry.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MapStatsPanel
// ---------------------------------------------------------------------------

export function MapStatsPanel({ stats }: { stats: MapStats }) {
  const { total, byDecade, minYear, maxYear } = stats;
  const topDecades = Object.entries(byDecade)
    .filter(([, v]) => v && v > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 3);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
        <div>
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Visible parcels</p>
          <p className="text-xl font-bold text-text-primary tabular-nums">{total.toLocaleString()}</p>
        </div>
        {minYear && maxYear && (
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Built</p>
            <p className="text-xl font-bold text-text-primary tabular-nums">{minYear}–{maxYear}</p>
          </div>
        )}
        {topDecades.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Top eras</p>
            <div className="flex gap-2">
              {topDecades.map(([decade, count]) => (
                <div key={decade} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ERA_PALETTE[decade] ?? "#9ca3af" }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-text-secondary">
                    {formatDecade(decade)} <span className="text-text-muted">({count?.toLocaleString()})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layer toggle UI
// ---------------------------------------------------------------------------

function LayerToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div
        className={`w-3.5 h-3.5 rounded-sm border transition-colors shrink-0 ${
          checked
            ? "bg-accent-purple border-accent-purple"
            : "bg-surface-raised border-surface-border group-hover:border-text-muted"
        }`}
        aria-hidden="true"
      >
        {checked && (
          <svg viewBox="0 0 12 12" fill="none" className="w-full h-full text-white">
            <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Icon components
// ---------------------------------------------------------------------------

function LensIcon({ id }: { id: MapLens }) {
  switch (id) {
    case "era":
      return (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" /><polyline points="8,4 8,8 11,10" />
        </svg>
      );
    case "permits":
      return (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="4" y="2" width="8" height="12" rx="1.5" /><line x1="6" y1="6" x2="10" y2="6" /><line x1="6" y1="9" x2="10" y2="9" />
        </svg>
      );
    case "neighborhood":
      return (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M8 2C5.79 2 4 3.79 4 6c0 3 4 8 4 8s4-5 4-8c0-2.21-1.79-4-4-4z" /><circle cx="8" cy="6" r="1.5" />
        </svg>
      );
    case "sales":
      return (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" /><path d="M8 4.5v1m0 5v1m-2-3.5h3.5a1 1 0 0 1 0 2H6.5a1 1 0 0 0 0 2H10" />
        </svg>
      );
    case "subdivision":
      return (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="2" y="2" width="12" height="12" rx="1" /><line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      );
  }
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
      <line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 1 L15 5 L8 9 L1 5 Z" /><path d="M1 9 L8 13 L15 9" /><path d="M1 12 L8 16 L15 12" />
    </svg>
  );
}

function AnimateIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <polygon points="4,2 13,8 4,14" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Building outlines help orient a close-in property/street view, but on
// boundary-driven maps (a subdivision, a single neighborhood, or the
// district overview maps) they clutter the district/subdivision outline
// they're meant to make legible -- default them off there. Still
// user-toggleable via the Layers panel on every scope.
function defaultGisBuildings(scope: MapScope): boolean {
  switch (scope.kind) {
    case "subdivision":
    case "neighborhood":
    case "neighborhood-type-overview":
      return false;
    default:
      return true;
  }
}

function buildScopeFilter(scope: MapScope): unknown[] {
  switch (scope.kind) {
    case "property":     return ["==", ["get", "pin_normalized"], scope.pin];
    case "street":       return ["==", ["get", "street_name_normalized"], scope.streetName];
    case "neighborhood":
      if (scope.pins && scope.pins.length > 0) {
        return ["in", ["get", "pin_normalized"], ["literal", scope.pins]];
      }
      return ["==", "1", "0"]; // no pins assigned - show nothing
    case "neighborhood-type-overview": return ["all"];
    case "subdivision":
      if (scope.pins && scope.pins.length > 0) {
        return ["in", ["get", "pin_normalized"], ["literal", scope.pins]];
      }
      return ["==", ["get", "subdivision_id"], scope.subdivisionId];
    case "city":         return ["all"];
  }
}

function flyToScope(map: MaplibreMap, scope: MapScope) {
  const animOpts = { duration: 1200 };
  switch (scope.kind) {
    case "property":
      if (scope.bbox) {
        map.fitBounds(
          [[scope.bbox[0], scope.bbox[1]], [scope.bbox[2], scope.bbox[3]]],
          { padding: 80, maxZoom: 19, ...animOpts }
        );
      } else if (scope.lat != null && scope.lng != null) {
        map.flyTo({ center: [scope.lng, scope.lat], zoom: MAP_ZOOM_PROPERTY, ...animOpts });
      }
      break;
    case "street":
      if (scope.bbox) {
        map.fitBounds([[scope.bbox[0], scope.bbox[1]], [scope.bbox[2], scope.bbox[3]]], { padding: 56, ...animOpts });
      } else {
        map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM_STREET, ...animOpts });
      }
      break;
    case "neighborhood":
      if (scope.bbox) {
        map.fitBounds([[scope.bbox[0], scope.bbox[1]], [scope.bbox[2], scope.bbox[3]]], { padding: 56, ...animOpts });
      } else {
        map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM_NEIGHBORHOOD, ...animOpts });
      }
      break;
    case "neighborhood-type-overview":
      if (scope.bbox) {
        map.fitBounds([[scope.bbox[0], scope.bbox[1]], [scope.bbox[2], scope.bbox[3]]], { padding: 56, ...animOpts });
      } else {
        map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM_NEIGHBORHOOD, ...animOpts });
      }
      break;
    case "subdivision":
      if (scope.bbox) {
        map.fitBounds([[scope.bbox[0], scope.bbox[1]], [scope.bbox[2], scope.bbox[3]]], { padding: 56, ...animOpts });
      } else {
        map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM_SUBDIVISION, ...animOpts });
      }
      break;
    case "city":
      map.flyTo({ center: MAP_CENTER, zoom: MAP_ZOOM_CITY, ...animOpts });
      break;
  }
}
