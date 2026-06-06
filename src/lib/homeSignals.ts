import type { ParcelProperties } from "./parcelTypes";

export type HomeSignalTone = "heritage" | "activity" | "market" | "watch" | "scale" | "value";

export type HomeSignal = {
  id: string;
  label: string;
  detail: string;
  tone: HomeSignalTone;
  score: number;
};

const currentYear = 2026;

export function buildHomeSignals(properties: ParcelProperties): HomeSignal[] {
  const signals: HomeSignal[] = [];
  const age = typeof properties.year_built === "number" ? currentYear - properties.year_built : null;
  const saleCount = properties.sale_count ?? 0;
  const permitCount = properties.permit_count ?? 0;
  const recentPermitCount = properties.recent_permit_count ?? 0;
  const landSqft = properties.land_sqft ?? 0;
  const buildingSqft = properties.building_sqft ?? 0;
  const assessmentChange = properties.assessed_value_change_pct;
  const latestAssessedTotal = properties.latest_assessed_total;
  const appealCount = properties.appeal_count ?? 0;
  const totalAssessmentReduction = properties.total_assessment_reduction ?? 0;
  const hargisCount = properties.hargis_record_count ?? 0;

  if (hargisCount > 0) {
    signals.push({
      id: "historic-survey-match",
      label: "Historic survey match",
      detail: hargisSignalDetail(properties),
      tone: "heritage",
      score: 98
    });
  }

  if (age !== null && age >= 100) {
    signals.push({
      id: "century-home",
      label: "Century home",
      detail: `Built about ${age} years ago.`,
      tone: "heritage",
      score: 95
    });
  } else if (age !== null && age >= 75) {
    signals.push({
      id: "older-fabric",
      label: "Older fabric",
      detail: `Built about ${age} years ago.`,
      tone: "heritage",
      score: 70
    });
  }

  if (saleCount >= 7) {
    signals.push({
      id: "frequent-seller",
      label: "Frequent seller",
      detail: `${saleCount} market sales since 1999.`,
      tone: "market",
      score: 90
    });
  } else if (saleCount === 0 && age !== null && age >= 50) {
    signals.push({
      id: "held-close",
      label: "Held close",
      detail: "No market sale found since 1999.",
      tone: "market",
      score: 58
    });
  }

  if (recentPermitCount >= 2 || permitCount >= 8) {
    signals.push({
      id: "permit-active",
      label: "Permit active",
      detail: `${permitCount} permit records in the timeline.`,
      tone: "activity",
      score: 84
    });
  }

  if (age !== null && age >= 75 && permitCount <= 1 && saleCount <= 2) {
    signals.push({
      id: "quiet-survivor",
      label: "Quiet survivor",
      detail: "Older home with limited sale and permit activity.",
      tone: "heritage",
      score: 82
    });
  }

  if (landSqft >= 10000) {
    signals.push({
      id: "large-lot",
      label: "Big lot",
      detail: `${Math.round(landSqft).toLocaleString()} sq ft of land.`,
      tone: "scale",
      score: 72
    });
  }

  if (typeof assessmentChange === "number" && assessmentChange >= 200) {
    signals.push({
      id: "assessment-climb",
      label: "Assessment climb",
      detail: `Assessed value up ${formatPercent(assessmentChange)} across the record.`,
      tone: "value",
      score: 86
    });
  } else if (typeof latestAssessedTotal === "number" && latestAssessedTotal >= 120000) {
    signals.push({
      id: "high-assessment",
      label: "High assessment",
      detail: `${formatCurrency(latestAssessedTotal)} latest assessed value.`,
      tone: "value",
      score: 62
    });
  }

  if (appealCount >= 4) {
    signals.push({
      id: "appeal-history",
      label: "Appeal history",
      detail: `${appealCount} assessment appeals in the record.`,
      tone: "value",
      score: 76
    });
  } else if (totalAssessmentReduction >= 10000) {
    signals.push({
      id: "appeal-reduction",
      label: "Appeal reduction",
      detail: `${formatCurrency(totalAssessmentReduction)} in recorded assessment reductions.`,
      tone: "value",
      score: 66
    });
  }

  if (buildingSqft >= 3500) {
    signals.push({
      id: "large-home",
      label: "Large home",
      detail: `${Math.round(buildingSqft).toLocaleString()} building sq ft.`,
      tone: "scale",
      score: 68
    });
  }

  return signals.sort((left, right) => right.score - left.score).slice(0, 5);
}

function formatPercent(value: number): string {
  return `${Math.round(value).toLocaleString()}%`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function hargisSignalDetail(properties: ParcelProperties): string {
  const style = properties.hargis_arch_class;
  const architect = properties.hargis_architect;
  if (style && architect) return `${style}; architect ${architect}.`;
  if (style) return `${style} in the Illinois historic survey.`;
  if (architect) return `Architect ${architect} appears in the survey record.`;
  return "Found in the Illinois historic architecture survey.";
}
