/**
 * Types for the Subdivision History feature.
 *
 * All fields are optional to support partial data. The confidence model
 * ensures the UI shows what is known vs. unknown.
 */

export type SubdivisionConfidenceLevel = "high" | "medium" | "low" | "unknown";

export type Subdivision = {
  id: string;
  name: string;
  normalized_name: string;
  alternate_names?: string[] | null;
  recorded_date?: string | null;
  recorded_year?: number | null;
  plat_book?: string | null;
  plat_page?: string | null;
  document_number?: string | null;
  original_owner?: string | null;
  developer?: string | null;
  surveyor?: string | null;
  source_name?: string | null;
  source_reference?: string | null;
  source_url?: string | null;
  confidence_level: SubdivisionConfidenceLevel;
  confidence_reason?: string | null;
  notes?: string | null;
  parcel_count?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type SubdivisionSource = {
  id: string;
  subdivision_id?: string | null;
  source_type?: string | null;
  source_name: string;
  source_reference?: string | null;
  source_url?: string | null;
  retrieved_at?: string | null;
  notes?: string | null;
};

export type SubdivisionTimelineEvent = {
  id: string;
  subdivision_id: string;
  event_year?: number | null;
  event_date?: string | null;
  event_type: string;
  title: string;
  description?: string | null;
  source_name?: string | null;
  source_reference?: string | null;
  confidence_level: SubdivisionConfidenceLevel;
};

export type PropertySubdivisionLink = {
  id: string;
  pin?: string | null;
  address?: string | null;
  subdivision_id?: string | null;
  lot_number?: string | null;
  block_number?: string | null;
  match_method: string;
  confidence_level: SubdivisionConfidenceLevel;
  confidence_reason?: string | null;
  source_name?: string | null;
  source_reference?: string | null;
};

/** Subdivision record with timeline events and sources. Used on detail pages. */
export type SubdivisionWithDetail = Subdivision & {
  timeline_events?: SubdivisionTimelineEvent[];
  sources?: SubdivisionSource[];
};

/** Compact summary used on index page cards. */
export type SubdivisionSummary = Pick<
  Subdivision,
  | "id"
  | "name"
  | "normalized_name"
  | "recorded_year"
  | "confidence_level"
  | "confidence_reason"
  | "source_name"
  | "original_owner"
  | "developer"
  | "parcel_count"
  | "notes"
>;

/** Result of looking up subdivision for a property. */
export type PropertySubdivisionDNA = {
  subdivision: Subdivision | null;
  link: PropertySubdivisionLink | null;
  confidence: SubdivisionConfidenceLevel;
  confidenceReason: string | null;
  isLoading: boolean;
  error: string | null;
};

/** QA stats from the subdivision_qa_stats() RPC. */
export type SubdivisionQAStats = {
  total_subdivisions: number;
  with_recorded_year: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  unknown_confidence: number;
  total_links: number;
  linked_parcels: number;
  parcels_with_subdivision: number;
  parcels_without_subdivision: number;
  total_lots: number;
};

/** Maps a SubdivisionConfidenceLevel to a ConfidenceLevel used by ConfidenceBadge. */
export function toConfidenceBadgeLevel(
  level: SubdivisionConfidenceLevel
): "high" | "medium" | "limited" {
  if (level === "high") return "high";
  if (level === "medium") return "medium";
  return "limited";
}

export function confidenceLevelLabel(level: SubdivisionConfidenceLevel): string {
  return { high: "High", medium: "Medium", low: "Low", unknown: "Unknown" }[level] ?? "Unknown";
}

export function confidenceLevelDescription(level: SubdivisionConfidenceLevel): string {
  const descriptions: Record<SubdivisionConfidenceLevel, string> = {
    high: "Subdivision name and date verified from an official recorded plat or official Cook County GIS lot layer.",
    medium: "Subdivision name from Cook County GIS or official assessor records. Recording date not confirmed.",
    low: "Subdivision name inferred from spatial location or historical map. Not verified against recorded plat.",
    unknown: "No subdivision match has been found yet for this property.",
  };
  return descriptions[level];
}

export function subdivisionPath(id: string): string {
  return `/subdivisions/${encodeURIComponent(id)}`;
}

export function recordedYearDisplay(year: number | null | undefined): string {
  if (!year) return "Recording date unknown";
  return `Recorded ${year}`;
}
