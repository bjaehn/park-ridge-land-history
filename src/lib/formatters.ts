/**
 * Single source of truth for all display formatting in Park Ridge Land History.
 *
 * Rules:
 * - Every formatter handles null/undefined gracefully
 * - No em dashes, no en-dash separators
 * - No internal jargon leaks (no "Suspicious", no field names)
 * - Decade labels come only from formatDecade (prevents "1950ss" and "1900ss" bugs)
 * - compareToScope owns the full sentence including prepositions (no "the this" bug)
 */

// ---------------------------------------------------------------------------
// Basic value formatters
// ---------------------------------------------------------------------------

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatYear(value?: number | string | null): string {
  if (!value) return "Unknown";
  const n = Number(value);
  if (Number.isNaN(n) || n < 1800 || n > 2100) return "Unknown";
  return String(Math.round(n));
}

export function formatPercent(value?: number | null, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  return `${value.toFixed(decimals)}%`;
}

export function formatSqft(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  return `${formatNumber(Math.round(value))} sq ft`;
}

// ---------------------------------------------------------------------------
// Pluralization
// Fixes: "1 permits", "1 sales", "1 homes"
// ---------------------------------------------------------------------------

export function formatCount(n: number, singular: string, plural: string): string {
  return `${formatNumber(n)} ${n === 1 ? singular : plural}`;
}

// ---------------------------------------------------------------------------
// Decade formatting
// Fixes: "1950ss", "1900ss" bugs by being the single place the suffix is added.
// Input may be a full decade string ("1950s"), a raw year (1952), or a decade
// number (1950). Output is always "{decade}s" or a safe fallback.
// ---------------------------------------------------------------------------

export function formatDecade(value?: string | number | null): string {
  if (value === null || value === undefined) return "Unknown";

  const s = String(value).trim();

  // Already formatted like "1950s" or "Pre-1900" -- return as-is (strip extra 's')
  if (/^Pre-1900$/i.test(s)) return "Pre-1900";
  if (/^\d{4}s$/.test(s)) return s;           // e.g. "1950s" -- already correct
  if (/^\d{4}ss$/.test(s)) return s.slice(0, -1); // e.g. "1950ss" -- strip one s

  // Numeric year: derive the decade
  const n = parseInt(s, 10);
  if (!Number.isNaN(n)) {
    if (n < 1900) return "Pre-1900";
    const decadeStart = Math.floor(n / 10) * 10;
    return `${decadeStart}s`;
  }

  // Unrecognized: hide internal flags like "Suspicious"
  return "Unknown";
}

// ---------------------------------------------------------------------------
// Address formatting
// ---------------------------------------------------------------------------

const STREET_TYPE_ABBRS: Record<string, string> = {
  AVE: "Ave",
  AVENUE: "Ave",
  BLVD: "Blvd",
  BOULEVARD: "Blvd",
  CIR: "Cir",
  CIRCLE: "Cir",
  CT: "Ct",
  COURT: "Ct",
  DR: "Dr",
  DRIVE: "Dr",
  LN: "Ln",
  LANE: "Ln",
  PL: "Pl",
  PLACE: "Pl",
  RD: "Rd",
  ROAD: "Rd",
  ST: "St",
  STREET: "St",
  TER: "Ter",
  TERRACE: "Ter",
  WAY: "Way",
};

const DIRECTIONAL_ABBRS = new Set(["N", "S", "E", "W", "NE", "NW", "SE", "SW"]);

