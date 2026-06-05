import type { ParcelProperties, PermitStabilityType } from "./parcelTypes";

export type HomeSignalTone = "heritage" | "activity" | "market" | "watch" | "scale" | "value" | "location";

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
  const teardownCount = properties.nearby_teardown_count ?? properties.recent_teardown_count ?? 0;
  const landSqft = properties.land_sqft ?? 0;
  const buildingSqft = properties.building_sqft ?? 0;
  const assessmentChange = properties.assessed_value_change_pct;
  const latestAssessedTotal = properties.latest_assessed_total;
  const appealCount = properties.appeal_count ?? 0;
  const totalAssessmentReduction = properties.total_assessment_reduction ?? 0;
  const nearestParkDist = properties.nearest_park_dist_ft;
  const nearestMetraDist = properties.nearest_metra_stop_dist_ft;
  const nearestRoadDist = properties.nearest_major_road_dist_ft;
  const foreclosureRate = properties.foreclosure_per_1000_half_mile_5yr ?? 0;

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

  if (isTeardownPressure(properties.permit_stability_type) || teardownCount > 0) {
    signals.push({
      id: "teardown-watch",
      label: "Teardown watch",
      detail: teardownCount > 0 ? `${teardownCount} nearby teardown-like events.` : "Permit pattern suggests teardown pressure.",
      tone: "watch",
      score: 88
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

  if (typeof nearestParkDist === "number" && nearestParkDist <= 660) {
    signals.push({
      id: "park-close",
      label: "Park close",
      detail: `${properties.nearest_park_name || "Nearest park"} is ${formatDistance(nearestParkDist)} away.`,
      tone: "location",
      score: 74
    });
  }

  if (typeof nearestMetraDist === "number" && nearestMetraDist <= 2640) {
    signals.push({
      id: "metra-nearby",
      label: "Metra nearby",
      detail: `${properties.nearest_metra_stop_name || "Nearest stop"} is ${formatDistance(nearestMetraDist)} away.`,
      tone: "location",
      score: 70
    });
  }

  if (typeof nearestRoadDist === "number" && nearestRoadDist <= 250) {
    signals.push({
      id: "road-edge",
      label: "Road edge",
      detail: `${properties.nearest_major_road_name || "Major road"} is ${formatDistance(nearestRoadDist)} away.`,
      tone: "location",
      score: 60
    });
  }

  if (foreclosureRate >= 7.5) {
    signals.push({
      id: "foreclosure-pressure",
      label: "Nearby distress",
      detail: `${foreclosureRate.toFixed(1)} foreclosures per 1,000 PINs nearby.`,
      tone: "watch",
      score: 69
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

function isTeardownPressure(value: PermitStabilityType | null | undefined): boolean {
  return value === "teardown_pressure";
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

function formatDistance(value: number): string {
  if (value >= 5280) return `${(value / 5280).toFixed(1)} mi`;
  return `${Math.round(value).toLocaleString()} ft`;
}
