import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { mapLibreFillColor, decadeColors } from "../lib/colorScales";
import { baseMapStyle, parkRidgeCenter } from "../lib/mapStyle";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";
import { parcelPopupHtml } from "./ParcelPopup";

type MapViewProps = {
  parcels: ParcelCollection | null;
  boundary: GeoJSON.FeatureCollection | null;
  showOutlines: boolean;
  showBoundary: boolean;
};

const emptyCollection: ParcelCollection = {
  type: "FeatureCollection",
  features: []
};

export function MapView({ parcels, boundary, showOutlines, showBoundary }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const latestParcelsRef = useRef<ParcelCollection>(emptyCollection);
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
  latestBoundaryRef.current = boundary ?? { type: "FeatureCollection", features: [] };

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
      const feature = event.features?.[0] as unknown as ParcelFeature | undefined;
      if (!feature) return;
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
    };
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource("parcels") as GeoJSONSource | undefined;
    source?.setData(visibleParcels);
  }, [visibleParcels]);

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

  return <div ref={containerRef} className="map-canvas" aria-label="Park Ridge parcel map" />;
}
