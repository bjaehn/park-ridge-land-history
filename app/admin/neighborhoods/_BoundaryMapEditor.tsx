"use client";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - mapbox-gl-draw CSS; Next.js bundles this for client components
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { buildMapStyle, MAP_CENTER, MAP_ZOOM_DEFAULT, GEOJSON_FALLBACK_URL } from "@/lib/mapConfig";

export type BoundaryMapEditorHandle = {
  setGeometry: (geojson: string | null) => void;
};

type Props = {
  initialGeojson?: string | null;
  onChange: (geojson: string | null) => void;
};

type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

function computeBbox(geom: GeoJsonGeometry): [number, number, number, number] {
  let coords: number[][];
  if (geom.type === "Polygon") {
    coords = (geom.coordinates as number[][][]).flat();
  } else {
    coords = (geom.coordinates as number[][][][]).flat(2);
  }
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

export const BoundaryMapEditor = forwardRef<BoundaryMapEditorHandle, Props>(
  function BoundaryMapEditor({ initialGeojson, onChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drawRef = useRef<any>(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useImperativeHandle(ref, () => ({
      setGeometry(geojson: string | null) {
        const draw = drawRef.current;
        const map = mapRef.current;
        if (!draw || !map) return;
        draw.deleteAll();
        if (!geojson) {
          onChangeRef.current(null);
          return;
        }
        try {
          const parsed = JSON.parse(geojson) as GeoJsonGeometry;
          draw.add({ type: "Feature", geometry: parsed, properties: {} });
          const bbox = computeBbox(parsed);
          map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 60, maxZoom: 16 });
          onChangeRef.current(geojson);
        } catch {
          // invalid JSON - ignore, textarea validation will catch it
        }
      },
    }));

    const handleDrawNew = useCallback(() => {
      const draw = drawRef.current;
      if (!draw) return;
      draw.deleteAll();
      draw.changeMode("draw_polygon");
      onChangeRef.current(null);
    }, []);

    const handleClear = useCallback(() => {
      const draw = drawRef.current;
      if (!draw) return;
      draw.deleteAll();
      onChangeRef.current(null);
    }, []);

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      let cleanupFn: (() => void) | undefined;

      (async () => {
        const maplibregl = (await import("maplibre-gl")).default;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const MapboxDraw = (await import("@mapbox/mapbox-gl-draw") as any).default;

        if (!containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: buildMapStyle("dark"),
          center: MAP_CENTER,
          zoom: MAP_ZOOM_DEFAULT,
          attributionControl: false,
        });

        mapRef.current = map;

        const draw = new MapboxDraw({ displayControlsDefault: false });
        drawRef.current = draw;

        map.on("load", () => {
          // Parcel context layer (muted, for visual reference)
          map.addSource("admin-parcels", {
            type: "geojson",
            data: GEOJSON_FALLBACK_URL,
          });
          map.addLayer({
            id: "admin-parcels-fill",
            type: "fill",
            source: "admin-parcels",
            paint: { "fill-color": "#2a2a38", "fill-opacity": 0.55 },
          });
          map.addLayer({
            id: "admin-parcels-stroke",
            type: "line",
            source: "admin-parcels",
            paint: { "line-color": "#3a3a50", "line-width": 0.5 },
          });

          // Street name labels on top of parcels
          map.addLayer({
            id: "labels-overlay",
            type: "raster",
            source: "osm-labels",
            paint: { "raster-opacity": 0.9 },
          });

          // Add draw control after parcel layers so handles render on top
          map.addControl(draw);

          // Load existing geometry or start in draw mode
          if (initialGeojson) {
            try {
              const parsed = JSON.parse(initialGeojson) as GeoJsonGeometry;
              draw.add({ type: "Feature", geometry: parsed, properties: {} });
              const bbox = computeBbox(parsed);
              map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 60, maxZoom: 16 });
            } catch {
              draw.changeMode("draw_polygon");
            }
          } else {
            draw.changeMode("draw_polygon");
          }
        });

        const emitChange = () => {
          const features = draw.getAll().features;
          const feat = features[0];
          onChangeRef.current(feat?.geometry ? JSON.stringify(feat.geometry) : null);
        };

        map.on("draw.create", emitChange);
        map.on("draw.update", emitChange);
        map.on("draw.delete", emitChange);

        cleanupFn = () => {
          map.remove();
          mapRef.current = null;
          drawRef.current = null;
        };
      })();

      return () => cleanupFn?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={handleDrawNew}
            className="bg-surface-raised border border-surface-border text-text-primary text-xs font-semibold px-3 py-1.5 rounded hover:border-accent-teal/60 transition-colors"
          >
            Draw new
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="bg-surface-raised border border-surface-border text-text-primary text-xs font-semibold px-3 py-1.5 rounded hover:border-accent-red/60 transition-colors"
          >
            Clear
          </button>
          <p className="text-xs text-text-muted ml-1">
            Click to place vertices · Click first point to close · Drag to reshape
          </p>
        </div>
        <div
          ref={containerRef}
          style={{ height: "480px" }}
          className="rounded-lg overflow-hidden border border-surface-border"
        />
      </div>
    );
  }
);
