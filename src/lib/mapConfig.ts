/**
 * Single map configuration for Park Ridge Land History.
 *
 * All maps in the product render through one MapView component
 * that reads this config. No page may override colors, stroke,
 * fonts, control positions, or basemap. The only thing that
 * varies between a property, street, neighborhood, and city map
 * is the `scope` prop passed to MapView (which controls extent
 * and which parcels are emphasized).
 */

import type { StyleSpecification } from "maplibre-gl";

// ---------------------------------------------------------------------------
// Map center and defaults
// ---------------------------------------------------------------------------

export const MAP_CENTER: [number, number] = [-87.8417, 42.0111];
export const MAP_ZOOM_DEFAULT = 13;
export const MAP_ZOOM_PROPERTY = 18;
export const MAP_ZOOM_STREET = 15;
export const MAP_ZOOM_NEIGHBORHOOD = 13;
export const MAP_ZOOM_SUBDIVISION = 14;
export const MAP_ZOOM_CITY = 12;

// ---------------------------------------------------------------------------
// Tile sources
// PMTiles file served as a static asset from /tiles/parcels.pmtiles
// Generated at build time via tippecanoe (see data:tiles npm script).
// Falls back to full GeoJSON if PMTiles not present.
// ---------------------------------------------------------------------------

export const PMTILES_URL = process.env.NEXT_PUBLIC_PMTILES_URL ?? "";
export const GEOJSON_FALLBACK_URL = "/data/park_ridge_parcels_map.geojson";
export const BOUNDARY_URL = "/data/park_ridge_boundary.geojson";
export const BUILDINGS_GEOJSON_URL = "/data/park_ridge_building_footprints.geojson";
export const GIS_BUILDINGS_STROKE_COLOR = "#ffffff";
export const GIS_BUILDINGS_STROKE_WIDTH = 0.9;
export const GIS_BUILDINGS_STROKE_OPACITY = 0.55;

// ---------------------------------------------------------------------------
// Basemap tile URLs - CARTO raster tiles (no API key required)
// Structure: base layer (no labels) → parcel layers → labels overlay
// ---------------------------------------------------------------------------

export const BASEMAP_CONFIGS = {
  dark: {
    base: "https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
    rasterOpacity: 1.0,
    labelsOpacity: 0.85,
  },
  light: {
    base: "https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    rasterOpacity: 1.0,
    labelsOpacity: 0.9,
  },
  satellite: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labels: "https://basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
    rasterOpacity: 1.0,
    labelsOpacity: 0.9,
  },
} as const;

export type BasemapMode = keyof typeof BASEMAP_CONFIGS;

// ---------------------------------------------------------------------------
// Era/decade color scale (single definition; MapLegend reads from here)
// All maps use these same colors for build-era shading.
// ---------------------------------------------------------------------------

export const ERA_PALETTE: Record<string, string> = {
  "Pre-1900": "#4c3b4d",
  "1900s":    "#6b4e71",
  "1910s":    "#785f9a",
  "1920s":    "#6d7eb8",
  "1930s":    "#4f9db8",
  "1940s":    "#4fb6a8",
  "1950s":    "#68bd7d",
  "1960s":    "#9ac35d",
  "1970s":    "#d0bd4d",
  "1980s":    "#e6a64a",
  "1990s":    "#df8252",
  "2000s":    "#c96a70",
  "2010s":    "#a85f84",
  "2020s":    "#6d617c",
  "Unknown":  "#9ca3af",
};

export function getEraColor(year: number | null | undefined): string | undefined {
  if (!year) return undefined;
  const decade = year < 1900 ? "Pre-1900" : `${Math.floor(year / 10) * 10}s`;
  return ERA_PALETTE[decade] ?? ERA_PALETTE["Unknown"];
}

// Ordered for legend display (matches construction timeline left-to-right)
export const ERA_ORDER = [
  "Pre-1900", "1900s", "1910s", "1920s", "1930s", "1940s", "1950s",
  "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s", "Unknown",
] as const;

// ---------------------------------------------------------------------------
// Neighborhood color palette (for "neighborhood" lens - uses neighborhood_id)
// ---------------------------------------------------------------------------

export const NEIGHBORHOOD_PALETTE: Record<string, string> = {
  "neighborhood:central":   "#4fb6a8",
  "neighborhood:northeast": "#9ac35d",
  "neighborhood:northwest": "#785f9a",
  "neighborhood:south":     "#e6a64a",
  "neighborhood:uptown":    "#df8252",
};

// ---------------------------------------------------------------------------
// Map lenses (mutually exclusive coloring modes)
// ---------------------------------------------------------------------------

export type MapLens = "era" | "permits" | "neighborhood" | "sales" | "subdivision";

