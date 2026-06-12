export type HistoryPeriodId = "pre_1939" | "1939_to_1963" | "1963_to_1980" | "1980_to_2000" | "2000_to_present";

export type SourceConfidence = "high" | "medium" | "low" | "unknown";

export type ReviewStatus = "unreviewed" | "machine_inferred" | "manually_reviewed" | "verified";

export type DateType = "observed_not_constructed" | "assessor_building_year" | "unknown";

export type EvidenceSource = {
  source_name: string;
  source_year?: number;
  evidence_type: "aerial_imagery" | "sanborn" | "topo" | "parcel_data" | "assessor_data" | "manual_review" | "placeholder";
  url_or_reference?: string;
  notes: string;
};

export type RoadSegmentHistoryProperties = {
  id: string;
  street_name: string;
  current_source: string;
  first_observed_year?: number | null;
  first_observed_period: HistoryPeriodId;
  last_checked_year: number;
  date_type: "observed_not_constructed";
  confidence: SourceConfidence;
  evidence: EvidenceSource[];
  review_status: ReviewStatus;
  sample_data?: boolean;
  notes: string;
};

export type RoadSegmentHistoryFeature = GeoJSON.Feature<
  GeoJSON.LineString | GeoJSON.MultiLineString,
  RoadSegmentHistoryProperties
>;

export type RoadSegmentHistoryCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString | GeoJSON.MultiLineString,
  RoadSegmentHistoryProperties
>;

export type ParcelHistoryRecord = {
  pin: string;
  current_address?: string | null;
  current_source: string;
  geometry_source: string;
  first_observed_period: HistoryPeriodId | "unknown";
  subdivision_confidence: SourceConfidence;
  building_year?: number | null;
  building_year_source?: string;
  evidence: EvidenceSource[];
  sample_data?: boolean;
  notes: string;
};

export type HistoricalOverlayMetadata = {
  id: string;
  name: string;
  year: number;
  period: HistoryPeriodId;
  source_type: "aerial" | "sanborn" | "topo" | "other";
  source_name: string;
  coverage_area: string;
  tile_url?: string;
  local_path?: string;
  georeferenced: boolean;
  confidence_notes: string;
  license_notes: string;
};

export type RoadParcelHistoryData = {
  generated_at: string;
  sample_data: boolean;
  road_segments: RoadSegmentHistoryCollection;
  parcel_history: ParcelHistoryRecord[];
  historical_overlays: HistoricalOverlayMetadata[];
};

export const historyPeriods: Array<{
  id: HistoryPeriodId;
  label: string;
  shortLabel: string;
  order: number;
  color: string;
}> = [
  { id: "pre_1939", label: "Pre-1939", shortLabel: "Oldest", order: 0, color: "#0f766e" },
  { id: "1939_to_1963", label: "1939-1963", shortLabel: "Early expansion", order: 1, color: "#2563eb" },
  { id: "1963_to_1980", label: "1963-1980", shortLabel: "Postwar buildout", order: 2, color: "#7c3aed" },
  { id: "1980_to_2000", label: "1980-2000", shortLabel: "Late infill", order: 3, color: "#db2777" },
  { id: "2000_to_present", label: "2000-Present", shortLabel: "Recent", order: 4, color: "#f97316" }
];

export const unknownRoadHistoryColor = "#64748b";

export function periodOrder(period: HistoryPeriodId): number {
  return historyPeriods.find((item) => item.id === period)?.order ?? Number.MAX_SAFE_INTEGER;
}

export function periodLabel(period: HistoryPeriodId | "unknown"): string {
  if (period === "unknown") return "Unknown";
  return historyPeriods.find((item) => item.id === period)?.label ?? period;
}

export function roadHistoryColor(period: HistoryPeriodId): string {
  return historyPeriods.find((item) => item.id === period)?.color ?? unknownRoadHistoryColor;
}

export function filterRoadHistoryByPeriod(
  collection: RoadSegmentHistoryCollection | null,
  selectedPeriod: HistoryPeriodId
): RoadSegmentHistoryCollection {
  if (!collection) return { type: "FeatureCollection", features: [] };
  const selectedOrder = periodOrder(selectedPeriod);
  return {
    ...collection,
    features: collection.features.filter((feature) => periodOrder(feature.properties.first_observed_period) <= selectedOrder)
  };
}
