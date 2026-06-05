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
  sale_count?: number | null;
  latest_sale_year?: number | null;
  latest_sale_price?: number | null;
  max_sale_price?: number | null;
  house_evolution_timeline?: HouseEvolutionEvent[] | string | null;
  permit_pressure_score?: number | null;
  permit_pressure_type?: PermitPressureType | null;
  permit_stability_type?: PermitStabilityType | null;
  recent_permit_count?: number | null;
  recent_teardown_count?: number | null;
  assessed_year_count?: number | null;
  first_assessed_year?: number | null;
  first_assessed_total?: number | null;
  latest_assessed_year?: number | null;
  latest_assessed_total?: number | null;
  assessed_value_change_pct?: number | null;
  appeal_count?: number | null;
  latest_appeal_year?: number | null;
  open_appeal_count?: number | null;
  total_assessment_reduction?: number | null;
  proximity_year?: number | null;
  nearest_park_name?: string | null;
  nearest_park_dist_ft?: number | null;
  nearest_metra_stop_name?: string | null;
  nearest_metra_stop_dist_ft?: number | null;
  nearest_bike_trail_name?: string | null;
  nearest_bike_trail_dist_ft?: number | null;
  foreclosure_count_half_mile_5yr?: number | null;
  foreclosure_per_1000_half_mile_5yr?: number | null;
  nearest_major_road_name?: string | null;
  nearest_major_road_dist_ft?: number | null;
  hargis_record_count?: number | null;
  hargis_refnum?: string | null;
  hargis_refnums?: string | null;
  hargis_name?: string | null;
  hargis_location?: string | null;
  hargis_nr_eval?: string | null;
  hargis_category?: string | null;
  hargis_arch_class?: string | null;
  hargis_current_function?: string | null;
  hargis_historic_function?: string | null;
  hargis_wall_materials?: string | null;
  hargis_architect?: string | null;
  hargis_builder?: string | null;
  hargis_begin_year?: number | null;
  hargis_end_year?: number | null;
  hargis_survey_date?: string | null;
  hargis_survey_year?: number | null;
  hargis_opinion_significance?: string | null;
  hargis_photo_count?: number | null;
  hargis_pdf_count?: number | null;
  hargis_photo_url?: string | null;
  hargis_pdf_url?: string | null;
  hargis_match_method?: string | null;
  hargis_records_json?: string | null;
};

export type HouseEvolutionEventType = "original_build" | "sale" | "permit" | "nearby_teardown" | "historic_survey";
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
  document_number?: string | null;
  price?: number | null;
  source?: string | null;
  pin?: string | null;
  is_nearby?: boolean;
  reference_number?: string | null;
};

export type ParcelFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, ParcelProperties>;
export type ParcelCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, ParcelProperties>;
