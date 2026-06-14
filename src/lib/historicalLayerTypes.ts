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
  parcel_boundaries: "Property Boundary History",
  subdivision_plats: "Original Plat Lots",
  aerial_imagery: "Aerial Views by Year",
  local_history: "Local Surveys and Context",
  built_environment: "Built Context",
  survey_grid: "Survey Reference Grid",
  sanborn: "Historical Fire Maps",
  reference: "Reference"
};

export const historicalLayerGroupCaveats: Record<HistoricalLayerGroup, { canShow: string; cannotProve: string }> = {
  parcel_boundaries: {
    canShow: "How parcel boundaries compared across recorded tax years (2000 and 2021), and which parcels are spatial candidates for boundary changes between those years.",
    cannotProve: "Why any boundary changed, or whether a change reflects a legal subdivision event. Candidate changes need verification against recorded plats and deeds before drawing conclusions."
  },
  subdivision_plats: {
    canShow: "The original lot and block layout from recorded subdivision plats, once that data is added.",
    cannotProve: "Current ownership, building age, or whether a lot was developed per the original plat layout."
  },
  aerial_imagery: {
    canShow: "Physical development and land cover visible from the air at a given point in time.",
    cannotProve: "Parcel ownership, permit history, or the reason for any visible physical change."
  },
  local_history: {
    canShow: "Properties that appear in a state historic architecture survey (HARGIS) — meaning they were formally documented for historical significance.",
    cannotProve: "Whether a property is officially landmark-designated, or that un-surveyed properties lack historical significance. HARGIS coverage is incomplete for Park Ridge."
  },
  built_environment: {
    canShow: "Contextual information about what was built in an area and when, once data layers are added.",
    cannotProve: "Whether a specific building still exists or that the record reflects current conditions."
  },
  survey_grid: {
    canShow: "The Public Land Survey System (PLSS) township and section framework that underlies property geography.",
    cannotProve: "Legal property boundaries or current ownership."
  },
  sanborn: {
    canShow: "Building footprints, construction materials, addresses, and land use as documented on historical fire insurance maps.",
    cannotProve: "Whether any documented building still stands, or that all buildings in an area were captured by the surveyor."
  },
  reference: {
    canShow: "Geographic reference context for spatial interpretation.",
    cannotProve: "Historical property status or ownership."
  }
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
