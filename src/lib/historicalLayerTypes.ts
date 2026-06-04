export type HistoricalLayerType =
  | "vector"
  | "raster"
  | "raster_tile"
  | "image_overlay"
  | "georeferenced_map_sheet"
  | "document_reference"
  | "placeholder";

export type HistoricalLayerStatus =
  | "ready"
  | "available"
  | "needs_download"
  | "needs_georeferencing"
  | "needs_tiling"
  | "manual_research_required"
  | "blocked"
  | "future";

export type HistoricalLayerGroup =
  | "parcel_boundaries"
  | "subdivision_plats"
  | "aerial_imagery"
  | "local_history"
  | "built_environment"
  | "survey_grid"
  | "sanborn"
  | "reference";

export type HistoricalLayerRenderMode =
  | "line"
  | "change_candidates"
  | "parcel_heat"
  | "footprint"
  | "highlight";

export type HistoricalLayer = {
  id: string;
  name: string;
  description: string;
  type: HistoricalLayerType;
  status: HistoricalLayerStatus;
  year?: number;
  yearRange?: [number, number];
  sourceName: string;
  sourceUrl?: string;
  attribution: string;
  historicalQuestion: string;
  layerGroup: HistoricalLayerGroup;
  dataPath?: string;
  tileUrl?: string;
  bounds?: [number, number, number, number];
  opacityDefault?: number;
  renderMode?: HistoricalLayerRenderMode;
  enabledDefault?: boolean;
  requiresGeoreferencing?: boolean;
  notes?: string;
  syntheticSample?: boolean;
};

export type HistoricalLayerManifest = {
  generatedAt?: string;
  layers: HistoricalLayer[];
};

export type LoadedHistoricalLayer = {
  layer: HistoricalLayer;
  data?: GeoJSON.FeatureCollection;
  opacity: number;
  loadError?: string;
};

export const historicalLayerGroupLabels: Record<HistoricalLayerGroup, string> = {
  parcel_boundaries: "Parcel Boundaries",
  subdivision_plats: "Subdivision Plats",
  aerial_imagery: "Aerial Imagery",
  local_history: "Local History",
  built_environment: "Built Environment",
  survey_grid: "Survey Grid",
  sanborn: "Sanborn / Historic Maps",
  reference: "Reference"
};

export const historicalLayerStatusLabels: Record<HistoricalLayerStatus, string> = {
  ready: "Ready",
  available: "Available",
  needs_download: "Needs download",
  needs_georeferencing: "Needs georeferencing",
  needs_tiling: "Needs tiling",
  manual_research_required: "Manual research required",
  blocked: "Blocked",
  future: "Future"
};

export function layerCanToggle(layer: HistoricalLayer): boolean {
  return Boolean((layer.status === "ready" || layer.status === "available") && (layer.dataPath || layer.tileUrl));
}

export function layerNeedsOpacity(layer: HistoricalLayer): boolean {
  return ["raster", "raster_tile", "image_overlay", "georeferenced_map_sheet", "vector"].includes(layer.type);
}
