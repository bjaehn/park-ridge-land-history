/**
 * Single source of truth for presenting the lowercase "high|medium|low|unknown"
 * confidence taxonomy shared by subdivisions, historical facts, and the
 * subdivisions index list. This is a *different* taxonomy from formatters.ts's
 * ConfidenceLevel ("High"|"Medium"|"Low", no unknown), which is specific to
 * property-level confidence and shown via ConfidenceBadge -- do not conflate
 * the two; see app/sources/page.tsx for how both are explained to users.
 *
 * Before this file existed, four files (subdivisionTypes.ts,
 * HistoricalFactsPanel.tsx, SubdivisionHistoryPanel.tsx,
 * app/subdivisions/_SubdivisionsContent.tsx) each independently declared their
 * own near-identical dot-class/text-class/plain-text functions for this exact
 * taxonomy.
 */

export type GenericConfidenceLevel = "high" | "medium" | "low" | "unknown";

function normalize(level: string | null | undefined): GenericConfidenceLevel {
  if (level === "high" || level === "medium" || level === "low") return level;
  return "unknown";
}

export function confidenceDotClassFor(level: string | null | undefined): string {
  switch (normalize(level)) {
    case "high":
      return "bg-confidence-high";
    case "medium":
      return "bg-confidence-medium";
    case "low":
      return "bg-confidence-low";
    default:
      return "bg-confidence-unknown";
  }
}

export function confidenceTextClassFor(level: string | null | undefined): string {
  switch (normalize(level)) {
    case "high":
      return "text-confidence-high";
    case "medium":
      return "text-confidence-medium";
    case "low":
      return "text-confidence-low";
    default:
      return "text-confidence-unknown";
  }
}

const LABELS: Record<GenericConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unknown",
};

/** Capitalized single-word label, e.g. for inline "Confidence: {label}" text. */
export function confidenceLabelFor(level: string | null | undefined): string {
  return LABELS[normalize(level)];
}

const SHORT_LABELS: Record<GenericConfidenceLevel, string> = {
  high: "Verified",
  medium: "Sourced",
  low: "Research lead",
  unknown: "Unknown source",
};

/** Short badge word, e.g. for compact filter chips. */
export function confidenceShortLabelFor(level: string | null | undefined): string {
  return SHORT_LABELS[normalize(level)];
}

const PLAIN_TEXT: Record<GenericConfidenceLevel, string> = {
  high: "Verified by official record",
  medium: "Supported by cited source",
  low: "Research lead, not yet verified",
  unknown: "Unknown",
};

/**
 * Full-sentence plain-language label. `overrides` lets a domain swap in its
 * own wording for specific levels (e.g. historical facts read "Verified by
 * cited source" for high, since a fact is corroborated by a citation rather
 * than an official record) without duplicating the other three strings.
 */
export function confidencePlainTextFor(
  level: string | null | undefined,
  overrides?: Partial<Record<GenericConfidenceLevel, string>>
): string {
  const normalized = normalize(level);
  return overrides?.[normalized] ?? PLAIN_TEXT[normalized];
}