export const MAP_LENSES: Array<{ id: MapLens; label: string; description: string; hasData: boolean }> = [
  {
    id: "era",
    label: "Era",
    description: "Parcels shaded by decade of construction.",
    hasData: true,
  },
  {
    id: "permits",
    label: "Permits",
    description: "Parcels shaded by number of building permits on record.",
    hasData: true,
  },
  {
    id: "neighborhood",
    label: "Neighborhood",
    description: "Parcels shaded by neighborhood area.",
    hasData: true,
  },
  {
    id: "sales",
    label: "Sales",
    description: "Parcels shaded by how recently they last sold.",
    hasData: false,
  },
  {
    id: "subdivision",
    label: "Plat",
    description: "Parcels shaded by recorded plat origin.",
    hasData: false,
  },
];

export const DEFAULT_LENS: MapLens = "era";

// ---------------------------------------------------------------------------
// Lens paint expressions - returned as MapLibre expression arrays
// ---------------------------------------------------------------------------

export function eraFillExpression(): unknown[] {
  const expr: unknown[] = ["match", ["get", "decade_built"]];
  for (const decade of ERA_ORDER) {
    expr.push(decade, ERA_PALETTE[decade]);
  }
  expr.push(ERA_PALETTE["Unknown"]);
  return expr;
}

export function permitFillExpression(): unknown[] {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "permit_count"], 0],
    0, "#1f2937",
    1, "#78350f",
    2, "#b45309",
    3, "#ea580c",
    5, "#dc2626",
    10, "#9b1c1c",
  ];
}

export function neighborhoodFillExpression(): unknown[] {
  const expr: unknown[] = ["match", ["get", "neighborhood_id"]];
  for (const [id, color] of Object.entries(NEIGHBORHOOD_PALETTE)) {
    expr.push(id, color);
  }
  expr.push("#374151");
  return expr;
}

export function getLensFillExpression(lens: MapLens): unknown[] | null {
  switch (lens) {
    case "era":          return eraFillExpression();
    case "permits":      return permitFillExpression();
    case "neighborhood": return neighborhoodFillExpression();
    default:             return null; // lenses without data in map tiles
  }
}

// ---------------------------------------------------------------------------
// MapLibre style (basemap + parcel layer spec)
// Parcel source is added dynamically by MapView (PMTiles or GeoJSON fallback).
// Labels overlay is also added dynamically (after parcel layers).
// ---------------------------------------------------------------------------

export function buildMapStyle(basemap: BasemapMode = "dark"): StyleSpecification {
  const cfg = BASEMAP_CONFIGS[basemap];
  return {
    version: 8,
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    sources: {
      "osm-base": {
        type: "raster",
        tiles: [cfg.base],
        tileSize: 256,
        attribution: "© CARTO, © OpenStreetMap contributors",
        maxzoom: 19,
      },
      "osm-labels": {
        type: "raster",
        tiles: [cfg.labels],
        tileSize: 256,
        attribution: "",
        maxzoom: 19,
      },
      boundary: {
        type: "geojson",
        data: BOUNDARY_URL,
      },
    },
    layers: [
      {
        id: "base-tiles",
        type: "raster",
        source: "osm-base",
        paint: {
          "raster-opacity": cfg.rasterOpacity,
        },
      },
      // Boundary: glow (wide blurred) + crisp inner line; no fill
      {
        id: "boundary-glow",
        type: "line",
        source: "boundary",
        paint: {
          "line-color": "#8b7ff0",
          "line-width": 6,
          "line-opacity": 0.15,
          "line-blur": 3,
        },
      },
      {
        id: "boundary-line",
        type: "line",
        source: "boundary",
        paint: {
          "line-color": "#8b7ff0",
          "line-width": 1.5,
          "line-opacity": 0.7,
        },
      },
      // Parcel source and labels-overlay are added dynamically by MapView
    ],
  };
}

// ---------------------------------------------------------------------------
// Parcel layer style constants (single definition)
// ---------------------------------------------------------------------------

export const PARCEL_FILL_OPACITY = 0.88;
export const PARCEL_FILL_OPACITY_HOVER = 0.97;
export const PARCEL_STROKE_COLOR = "#000000";
export const PARCEL_STROKE_WIDTH = 0.8;
export const PARCEL_STROKE_COLOR_SELECTED = "#ffffff";
export const PARCEL_STROKE_WIDTH_SELECTED = 3;
export const PARCEL_FILL_COLOR_MUTED = "#1a1a28";
export const PARCEL_FILL_OPACITY_MUTED = 0.15;

// ---------------------------------------------------------------------------
// Map scope type (controls initial extent and emphasis)
// ---------------------------------------------------------------------------

export type MapScope =
  | { kind: "property"; pin: string; bbox?: [number, number, number, number]; lat?: number; lng?: number }
  | { kind: "street"; streetName: string; bbox?: [number, number, number, number] }
  | { kind: "neighborhood"; neighborhoodId: string; pins?: string[]; bbox?: [number, number, number, number] }
  | { kind: "subdivision"; subdivisionId: string; pins?: string[]; bbox?: [number, number, number, number] }
  | { kind: "city" };

// ---------------------------------------------------------------------------
// Era filter range (for the year-range slider)
// ---------------------------------------------------------------------------

export const ERA_FILTER_MIN = 1880;
export const ERA_FILTER_MAX = 2025;
