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
export const MAP_ZOOM_PROPERTY = 17;
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

export const PMTILES_URL = "/tiles/parcels.pmtiles";
export const GEOJSON_FALLBACK_URL = "/data/park_ridge_parcels_map.geojson";
export const BOUNDARY_URL = "/data/park_ridge_boundary.geojson";

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

// Ordered for legend display (matches construction timeline left-to-right)
export const ERA_ORDER = [
  "Pre-1900", "1900s", "1910s", "1920s", "1930s", "1940s", "1950s",
  "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s", "Unknown",
] as const;

// ---------------------------------------------------------------------------
// Map lenses (mutually exclusive coloring modes)
// The same set is offered on every map regardless of scope.
// ---------------------------------------------------------------------------

export type MapLens = "era" | "permits" | "sales" | "historic" | "subdivision";

export const MAP_LENSES: Array<{ id: MapLens; label: string; description: string }> = [
  {
    id: "era",
    label: "When it was built",
    description: "Parcels shaded by decade of construction.",
  },
  {
    id: "permits",
    label: "Permit activity",
    description: "Parcels shaded by number of building permits on record.",
  },
  {
    id: "sales",
    label: "Sales recency",
    description: "Parcels shaded by how recently they last sold.",
  },
  {
    id: "historic",
    label: "Historic survey matches",
    description: "Parcels that appear in the Hargis Illinois historic architecture survey.",
  },
  {
    id: "subdivision",
    label: "Subdivision origin",
    description: "Parcels shaded by the recorded plat that created their lot.",
  },
];

export const DEFAULT_LENS: MapLens = "era";

// ---------------------------------------------------------------------------
// MapLibre style (basemap + parcel layer spec)
// One style object, consumed by the single MapView component.
// No page overrides fonts, glyphs, or basemap.
// ---------------------------------------------------------------------------

export function buildMapStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "OpenStreetMap contributors",
        maxzoom: 19,
      },
      boundary: {
        type: "geojson",
        data: BOUNDARY_URL,
      },
      // Parcel source is added dynamically by MapView (PMTiles or GeoJSON fallback)
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm",
        paint: {
          "raster-opacity": 0.35,
          "raster-brightness-max": 0.3,
          "raster-saturation": -0.8,
        },
      },
      {
        id: "boundary-fill",
        type: "fill",
        source: "boundary",
        paint: {
          "fill-color": "#1a1a2e",
          "fill-opacity": 0.2,
        },
      },
      {
        id: "boundary-line",
        type: "line",
        source: "boundary",
        paint: {
          "line-color": "#8b7ff0",
          "line-width": 1.5,
          "line-opacity": 0.6,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Parcel layer paint spec (era lens, default)
// MapView applies this after adding the parcel source.
// ---------------------------------------------------------------------------

export function eraFillExpression(): unknown[] {
  const expr: unknown[] = ["match", ["get", "decade_built"]];
  for (const decade of ERA_ORDER) {
    expr.push(decade, ERA_PALETTE[decade]);
  }
  expr.push(ERA_PALETTE["Unknown"]); // fallback
  return expr;
}

// ---------------------------------------------------------------------------
// Parcel layer style constants (single definition)
// ---------------------------------------------------------------------------

export const PARCEL_FILL_OPACITY = 0.75;
export const PARCEL_FILL_OPACITY_HOVER = 0.92;
export const PARCEL_STROKE_COLOR = "#0f0f13";
export const PARCEL_STROKE_WIDTH = 0.5;
export const PARCEL_STROKE_COLOR_SELECTED = "#ffffff";
export const PARCEL_STROKE_WIDTH_SELECTED = 2.5;
export const PARCEL_FILL_COLOR_MUTED = "#2a2a38"; // for out-of-scope parcels
export const PARCEL_FILL_OPACITY_MUTED = 0.3;

// ---------------------------------------------------------------------------
// Map scope type (controls initial extent and emphasis)
// ---------------------------------------------------------------------------

export type MapScope =
  | { kind: "property"; pin: string; lat: number; lng: number }
  | { kind: "street"; streetName: string }
  | { kind: "neighborhood"; neighborhoodId: string }
  | { kind: "subdivision"; subdivisionId: string }
  | { kind: "city" };
