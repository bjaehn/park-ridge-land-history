import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { baseMapStyle } from "../lib/mapStyle";
import { mapLibreFillColor } from "../lib/colorScales";
import type { ParcelFeature } from "../lib/parcelTypes";

type Props = {
  parcels: ParcelFeature[];
  /** PIN to highlight (outline + full opacity) */
  highlightPin?: string | null;
  onSelectParcel?: (pin: string) => void;
  height?: number;
  className?: string;
};

export function EmbeddedMap({ parcels, highlightPin, onSelectParcel, height = 280, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !parcels.length) return;

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    parcels.forEach((f) => {
      visitCoords(f.geometry.coordinates, (lng, lat) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });
    });
    if (!isFinite(minLng)) return;

    const container = containerRef.current;
    const map = new maplibregl.Map({
      container,
      style: baseMapStyle,
      bounds: [[minLng, minLat], [maxLng, maxLat]] as maplibregl.LngLatBoundsLike,
      fitBoundsOptions: { padding: 36, maxZoom: 18 },
      attributionControl: false,
    });

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: "240px" });

    map.on("load", () => {
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: parcels as GeoJSON.Feature[],
      };
      map.addSource("em-parcels", { type: "geojson", data: geojson });

      map.addLayer({
        id: "em-fill",
        type: "fill",
        source: "em-parcels",
        paint: {
          "fill-color": mapLibreFillColor(),
          "fill-opacity": highlightPin
            ? ["case", ["==", ["get", "pin_normalized"], highlightPin], 0.92, 0.58] as maplibregl.ExpressionSpecification
            : 0.72,
        },
      });

      map.addLayer({
        id: "em-stroke",
        type: "line",
        source: "em-parcels",
        paint: {
          "line-color": highlightPin
            ? ["case", ["==", ["get", "pin_normalized"], highlightPin], "#ffffff", "rgba(0,0,0,0.22)"] as maplibregl.ExpressionSpecification
            : "rgba(0,0,0,0.22)",
          "line-width": highlightPin
            ? ["case", ["==", ["get", "pin_normalized"], highlightPin], 2.5, 0.5] as maplibregl.ExpressionSpecification
            : 0.5,
        },
      });

      map.on("mousemove", "em-fill", (e) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = "pointer";
        const props = e.features[0].properties ?? {};
        const addr = (props.address as string | undefined) ?? "";
        const year = props.year_built as number | undefined;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:0.76rem;line-height:1.4;color:#f1f5f9"><strong style="color:#e2e8f0">${addr}</strong>${year ? `<br/><span style="color:#94a3b8">Built ${year}</span>` : ""}</div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "em-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      if (onSelectParcel) {
        map.on("click", "em-fill", (e) => {
          const props = e.features?.[0]?.properties ?? {};
          const pin = (props.pin_normalized ?? props.pin_original) as string | undefined;
          if (pin) onSelectParcel(pin);
        });
      }
    });

    return () => {
      popup.remove();
      map.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcels, highlightPin]);

  if (!parcels.length) return null;

  return (
    <div
      ref={containerRef}
      className={`embedded-map${className ? ` ${className}` : ""}`}
      style={{ height }}
    />
  );
}

function visitCoords(value: unknown, visit: (lng: number, lat: number) => void): void {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    visit(value[0] as number, value[1] as number);
    return;
  }
  value.forEach((item) => visitCoords(item, visit));
}
