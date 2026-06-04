export type DecadeBucket =
  | "Pre-1900"
  | "1900s"
  | "1910s"
  | "1920s"
  | "1930s"
  | "1940s"
  | "1950s"
  | "1960s"
  | "1970s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "2010s"
  | "2020s"
  | "Unknown"
  | "Suspicious";

export type ParcelProperties = {
  pin_normalized?: string | null;
  pin_original?: string | null;
  address?: string | null;
  municipality?: string | null;
  property_class?: string | null;
  year_built?: number | null;
  decade_built?: DecadeBucket | string | null;
  building_sqft?: number | null;
  land_sqft?: number | null;
  improvement_count?: number | null;
  primary_building_selection_method?: string | null;
  data_quality_flags?: string[] | string | null;
  source_note?: string | null;
  synthetic_sample?: boolean;
  permit_count?: number | null;
  latest_permit_year?: number | null;
  nearby_teardown_count?: number | null;
  house_evolution_timeline?: HouseEvolutionEvent[] | string | null;
  permit_pressure_score?: number | null;
  permit_pressure_type?: PermitPressureType | null;
  permit_stability_type?: PermitStabilityType | null;
  recent_permit_count?: number | null;
  recent_teardown_count?: number | null;
};

export type HouseEvolutionEventType = "original_build" | "permit" | "nearby_teardown";
export type PermitPressureType =
  | "none"
  | "recent_permit"
  | "remodel"
  | "addition"
  | "new_construction"
  | "direct_teardown"
  | "nearby_teardown";
export type PermitStabilityType = "stable" | "watch" | "changing" | "teardown_pressure";

export type HouseEvolutionEvent = {
  year?: number | null;
  date?: string | null;
  title: string;
  description?: string | null;
  event_type: HouseEvolutionEventType;
  status?: string | null;
  permit_number?: string | null;
  source?: string | null;
  pin?: string | null;
  is_nearby?: boolean;
};

export type ParcelFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, ParcelProperties>;
export type ParcelCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, ParcelProperties>;
