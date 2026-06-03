import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import { mapLibreFillColor, decadeColors } from "../lib/colorScales";
import { baseMapStyle, parkRidgeCenter } from "../lib/mapStyle";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";
import { parcelPopupHtml } from "./ParcelPopup";

type MapViewProps = {
  parcels: ParcelCollection | null;
  selectedParcel: ParcelFeature | null;
  boundary: GeoJSON.FeatureCollection | null;
  showOutlines: boolean;
  showBoundary: boolean;
  onSelectParcel: (feature: ParcelFeature) => void;
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
  onSelectParcel
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectParcelRef = useRef(onSelectParcel);
  const latestParcelsRef = useRef<ParcelCollection>(emptyCollection);
  const latestSelectedRef = useRef<GeoJSON.FeatureCollection>(emptyFeatureCollection());
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
  latestBoundaryRef.current = boundary ?? { type: "FeatureCollection", features: [] };
  onSelectParcelRef.current = onSelectParcel;

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
    };
  }, []);

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

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function featureCollectionFromFeature(feature: ParcelFeature): GeoJSON.FeatureCollection {
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
