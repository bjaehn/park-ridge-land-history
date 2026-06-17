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
  parent_subdivision_id?: string | null;
  entity_type?: "subdivision" | "estate" | "parent_plat" | "plat" | "unknown" | null;
  geometry_status?: "not_started" | "needs_source" | "in_progress" | "complete" | "approximate" | null;
  created_at?: string;
  updated_at?: string;
};

// ─── Land lineage types ───────────────────────────────────────────────────────

/** One historical lot row sourced from a deed or legal description. */
export type LandLot = {
  id: string;
  subdivision_id: string;
  lot_number: string | null;
  block_number: string | null;
  document_date: string | null;
  source_type: string | null;
  notes: string | null;
  confidence_level: string;
  data_quality_flags: string[] | null;
};

/** Full lineage entry for one subdivision associated with a modern parcel. */
export type LandLineageEntry = {
  subdivision: {
    id: string;
    name: string;
    entity_type: string | null;
    recorded_year: number | null;
    confidence_level: string;
    geometry_status: string | null;
  };
  parent_subdivision: {
    id: string;
    name: string;
    entity_type: string | null;
  } | null;
  lots: LandLot[];
  lineage_records?: HistoricalSubdivisionLineage[];
};

export type HistoricalSubdivisionLineage = {
  id: string;
  lineage_key: string;
  address: string | null;
  pin: string | null;
  child_subdivision_id: string | null;
  parent_subdivision_id: string | null;
  child_subdivision: string;
  child_lot: string | null;
  child_block: string | null;
  parent_subdivision: string | null;
  parent_lot: string | null;
  parent_block: string | null;
  parent_portion: string | null;
  section: string | null;
  township: string | null;
  range: string | null;
  meridian: string | null;
  county: string | null;
  state: string | null;
  relationship_type: string;
  development_chain: string[] | null;
  plain_english_summary: string | null;
  development_interpretation: string | null;
  source_type: string;
  source_text: string;
  source_publication: string | null;
  source_document_number: string | null;
  source_recorded_date: string | null;
  source_page: string | null;
  source_url: string | null;
  confidence: SubdivisionConfidenceLevel;
  confidence_reason: string | null;
  needs_verification: boolean;
  verification_notes: string | null;
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
  | "parent_subdivision_id"
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

// ─── Historical context types ─────────────────────────────────────────────────

export type SubdivisionStatus =
  | "verified"
  | "partially_verified"
  | "research_candidate"
  | "needs_manual_review";

export type SourceReliabilityTier =
  | "primary"
  | "official"
  | "secondary"
  | "tertiary"
  | "research_lead";

/** Extended subdivision source with full ledger fields. */
export type SubdivisionSourceLedger = SubdivisionSource & {
  source_key?: string | null;
  title?: string | null;
  author_or_publisher?: string | null;
  publication_name?: string | null;
  publication_date?: string | null;
  page_ref?: string | null;
  column_ref?: string | null;
  archive_location?: string | null;
  access_notes?: string | null;
  reliability_tier?: SourceReliabilityTier | null;
};

export type SubdivisionAlias = {
  id: string;
  subdivision_id: string;
  alias: string;
  alias_type?: string | null;
  source_id?: string | null;
  confidence: SubdivisionConfidenceLevel;
  created_at?: string;
};

export type SubdivisionResearchTask = {
  id: string;
  subdivision_id?: string | null;
  search_query: string;
  target_archive?: string | null;
  reason?: string | null;
  expected_source_type?: string | null;
  status: "pending" | "in_progress" | "completed" | "abandoned";
  priority: "high" | "medium" | "low";
  notes?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

/** Timeline event extended with historical fact fields and optional embedded source. */
export type SubdivisionHistoricalFact = SubdivisionTimelineEvent & {
  fact_type?: string | null;
  direct_quote?: string | null;
  source_id?: string | null;
  source_page?: string | null;
  source_column?: string | null;
  addresses_mentioned?: string[] | null;
  streets_mentioned?: string[] | null;
  lot_block_references?: string | null;
  pin_references?: string[] | null;
  confidence_reason?: string | null;
  display_priority?: number | null;
  /** Embedded join result when queried with source:subdivision_sources(...) */
  source?: SubdivisionSourceLedger | null;
};

/** Full subdivision detail with all historical context. Extends SubdivisionWithDetail. */
export type SubdivisionFullDetail = SubdivisionWithDetail & {
  display_name?: string | null;
  slug?: string | null;
  development_era_start_year?: number | null;
  development_era_end_year?: number | null;
  historical_summary?: string | null;
  status?: SubdivisionStatus | null;
  facts?: SubdivisionHistoricalFact[];
  aliases?: SubdivisionAlias[];
  research_tasks?: SubdivisionResearchTask[];
};

// ─── Helper functions ─────────────────────────────────────────────────────────

export function statusLabel(status: SubdivisionStatus): string {
  const labels: Record<SubdivisionStatus, string> = {
    verified: "Verified",
    partially_verified: "Partially verified",
    research_candidate: "Research candidate",
    needs_manual_review: "Needs review",
  };
  return labels[status] ?? status;
}

export function statusDescription(status: SubdivisionStatus): string {
  const descriptions: Record<SubdivisionStatus, string> = {
    verified:
      "Recording date, plat boundary, and key facts have been confirmed from official primary sources.",
    partially_verified:
      "Some facts are confirmed by official records, but plat boundary, recording date, or other details remain unverified.",
    research_candidate:
      "This subdivision name has appeared in at least one source, but core details have not yet been verified.",
    needs_manual_review:
      "Source data contains inconsistencies or ambiguities that require manual review before public display.",
  };
  return descriptions[status];
}

export function reliabilityTierLabel(tier: SourceReliabilityTier): string {
  const labels: Record<SourceReliabilityTier, string> = {
    primary: "Primary source",
    official: "Official record",
    secondary: "Secondary source",
    tertiary: "Tertiary reference",
    research_lead: "Research lead",
  };
  return labels[tier] ?? tier;
}

export function factTypeIcon(factType: string): string {
  const map: Record<string, string> = {
    plat_recorded: "plat",
    legal_description: "plat",
    lots_for_sale: "sale",
    subdivision_advertised: "sale",
    infrastructure_petition: "infrastructure",
    annexation: "annexation",
    church_or_institutional_land: "institutional",
    farm: "farm",
    historic_survey: "survey",
    research_lead: "research",
    newspaper: "newspaper",
  };
  return map[factType] ?? "research";
}

export function confidencePlainText(level: SubdivisionConfidenceLevel): string {
  const labels: Record<SubdivisionConfidenceLevel, string> = {
    high: "Verified by official record",
    medium: "Supported by cited source",
    low: "Research lead, not yet verified",
    unknown: "Unknown",
  };
  return labels[level] ?? "Unknown";
}