export function formatAddress(raw?: string | null): string {
  if (!raw) return "Address not on record";
  const words = raw.trim().toUpperCase().split(/\s+/);
  const formatted = words.map((word, i) => {
    if (i === 0 && /^\d+$/.test(word)) return word; // house number stays numeric
    if (DIRECTIONAL_ABBRS.has(word)) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if (STREET_TYPE_ABBRS[word]) return STREET_TYPE_ABBRS[word];
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return formatted.join(" ");
}

// ---------------------------------------------------------------------------
// Era label (for narrative use, not breadcrumbs)
// ---------------------------------------------------------------------------

export function eraLabel(medianYear: number): string {
  if (medianYear < 1920) return "Early Park Ridge";
  if (medianYear < 1945) return "Pre-war era";
  if (medianYear < 1962) return "Postwar boom";
  if (medianYear < 1978) return "Mid-century";
  if (medianYear < 2000) return "Late 20th century";
  return "Modern era";
}

// ---------------------------------------------------------------------------
// Comparison scope sentences
// Fixes: "than the this block" and all related grammar bugs.
//
// The function owns the FULL phrase. Scope articles and prepositions are
// baked in here so callers cannot produce a broken sentence.
// ---------------------------------------------------------------------------

export type ComparisonScope = "street" | "neighborhood" | "city";
export type ComparisonMetric = "year_built" | "permit_count" | "sale_count" | "assessed_value";

const SCOPE_LABEL: Record<ComparisonScope, { phrase: string; prep: string }> = {
  street:       { phrase: "this street",        prep: "on" },
  neighborhood: { phrase: "this neighborhood",  prep: "in" },
  city:         { phrase: "Park Ridge",         prep: "in" },
};

export function compareToScope(
  propertyValue: number | null,
  referenceValue: number | null,
  scope: ComparisonScope,
  metric: ComparisonMetric
): string {
  const { phrase, prep } = SCOPE_LABEL[scope];

  if (propertyValue === null || propertyValue === undefined) {
    return `No data to compare to homes ${prep} ${phrase}.`;
  }
  if (referenceValue === null || referenceValue === undefined) {
    return `Not enough comparable homes ${prep} ${phrase}.`;
  }

  if (metric === "year_built") {
    const diff = Math.abs(propertyValue - referenceValue);
    const direction = propertyValue < referenceValue ? "before" : "after";
    if (diff <= 5) {
      return `Built around the same time as most homes ${prep} ${phrase}.`;
    }
    return `Built about ${diff} years ${direction} the typical home ${prep} ${phrase}.`;
  }

  if (metric === "permit_count") {
    const ratio = referenceValue > 0 ? propertyValue / referenceValue : 1;
    if (ratio >= 1.5) return `More permit activity than most homes ${prep} ${phrase}.`;
    if (ratio <= 0.5) return `Less permit activity than most homes ${prep} ${phrase}.`;
    return `Similar permit activity to most homes ${prep} ${phrase}.`;
  }

  if (metric === "sale_count") {
    const ratio = referenceValue > 0 ? propertyValue / referenceValue : 1;
    if (ratio >= 1.5) return `Changed hands more often than most homes ${prep} ${phrase}.`;
    if (ratio <= 0.5) return `Changed hands less often than most homes ${prep} ${phrase}.`;
    return `Changed hands about as often as most homes ${prep} ${phrase}.`;
  }

  if (metric === "assessed_value") {
    const ratio = referenceValue > 0 ? propertyValue / referenceValue : 1;
    if (ratio >= 1.25) return `Assessed above the typical home ${prep} ${phrase}.`;
    if (ratio <= 0.75) return `Assessed below the typical home ${prep} ${phrase}.`;
    return `Assessed near the typical home ${prep} ${phrase}.`;
  }

  return `Compared to homes ${prep} ${phrase}.`;
}

// ---------------------------------------------------------------------------
// Change signal
// Single function, single config. All callers read this output.
// No entity may show a different signal than what this returns.
// ---------------------------------------------------------------------------

export type ChangeSignal = "Dormant" | "Reinvestment" | "Turnover" | "Rebuild pressure";

const SIGNAL_CONFIG = {
  rebuildPermitThreshold: 3,
  rebuildTeardownThreshold: 1,
  reinvestmentPermitThreshold: 2,
  turnoverSaleThreshold: 4,
  dormantMaxPermits: 1,
  dormantMaxSales: 2,
} as const;

type SignalInput = {
  permit_count?: number | null;
  recent_teardown_count?: number | null;
  sale_count?: number | null;
  recent_permit_count?: number | null;
};

export function getChangeSignal(props: SignalInput): ChangeSignal {
  const permits = props.permit_count ?? 0;
  const teardowns = props.recent_teardown_count ?? 0;
  const sales = props.sale_count ?? 0;
  const recentPermits = props.recent_permit_count ?? 0;

  if (teardowns >= SIGNAL_CONFIG.rebuildTeardownThreshold ||
      recentPermits >= SIGNAL_CONFIG.rebuildPermitThreshold) {
    return "Rebuild pressure";
  }
  if (permits >= SIGNAL_CONFIG.reinvestmentPermitThreshold) {
    return "Reinvestment";
  }
  if (sales >= SIGNAL_CONFIG.turnoverSaleThreshold) {
    return "Turnover";
  }
  return "Dormant";
}

export const SIGNAL_DESCRIPTION: Record<ChangeSignal, string> = {
  Dormant: "Low permit and sales activity. Stable or unchanged.",
  Reinvestment: "Multiple permits suggest ongoing improvement.",
  Turnover: "Has changed ownership frequently.",
  "Rebuild pressure": "Recent teardown activity or high permit concentration nearby.",
};

// ---------------------------------------------------------------------------
// Confidence model
// Single function. All callers read this output.
// ---------------------------------------------------------------------------

export type ConfidenceLevel = "High" | "Medium" | "Low";

type ConfidenceInput = {
  year_built?: number | null;
  data_quality_flags?: string[] | string | null;
  source_note?: string | null;
  improvement_count?: number | null;
};

export function confidenceFor(props: ConfidenceInput): ConfidenceLevel {
  const flags = Array.isArray(props.data_quality_flags)
    ? props.data_quality_flags
    : typeof props.data_quality_flags === "string" && props.data_quality_flags
      ? [props.data_quality_flags]
      : [];

  // Any quality flag degrades confidence
  if (flags.length > 0) return "Low";

  // Unknown year built is a key uncertainty
  if (!props.year_built) return "Low";

  // Multiple improvements make primary-building selection uncertain
  if ((props.improvement_count ?? 0) > 3) return "Medium";

  // Has a source note (human-verified or well-sourced)
  if (props.source_note) return "High";

  return "Medium";
}

export const CONFIDENCE_DESCRIPTION: Record<ConfidenceLevel, string> = {
  High: "Year and details are well-sourced.",
  Medium: "Year and details are reasonable estimates.",
  Low: "Key facts are uncertain or flagged for review.",
};
