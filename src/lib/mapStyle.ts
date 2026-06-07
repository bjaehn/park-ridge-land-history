import type { StyleSpecification } from "maplibre-gl";

export const parkRidgeCenter: [number, number] = [-87.8417, 42.0111];

export const baseMapStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap contributors"
    }
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm"
    }
  ]
};

export type HistoricalLayerConfig = {
  id: string;
  label: string;
  enabled: boolean;
  tileUrl?: string;
  attribution?: string;
  note: string;
};

export const historicalLayerPlaceholders: HistoricalLayerConfig[] = [
  {
    id: "cook-1938-aerial",
    label: "1938/1939 aerial imagery",
    enabled: false,
    note: "Placeholder for georeferenced Cook County historical aerial tiles."
  }
];
