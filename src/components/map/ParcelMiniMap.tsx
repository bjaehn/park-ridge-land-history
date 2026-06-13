import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { baseMapStyle, parkRidgeCenter } from "../../lib/mapStyle";
import type { ParcelCollection, ParcelFeature } from "../../lib/parcelTypes";

type Props = {
  allParcels: ParcelCollection | null;
  boundary?: GeoJSON.FeatureCollection | null;
  highlightPins?: Set<string>;
  height?: number;
};

export function ParcelMiniMap({ allParcels, boundary, highlightPins, height = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseMapStyle,
      center: parkRidgeCenter,
      zoom: 13,
      interactive: true,
      scrollZoom: false,
      attributionControl: false,
    });
    map.on("load", () => setMapReady(true));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const pinList = highlightPins ? Array.from(highlightPins) : [];

    if (boundary) {
      if (map.getSource("boundary")) {
        (map.getSource("boundary") as maplibregl.GeoJSONSource).setData(boundary);
      } else {
        map.addSource("boundary", { type: "geojson", data: boundary });
        map.addLayer({
          id: "boundary-line",
          type: "line",
          source: "boundary",
          paint: { "line-color": "#22d3ee", "line-width": 1.5, "line-opacity": 0.4 },
        });
      }
    }

    if (allParcels) {
      const fillExpr = ["match", ["get", "pin_normalized"], pinList, "#22d3ee", "rgba(255,255,255,0.04)"] as maplibregl.ExpressionSpecification;
      const lineExpr = ["match", ["get", "pin_normalized"], pinList, "#22d3ee", "rgba(255,255,255,0.12)"] as maplibregl.ExpressionSpecification;
      const widthExpr = ["match", ["get", "pin_normalized"], pinList, 1.5, 0.3] as maplibregl.ExpressionSpecification;
      const fillColor = pinList.length > 0 ? fillExpr : "rgba(255,255,255,0.06)";
      const lineColor = pinList.length > 0 ? lineExpr : "rgba(255,255,255,0.12)";
      const lineWidth = pinList.length > 0 ? widthExpr : 0.3;

      if (map.getSource("parcels")) {
        (map.getSource("parcels") as maplibregl.GeoJSONSource).setData(allParcels);
        map.setPaintProperty("parcels-fill", "fill-color", fillColor);
        map.setPaintProperty("parcels-line", "line-color", lineColor);
        map.setPaintProperty("parcels-line", "line-width", lineWidth);
      } else {
        map.addSource("parcels", { type: "geojson", data: allParcels });
        map.addLayer({
          id: "parcels-fill",
          type: "fill",
          source: "parcels",
          paint: { "fill-color": fillColor, "fill-opacity": 0.85 },
        });
        map.addLayer({
          id: "parcels-line",
          type: "line",
          source: "parcels",
          paint: { "line-color": lineColor, "line-width": lineWidth },
        });
      }

      if (pinList.length > 0) {
        const highlighted = allParcels.features.filter((f) =>
          pinList.includes(f.properties.pin_normalized || "")
        );
        const bounds = computeBounds(highlighted);
        if (bounds) map.fitBounds(bounds, { padding: 56, maxZoom: 17, duration: 0 });
      }
    }
  }, [mapReady, allParcels, boundary, highlightPins]);

  return (
    <div
      ref={containerRef}
      style={{ height, borderRadius: 10, overflow: "hidden", background: "#0a0f1e" }}
    />
  );
}

function computeBounds(features: ParcelFeature[]): maplibregl.LngLatBoundsLike | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const f of features) {
    const coords = flatCoords(f.geometry.coordinates);
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
  }
  if (!Number.isFinite(minLng)) return null;
  return [minLng, minLat, maxLng, maxLat];
}

function flatCoords(coords: GeoJSON.Polygon["coordinates"] | GeoJSON.MultiPolygon["coordinates"]): GeoJSON.Position[] {
  if (!Array.isArray(coords[0][0][0])) return (coords as GeoJSON.Polygon["coordinates"]).flat();
  return (coords as GeoJSON.MultiPolygon["coordinates"]).flat(2);
}
